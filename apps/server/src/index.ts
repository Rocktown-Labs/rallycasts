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
import { rateLimit } from "./middleware/rate-limit";
import { protectMutations, protectWebSocket } from "./middleware/security";
import { adminRouter } from "./routes/admin";
import { adsRouter } from "./routes/ads";
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
// Baseline per-client throttle for the whole API; expensive anonymous
// endpoints and auth get the strict limiter.
app.use("/api/auth/*", rateLimit("RATE_LIMITER_STRICT", "auth"));
app.use("/api/v1/search", rateLimit("RATE_LIMITER_STRICT", "search"));
app.use("/api/v1/places/*", rateLimit("RATE_LIMITER_STRICT", "places"));
app.use("/api/v1/trending", rateLimit("RATE_LIMITER_STRICT", "trending"));
app.use(
  "/api/v1/profile/check-username",
  rateLimit("RATE_LIMITER_STRICT", "check-username")
);
app.use("/api/v1/*", rateLimit("RATE_LIMITER", "api"));
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

const getWebOrigin = (c: Context<AppEnv>) => {
  if (c.env.CORS_ORIGIN) {
    const origins = c.env.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    const prodOrigin = origins.find(
      (origin) => !origin.includes("localhost") && !origin.includes("127.0.0.1")
    );
    if (prodOrigin) {
      return prodOrigin;
    }
    if (origins[0]) {
      return origins[0];
    }
  }
  if (
    c.env.BETTER_AUTH_URL.includes("localhost") ||
    c.env.BETTER_AUTH_URL.includes("127.0.0.1")
  ) {
    return "http://localhost:3000";
  }
  return "https://rallycasts.com";
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
  .get("/api/auth/error", (c) => {
    const error = c.req.query("error") || "unknown_error";
    const errorDescription = c.req.query("error_description");
    const acceptHeader = c.req.header("accept") || "";

    if (
      acceptHeader.includes("text/html") ||
      !acceptHeader.includes("application/json")
    ) {
      const webOrigin = getWebOrigin(c);
      const redirectUrl = new URL("/error", webOrigin);
      redirectUrl.searchParams.set("error", error);
      if (errorDescription) {
        redirectUrl.searchParams.set("error_description", errorDescription);
      }
      return c.redirect(redirectUrl.toString());
    }

    return c.json(
      { error, error_description: errorDescription },
      HttpStatusCodes.BAD_REQUEST
    );
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
        const text = `Hi ${user.name},\n\nGet back in the game: we received a request to reset your RallyCasts password.\n\nChoose a new password here:\n${url}\n\nThis secure link expires in 1 hour. If you did not request this, you can safely ignore this email.`;

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
        const text = `Welcome to the RallyCasts rally, ${user.name}!\n\nVerify your email to join the pickleball community and follow your next match:\n${url}\n\nIf you did not create this account, you can safely ignore this email.`;

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
  .route("/api/v1/hosts", organizationsRouter)
  .route("/api/v1/upload", uploadRouter)
  .route("/api/v1/emails", emailsRouter)
  .route("/api/v1/admin", adminRouter)
  .route("/api/v1/ads", adsRouter)
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
