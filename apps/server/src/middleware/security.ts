import { createMiddleware } from "hono/factory";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { isConfiguredOrigin } from "../lib/admin";
import type { AppEnv } from "../lib/types";

const MUTATING_METHODS = new Set(["DELETE", "PATCH", "POST", "PUT"]);

/**
 * SameSite cookies protect normal browser requests. Origin checks add defense
 * in depth for browsers while still allowing native clients, which do not send
 * Origin or Referer headers.
 */
export const protectMutations = createMiddleware<AppEnv>(async (c, next) => {
  if (!MUTATING_METHODS.has(c.req.method)) {
    await next();
    return;
  }

  if (c.req.header("Sec-Fetch-Site") === "cross-site") {
    return c.json(
      { message: "Cross-site requests are not allowed" },
      HttpStatusCodes.FORBIDDEN
    );
  }

  const origin = c.req.header("Origin");
  if (origin && !isConfiguredOrigin(origin, c.env)) {
    return c.json(
      { message: "Request origin is not allowed" },
      HttpStatusCodes.FORBIDDEN
    );
  }

  const referer = c.req.header("Referer");
  if (!origin && referer) {
    let refererOrigin: string;
    try {
      refererOrigin = new URL(referer).origin;
    } catch {
      return c.json(
        { message: "Request origin is not allowed" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    if (!isConfiguredOrigin(refererOrigin, c.env)) {
      return c.json(
        { message: "Request origin is not allowed" },
        HttpStatusCodes.FORBIDDEN
      );
    }
  }

  await next();
});

export const protectWebSocket = createMiddleware<AppEnv>(async (c, next) => {
  if (c.req.header("Upgrade")?.toLowerCase() !== "websocket") {
    await next();
    return;
  }

  const origin = c.req.header("Origin");
  if (origin && !isConfiguredOrigin(origin, c.env)) {
    return c.json(
      { message: "Request origin is not allowed" },
      HttpStatusCodes.FORBIDDEN
    );
  }

  await next();
});

export const requireVerifiedAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.authSession.user.emailVerified) {
    return c.json(
      { message: "Email verification is required" },
      HttpStatusCodes.FORBIDDEN
    );
  }

  await next();
});
