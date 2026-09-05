import { createAuth } from "@rallycaststv/auth";
import {
  renderResetPasswordEmail,
  renderWelcomeEmail,
} from "@rallycaststv/email/render";
import { sentry } from "@sentry/hono/cloudflare";
import { Hono } from "hono";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";
import { Resend } from "resend";
import * as HttpStatusCodes from "stoker/http-status-codes";
import notFound from "stoker/middlewares/not-found";

import { EMAIL_FROM } from "./lib/email";
import type { AppEnv } from "./lib/types";
import { protectMutations, protectWebSocket } from "./middleware/security";
import { adminRouter } from "./routes/admin";
import { castersRouter } from "./routes/casters";
import { castingJobsRouter } from "./routes/casting-jobs";
import { challengesRouter } from "./routes/challenges";
import { e2eRouter } from "./routes/e2e";
import { emailsRouter } from "./routes/emails";
import { eventsRouter } from "./routes/events";
import { feedRouter } from "./routes/feed";
import { muxRouter } from "./routes/mux";
import { organizationsRouter } from "./routes/organizations";
import { placesRouter } from "./routes/places";
import { playersRouter } from "./routes/players";
import { profileRouter } from "./routes/profile";
import { searchRouter } from "./routes/search";
import { socialRouter } from "./routes/social";
import { stripeRouter } from "./routes/stripe";
import { trendingRouter } from "./routes/trending";
import { uploadRouter } from "./routes/upload";
import { venueAnalyticsRouter } from "./routes/venue-analytics";
import { venuesRouter } from "./routes/venues";
import { videosRouter } from "./routes/videos";
import { webhooksRouter } from "./routes/webhooks";

const app = new Hono<AppEnv>();

// Initialize Sentry middleware as early as possible
app.use(
  sentry(app, (env) => ({
    dsn: env.SENTRY_DSN,
    enableLogs: Boolean(env.SENTRY_DSN),
    tracesSampleRate: 0.1,
  }))
);

const localDevOrigins = new Set([
  "http://localhost:3001",
  "http://127.0.0.1:3001",
]);

