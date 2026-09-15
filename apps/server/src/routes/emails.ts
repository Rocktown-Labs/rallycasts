import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import {
  renderResetPasswordEmail,
  renderWelcomeEmail,
} from "@rallycaststv/email/render";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { Resend } from "resend";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { isPlatformAdminUser } from "../lib/admin";
import { EMAIL_FROM } from "../lib/email";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const sendEmailSchema = z.object({
  props: z
    .object({
      resetUrl: z.url().optional(),
      username: z.string().trim().min(1).max(100).optional(),
      verificationUrl: z.url().optional(),
    })
    .optional(),
  subject: z.string().trim().min(1).max(200),
  template: z.enum(["welcome", "reset-password"]),
  to: z.union([z.email(), z.array(z.email()).min(1).max(10)]),
});

const requireEmailAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const db = createDb(c.env.DB);
  const { user: authUser } = c.var.authSession;
  if (
    !authUser.emailVerified ||
    !(await isPlatformAdminUser(db, authUser.id))
  ) {
    return c.json({ error: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
  }

  await next();
});

export const emailsRouter = new Hono<AppEnv>()
  .use(requireAuth, requireEmailAdmin)
  .post("/send", zValidator("json", sendEmailSchema), async (c) => {
    const { to, subject, template, props } = c.req.valid("json");
    const apiKey = c.env.RESEND_API_KEY;
    if (!apiKey) {
      return c.json(
        { error: "Email service unavailable" },
        HttpStatusCodes.SERVICE_UNAVAILABLE
      );
    }

    const username = props?.username ?? "Player";
    const html =
      template === "welcome"
        ? await renderWelcomeEmail({
            username,
            verificationUrl: props?.verificationUrl,
          })
        : await renderResetPasswordEmail({
            resetUrl: props?.resetUrl ?? "",
            username,
          });
    const text =
      template === "welcome"
        ? `Welcome to the RallyCasts rally, ${username}! Your next pickleball match starts here.`
        : `Hi ${username}, get back in the game: we received a request to reset your RallyCasts password.`;
    const recipients = Array.isArray(to) ? to : [to];
    const idempotencyKey =
      c.req.header("Idempotency-Key") ??
      `admin-email/${template}/${recipients.join(",")}/${subject}`;
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(
      {
        from: EMAIL_FROM,
        html,
        subject,
        text,
        to: recipients,
      },
      { idempotencyKey }
    );

    if (error) {
      console.error(
        JSON.stringify({
          event: "email_send_failed",
          message: error.message,
        })
      );
      return c.json(
        { error: "Email could not be sent" },
        HttpStatusCodes.BAD_GATEWAY
      );
    }

    return c.json({ id: data?.id, success: true }, HttpStatusCodes.OK);
  });
