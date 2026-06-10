import { devToolsMiddleware } from "@ai-sdk/devtools";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAuth } from "@rallycaststv/auth";
import { streamText, convertToModelMessages, wrapLanguageModel } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { timing } from "hono/timing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import notFound from "stoker/middlewares/not-found";
import onError from "stoker/middlewares/on-error";

import type { AppEnv } from "./lib/types";
import { castersRouter } from "./routes/casters";
import { castingJobsRouter } from "./routes/casting-jobs";
import { eventsRouter } from "./routes/events";
import { muxRouter } from "./routes/mux";
import { placesRouter } from "./routes/places";
import { playersRouter } from "./routes/players";
import { profileRouter } from "./routes/profile";
import { searchRouter } from "./routes/search";
import { stripeRouter } from "./routes/stripe";
import { trendingRouter } from "./routes/trending";
import { uploadRouter } from "./routes/upload";
import { venueAnalyticsRouter } from "./routes/venue-analytics";
import { venuesRouter } from "./routes/venues";
import { videosRouter } from "./routes/videos";
import { webhooksRouter } from "./routes/webhooks";

const app = new Hono<AppEnv>();

app.use(requestId());
app.use(timing());
app.use(logger());
app.use("/*", (c, next) => {
  const corsMiddleware = cors({
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    origin: c.env.CORS_ORIGIN,
  });

  return corsMiddleware(c, next);
});

const routes = app
  .get("/", (c) =>
    c.json({ service: "rallycaststv-api", status: "ok" }, HttpStatusCodes.OK)
  )
  .get("/health", (c) => c.json({ status: "ok" }, HttpStatusCodes.OK))
  .on(["POST", "GET"], "/api/auth/*", (c) =>
    createAuth(c.env.DB).handler(c.req.raw)
  )
  .post("/ai", async (c) => {
    const body = await c.req.json();
    const uiMessages = body.messages || [];
    const google = createGoogleGenerativeAI({
      apiKey: c.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    const model = wrapLanguageModel({
      middleware: devToolsMiddleware(),
      model: google("gemini-2.5-flash"),
    });
    const result = streamText({
      messages: await convertToModelMessages(uiMessages),
      model,
    });

    return result.toUIMessageStreamResponse();
  })
  .route("/api/casters", castersRouter)
  .route("/api/casting-jobs", castingJobsRouter)
  .route("/api/videos", videosRouter)
  .route("/api/events", eventsRouter)
  .route("/api/profile", profileRouter)
  .route("/api/players", playersRouter)
  .route("/api/venues", venuesRouter)
  .route("/api/venues", venueAnalyticsRouter)
  .route("/api/places", placesRouter)
  .route("/api/search", searchRouter)
  .route("/api/trending", trendingRouter)
  .route("/api/stripe", stripeRouter)
  .route("/api/mux", muxRouter)
  .route("/api/upload", uploadRouter)
  .route("/webhooks", webhooksRouter);

routes.notFound(notFound);
routes.onError(onError);

export type AppType = typeof routes;

export default routes;