const isAllowedOrigin = (
  requestOrigin: string | undefined,
  configuredOrigin: string | undefined
) => {
  if (!requestOrigin) {
    return "";
  }

  const allowedOrigins = new Set(
    (configuredOrigin ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

  for (const localOrigin of localDevOrigins) {
    allowedOrigins.add(localOrigin);
  }

  return allowedOrigins.has(requestOrigin) ? requestOrigin : "";
};

export { VenuePresence } from "./durable-objects/venue-presence";
export { EventCoordinator } from "./durable-objects/event-coordinator";
export { ChatRoom } from "./durable-objects/chat-room";
export { UserNotifications } from "./durable-objects/user-notifications";

app.use(requestId());
app.use(timing());
app.use(logger());
app.use("/*", secureHeaders());
app.use("/api/v1/*", bodyLimit({ maxSize: 6 * 1024 * 1024 }));
app.use("/webhooks/*", bodyLimit({ maxSize: 1 * 1024 * 1024 }));
app.use("/api/auth/*", protectMutations);
app.use("/api/v1/*", protectMutations);
app.use("/api/v1/*", protectWebSocket);
app.use("/api/v1/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});
app.use("/health", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});
app.use("/*", (c, next) => {
  const corsMiddleware = cors({
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    origin: (origin) => isAllowedOrigin(origin, c.env.CORS_ORIGIN),
  });

  return corsMiddleware(c, next);
});

const getEmailSender = (c: Context<AppEnv>) => {
  const apiKey = c.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
};

const routes = app
  .get("/", (c) =>
    c.json({ service: "rallycaststv-api", status: "ok" }, HttpStatusCodes.OK)
  )
  .get("/health", async (c) => {
    try {
      await c.env.DB.prepare("select 1 as ok").first();
      return c.json({ status: "ok" }, HttpStatusCodes.OK);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "health_check_failed",
          message: error instanceof Error ? error.message : "unknown error",
        })
      );
      return c.json(
        { status: "unavailable" },
        HttpStatusCodes.SERVICE_UNAVAILABLE
      );
    }
  })
  .on(["POST", "GET"], "/api/auth/*", (c) => {
    const resend = getEmailSender(c);
    const isLocalAuth =
      c.env.BETTER_AUTH_URL.includes("localhost") ||
      c.env.BETTER_AUTH_URL.includes("127.0.0.1");

    const auth = createAuth(c.env.DB, {
      sendResetPassword: async ({ user, url }) => {
        if (!resend) {
          if (isLocalAuth) {
            return;
          }
          throw new Error("Email service is not configured");
        }
        const html = await renderResetPasswordEmail({
          resetUrl: url,
          username: user.name,
        });
        const text = `Hi ${user.name},\n\nWe received a request to reset your RallyCasts password. Visit this link to reset it:\n\n${url}\n\nThis link expires in 1 hour.\n\nIf you did not request this, you can safely ignore this email.`;

        const { error } = await resend.emails.send(
          {
            from: EMAIL_FROM,
            html,
            subject: "Reset your RallyCasts password",
            text,
            to: user.email,
          },
          { idempotencyKey: `password-reset/${user.id}/${url}` }
        );

        if (error) {
          console.error(
            JSON.stringify({
              event: "reset_email_failed",
              message: error.message,
            })
          );
          throw new Error("Password reset email could not be sent");
        }
      },
      sendVerificationEmail: async ({ user, url }) => {
        if (!resend) {
          if (isLocalAuth) {
            return;
          }
          throw new Error("Email service is not configured");
        }
        const html = await renderWelcomeEmail({
          username: user.name,
          verificationUrl: url,
        });
        const text = `Welcome to RallyCasts, ${user.name}!\n\nPlease verify your email address by visiting:\n\n${url}\n\nIf you did not create an account, you can safely ignore this email.`;

        const { error } = await resend.emails.send(
          {
            from: EMAIL_FROM,
            html,
            subject: "Verify your RallyCasts email",
            text,
            to: user.email,
          },
          { idempotencyKey: `email-verification/${user.id}/${url}` }
        );

        if (error) {
          console.error(
            JSON.stringify({
              event: "verification_email_failed",
              message: error.message,
            })
          );
          throw new Error("Verification email could not be sent");
        }
      },
    });

    return auth.handler(c.req.raw);
  })
  .route("/api/v1/casters", castersRouter)
  .route("/api/v1/casting-jobs", castingJobsRouter)
  .route("/api/v1/challenges", challengesRouter)
  .route("/api/v1/videos", videosRouter)
  .route("/api/v1/events", eventsRouter)
  .route("/api/v1/feed", feedRouter)
  .route("/api/v1/profile", profileRouter)
  .route("/api/v1/players", playersRouter)
  .route("/api/v1/venues", venuesRouter)
  .route("/api/v1/venues", venueAnalyticsRouter)
  .route("/api/v1/places", placesRouter)
  .route("/api/v1/social", socialRouter)
  .route("/api/v1/search", searchRouter)
  .route("/api/v1/trending", trendingRouter)
  .route("/api/v1/stripe", stripeRouter)
  .route("/api/v1/mux", muxRouter)
  .route("/api/v1/organizations", organizationsRouter)
  .route("/api/v1/upload", uploadRouter)
  .route("/api/v1/emails", emailsRouter)
  .route("/api/v1/admin", adminRouter)
  .route("/api/v1/internal/e2e", e2eRouter)
  .route("/webhooks", webhooksRouter);

routes.notFound(notFound);
// oxlint-disable-next-line promise/prefer-await-to-callbacks
routes.onError((error, c) => {
  console.error(
    JSON.stringify({
      event: "unhandled_request_error",
      message: error instanceof Error ? error.message : "unknown error",
      path: c.req.path,
    })
  );
  return c.json(
    { message: "Internal Server Error" },
    HttpStatusCodes.INTERNAL_SERVER_ERROR
  );
});

export type AppType = typeof routes;

export default routes;
