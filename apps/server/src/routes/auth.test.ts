import { createAuth } from "@rallycaststv/auth";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

describe("Better Auth configuration", () => {
  it("enables account linking with trusted providers", () => {
    const auth = createAuth(env.DB);
    const accountLinking = auth.options.account?.accountLinking;

    expect(accountLinking?.enabled).toBe(true);
    expect(accountLinking?.requireLocalEmailVerified).toBe(true);
    expect(accountLinking?.trustedProviders).toEqual(["google", "github"]);
  });

  it("grants the admin role to allowlisted emails on signup", async () => {
    const email = "platform-admin-allowlist@example.com";
    const response = await app.request(
      "/api/auth/sign-up/email",
      {
        body: JSON.stringify({
          email,
          name: "Platform Admin",
          password: "password-12345678",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      env
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { user: { id: string } };
    const row = await env.DB.prepare("select role from user where id = ?")
      .bind(body.user.id)
      .first<{ role: string | null }>();
    expect(row?.role).toBe("admin");
  });

  it("leaves non-allowlisted signups as regular users", async () => {
    const email = `regular-user-${crypto.randomUUID()}@example.com`;
    const response = await app.request(
      "/api/auth/sign-up/email",
      {
        body: JSON.stringify({
          email,
          name: "Regular User",
          password: "password-12345678",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      {
        ...env,
        ADMIN_EMAILS: `someone-else-${crypto.randomUUID()}@example.com`,
      }
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { user: { id: string } };
    const row = await env.DB.prepare("select role from user where id = ?")
      .bind(body.user.id)
      .first<{ role: string | null }>();
    expect(row?.role).not.toBe("admin");
  });

  it("responds successfully to the Better Auth health endpoint", async () => {
    const response = await app.request("/api/auth/ok", {}, env);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean };
    expect(body).toEqual({ ok: true });
  });

  it("gives verified users a session cookie on sign-in under prod-like auth config", async () => {
    // createAuth reads BETTER_AUTH_URL from the Worker env binding at call
    // time, so reproduce the prod config by mutating the binding itself.
    const previousAuthUrl = env.BETTER_AUTH_URL;
    env.BETTER_AUTH_URL = "https://api.rallycasts.com";

    try {
      const email = `verified-signin-${crypto.randomUUID()}@example.com`;

      // 1. Sign-up under prod config: email verification is required, so
      //    no session may be issued yet (token null, no set-cookie).
      const signUpResponse = await app.request(
        "/api/auth/sign-up/email",
        {
          body: JSON.stringify({
            email,
            name: "Verified Sign In",
            password: "password-12345678",
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
        env
      );

      expect(signUpResponse.status).toBe(200);
      const signUp = (await signUpResponse.json()) as {
        token: string | null;
        user: { id: string };
      };
      expect(signUp.token).toBeNull();
      expect(signUpResponse.headers.get("set-cookie")).toBeNull();

      // 2. Sign-in while unverified must be rejected.
      const unverifiedResponse = await app.request(
        "/api/auth/sign-in/email",
        {
          body: JSON.stringify({ email, password: "password-12345678" }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
        env
      );
      // Better Auth rejects unverified users with FORBIDDEN.
      expect(unverifiedResponse.status).toBe(403);

      // 3. Verify the email directly, then sign in: a session cookie with
      //    the shared domain must be set this time.
      await env.DB.prepare("update user set email_verified = 1 where id = ?")
        .bind(signUp.user.id)
        .run();

      const signInResponse = await app.request(
        "/api/auth/sign-in/email",
        {
          body: JSON.stringify({ email, password: "password-12345678" }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
        env
      );

      expect(signInResponse.status).toBe(200);
      const signIn = (await signInResponse.json()) as {
        token: string | null;
        user: { id: string };
      };
      expect(signIn.token).toBeTruthy();
      const cookie = signInResponse.headers.get("set-cookie") ?? "";
      expect(cookie).toContain("better-auth.session_token");
      expect(cookie).toContain("Domain=.rallycasts.com");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");

      // 4. The session cookie authenticates the session endpoint.
      const sessionResponse = await app.request(
        "/api/auth/get-session",
        { headers: { Cookie: cookie.split(";")[0] } },
        env
      );
      expect(sessionResponse.status).toBe(200);
      const session = (await sessionResponse.json()) as {
        session: { userId: string } | null;
        user: { id: string } | null;
      };
      expect(session.user?.id).toBe(signUp.user.id);
    } finally {
      env.BETTER_AUTH_URL = previousAuthUrl;
    }
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

  it("authenticates agent API keys across the API", async () => {
    const signUp = await app.request(
      "/api/auth/sign-up/email",
      {
        body: JSON.stringify({
          email: `agent${crypto.randomUUID().slice(0, 8)}@example.com`,
          name: "Agent Owner",
          password: "password-12345678",
          username: `agent${crypto.randomUUID().slice(0, 8)}`,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      env
    );
    const body = (await signUp.json()) as {
      user: { email: string; id: string } | null;
    };
    expect(body.user?.id).toBeTruthy();

    // Create an agent key server-side on the owner's behalf, the way the
    // settings UI does through the auth endpoints.
    const auth = createAuth(env.DB);
    const key = await auth.api.createApiKey({
      body: { name: "Test agent", userId: body.user?.id ?? "" },
    });
    expect(key.key?.startsWith("rak_")).toBe(true);

    // The key authenticates any session-protected route: x-api-key header.
    const viaHeader = await app.request(
      "/api/v1/casting-jobs",
      { headers: { "x-api-key": key.key ?? "" } },
      env
    );
    expect(viaHeader.status).toBe(200);

    // And the Authorization Bearer form agents prefer.
    const viaBearer = await app.request(
      "/api/v1/casting-jobs",
      { headers: { Authorization: `Bearer ${key.key}` } },
      env
    );
    expect(viaBearer.status).toBe(200);

    // Revoked keys stop working. Deletion happens through the owner's
    // session, the same path the settings UI uses.
    const signInResponse = await app.request(
      "/api/auth/sign-in/email",
      {
        body: JSON.stringify({
          email: body.user?.email ?? "",
          password: "password-12345678",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      env
    );
    expect(signInResponse.status).toBe(200);
    const cookie = signInResponse.headers.get("set-cookie") ?? "";
    await auth.api.deleteApiKey({
      body: { keyId: key.id },
      headers: { cookie },
    });
    const revoked = await app.request(
      "/api/v1/casting-jobs",
      { headers: { "x-api-key": key.key ?? "" } },
      env
    );
    expect(revoked.status).toBe(401);
  });
});
