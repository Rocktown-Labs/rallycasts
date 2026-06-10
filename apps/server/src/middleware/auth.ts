import { createAuth } from "@rallycaststv/auth";
import { createMiddleware } from "hono/factory";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppEnv } from "../lib/types";

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authSession = await createAuth(c.env.DB).api.getSession({
    headers: c.req.raw.headers,
  });

  if (!authSession) {
    return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
  }

  c.set("authSession", authSession);
  await next();
});
