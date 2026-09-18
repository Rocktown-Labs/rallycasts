import { createAuth } from "@rallycaststv/auth";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

describe("Better Auth configuration", () => {
  it("enables account linking with trusted providers", () => {
    const auth = createAuth(env.DB);
    const accountLinking = auth.options.account?.accountLinking;

    expect(accountLinking?.enabled).toBe(true);
    expect(accountLinking?.requireLocalEmailVerified).toBe(false);
    expect(accountLinking?.trustedProviders).toEqual(["google", "github"]);
  });

  it("responds successfully to the Better Auth health endpoint", async () => {
    const response = await app.request("/api/auth/ok", {}, env);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean };
    expect(body).toEqual({ ok: true });
  });

  it("redirects browser error requests to the web app error page", async () => {
    const response = await app.request(
      "/api/auth/error?error=account_not_linked&error_description=Account+exists",
      {
        headers: {
          Accept: "text/html,application/xhtml+xml",
        },
      },
      env
    );

    expect(response.status).toBe(302);
    const location = response.headers.get("location");
    expect(location).toContain("/error?error=account_not_linked");
    expect(location).toContain("error_description=Account");
  });

  it("returns JSON error details for non-HTML API requests", async () => {
    const response = await app.request(
      "/api/auth/error?error=account_not_linked",
      {
        headers: {
          Accept: "application/json",
        },
      },
      env
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("account_not_linked");
  });
});
