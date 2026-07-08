import { createAuth } from "@rallycaststv/auth";
import {
  renderResetPasswordEmail,
  renderWelcomeEmail,
} from "@rallycaststv/email";
import { sentry } from "@sentry/hono/cloudflare";
import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { timing } from "hono/timing";
import { Resend } from "resend";
import * as HttpStatusCodes from "stoker/http-status-codes";
import notFound from "stoker/middlewares/not-found";
import onError from "stoker/middlewares/on-error";

import type { AppEnv } from "./lib/types";
import { castersRouter } from "./routes/casters";
import { castingJobsRouter } from "./routes/casting-jobs";
import { challengesRouter } from "./routes/challenges";
import { emailsRouter } from "./routes/emails";
import { eventsRouter } from "./routes/events";
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
    enableLogs: true,
    tracesSampleRate: 1,
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

app.use(requestId());
app.use(timing());
app.use(logger());
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

const FROM_EMAIL = "RallyCasts <dinks@rallycasts.com>";

const routes = app
  .get("/", (c) =>
    c.json({ service: "rallycaststv-api", status: "ok" }, HttpStatusCodes.OK)
  )
  .get("/health", (c) => c.json({ status: "ok" }, HttpStatusCodes.OK))
  .on(["POST", "GET"], "/api/auth/*", (c) => {
    const resend = getEmailSender(c);

    const auth = createAuth(c.env.DB, {
      sendResetPassword: resend
        ? async ({ user, url }) => {
            const html = await renderResetPasswordEmail({
              resetUrl: url,
              username: user.name,
            });
            const text = `Hi ${user.name},\n\nWe received a request to reset your RallyCasts password. Visit this link to reset it:\n\n${url}\n\nThis link expires in 1 hour.\n\nIf you did not request this, you can safely ignore this email.`;

            const { error } = await resend.emails.send({
              from: FROM_EMAIL,
              html,
              subject: "Reset your RallyCasts password",
              text,
              to: user.email,
            });

            if (error) {
              console.error("Failed to send reset password email:", error);
              throw new Error(error.message);
            }
          }
        : undefined,
      sendVerificationEmail: resend
        ? async ({ user, url }) => {
            const html = await renderWelcomeEmail({
              username: user.name,
              verificationUrl: url,
            });
            const text = `Welcome to RallyCasts, ${user.name}!\n\nPlease verify your email address by visiting:\n\n${url}\n\nIf you did not create an account, you can safely ignore this email.`;

            const { error } = await resend.emails.send({
              from: FROM_EMAIL,
              html,
              subject: "Verify your RallyCasts email",
              text,
              to: user.email,
            });

            if (error) {
              console.error("Failed to send verification email:", error);
              throw new Error(error.message);
            }
          }
        : undefined,
    });

    return auth.handler(c.req.raw);
  })
  .route("/api/casters", castersRouter)
  .route("/api/casting-jobs", castingJobsRouter)
  .route("/api/challenges", challengesRouter)
  .route("/api/videos", videosRouter)
  .route("/api/events", eventsRouter)
  .route("/api/profile", profileRouter)
  .route("/api/players", playersRouter)
  .route("/api/venues", venuesRouter)
  .route("/api/venues", venueAnalyticsRouter)
  .route("/api/places", placesRouter)
  .route("/api/social", socialRouter)
  .route("/api/search", searchRouter)
  .route("/api/trending", trendingRouter)
  .route("/api/stripe", stripeRouter)
  .route("/api/mux", muxRouter)
  .route("/api/organizations", organizationsRouter)
  .route("/api/upload", uploadRouter)
  .route("/api/emails", emailsRouter)
  .route("/webhooks", webhooksRouter);

routes.notFound(notFound);
routes.onError(onError);

export type AppType = typeof routes;

export default routes;
