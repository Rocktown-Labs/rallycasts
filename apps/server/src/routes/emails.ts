import { zValidator } from "@hono/zod-validator";
import {
  renderResetPasswordEmail,
  renderWelcomeEmail,
} from "@rallycaststv/email";
import { Hono } from "hono";
import { Resend } from "resend";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import type { AppEnv } from "../lib/types";

const sendEmailSchema = z.object({
  html: z.string().optional(),
  props: z.record(z.string(), z.any()).optional(),
  subject: z.string(),
  template: z.enum(["welcome", "reset-password"]).optional(),
  text: z.string().optional(),
  to: z.union([z.string(), z.array(z.string())]),
});

export const emailsRouter = new Hono<AppEnv>().post(
  "/send",
  zValidator("json", sendEmailSchema),
  async (c) => {
    const { to, subject, html, text, template, props } = c.req.valid("json");

    const apiKey = c.env.RESEND_API_KEY;
    if (!apiKey) {
      return c.json(
        { error: "Resend API key is not configured" },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const resend = new Resend(apiKey);
    let finalHtml = html;

    if (template === "welcome") {
      finalHtml = await renderWelcomeEmail({
        username:
          typeof props?.username === "string" ? props.username : "Player",
        verificationUrl:
          typeof props?.verificationUrl === "string"
            ? props.verificationUrl
            : undefined,
      });
    } else if (template === "reset-password") {
      finalHtml = await renderResetPasswordEmail({
        resetUrl: typeof props?.resetUrl === "string" ? props.resetUrl : "",
        username:
          typeof props?.username === "string" ? props.username : "Player",
      });
    }

    if (!finalHtml && !text) {
      return c.json(
        { error: "Must provide either html, text, or a valid template" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const { data, error } = await resend.emails.send({
      from: "RallyCasts <dinks@rallycasts.com>",
      subject,
      to: Array.isArray(to) ? to : [to],
      ...(finalHtml ? { html: finalHtml } : {}),
      ...(text ? { text } : {}),
    } as Parameters<typeof resend.emails.send>[0]);

    if (error) {
      console.error("Failed to send email via API route:", error);
      return c.json({ error: error.message }, HttpStatusCodes.BAD_REQUEST);
    }

    return c.json({ id: data?.id, success: true }, HttpStatusCodes.OK);
  }
);
