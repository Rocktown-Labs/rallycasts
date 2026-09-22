import { createMiddleware } from "hono/factory";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppEnv } from "../lib/types";

type RateLimitBindingName = "RATE_LIMITER" | "RATE_LIMITER_STRICT";

const clientKey = (c: {
  req: { header: (name: string) => string | undefined };
}) =>
  c.req.header("CF-Connecting-IP") ??
  c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
  "anonymous";

/**
 * Per-client fixed-window rate limiting backed by the Cloudflare Workers
 * rate limiting binding. Fails open when the binding is absent (local dev,
 * tests) so environments without it keep working.
 */
export const rateLimit = (binding: RateLimitBindingName, keyPrefix: string) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const limiter = c.env[binding];
    if (!limiter) {
      await next();
      return;
    }

    const { success } = await limiter.limit({
      key: `${keyPrefix}:${clientKey(c)}`,
    });
    if (!success) {
      c.header("Retry-After", "60");
      return c.json(
        { message: "Too many requests" },
        HttpStatusCodes.TOO_MANY_REQUESTS
      );
    }

    await next();
  });
