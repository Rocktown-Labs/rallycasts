import { createAuth } from "@rallycaststv/auth";
import { createMiddleware } from "hono/factory";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppEnv } from "../lib/types";

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  // An invalid or revoked agent key makes getSession throw rather than
  // return null; that is still just "unauthenticated."
  let authSession: Awaited<
    ReturnType<ReturnType<typeof createAuth>["api"]["getSession"]>
  > = null;
  try {
    authSession = await createAuth(c.env.DB).api.getSession({
      headers: c.req.raw.headers,
    });
  } catch {
    authSession = null;
  }

  if (!authSession) {
    return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
  }

  c.set("authSession", authSession);
  await next();
});

export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  try {
    const authSession = await createAuth(c.env.DB).api.getSession({
      headers: c.req.raw.headers,
    });
    if (authSession) {
      c.set("authSession", authSession);
    }
  } catch {
    // Optional auth silently continues if unauthenticated
  }
  await next();
});
