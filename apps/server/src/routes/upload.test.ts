import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

const signUp = async (name: string) => {
  const username = `${name.toLowerCase().replaceAll(" ", "")}${crypto
    .randomUUID()
    .slice(0, 8)}`;
  const response = await app.request(
    "/api/auth/sign-up/email",
    {
      body: JSON.stringify({
        email: `${username}@example.com`,
        name,
        password: "password-12345678",
        username,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    env
  );
  expect(response.status).toBe(200);
  const cookie = response.headers.get("set-cookie") ?? "";
  const body = (await response.json()) as { user: { id: string } };
  return { cookie, id: body.user.id };
};

const verifiedUser = async (name: string) => {
  const user = await signUp(name);
  await env.DB.prepare("update user set email_verified = 1 where id = ?")
    .bind(user.id)
    .run();
  return user;
};

const postImage = (cookie: string, file: File) =>
  app.request(
    "/api/v1/upload/image",
    {
      body: (() => {
        const body = new FormData();
        body.set("file", file);
        return body;
      })(),
      headers: { Cookie: cookie },
      method: "POST",
    },
    env
  );

const pngFile = (contents: Uint8Array = new Uint8Array([1, 2, 3])) =>
  new File(
    [
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ...contents,
    ],
    "logo.png",
    { type: "image/png" }
  );

describe("image upload API", () => {
  it("rejects unauthenticated uploads", async () => {
    const response = await postImage("", pngFile());
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      message: "Unauthorized",
    });
  });

  it("rejects uploads from accounts without a verified email", async () => {
    const user = await signUp("Unverified Uploader");
    const response = await postImage(user.cookie, pngFile());
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "Email verification is required",
    });
  });

  it("rejects unsupported image types", async () => {
    const user = await verifiedUser("Type Tester");
    const response = await postImage(
      user.cookie,
      new File(["not an image"], "notes.txt", { type: "text/plain" })
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Only AVIF, JPEG, PNG, and WebP images are supported",
    });
  });

  it("rejects images larger than 5MB", async () => {
    const user = await verifiedUser("Size Tester");
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
    oversized.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const response = await postImage(
      user.cookie,
      new File([oversized], "big.png", { type: "image/png" })
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Image must be 5MB or smaller",
    });
  });

  it("rejects images whose contents do not match the declared type", async () => {
    const user = await verifiedUser("Signature Tester");
    const response = await postImage(
      user.cookie,
      new File(["definitely not a png"], "fake.png", { type: "image/png" })
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Image contents do not match the declared type",
    });
  });

  it("stores a valid PNG in R2 and returns its public URL", async () => {
    const user = await verifiedUser("Png Uploader");
    const response = await postImage(user.cookie, pngFile());
    expect(response.status).toBe(200);
    const body = (await response.json()) as { key: string; url: string };
    expect(body.key).toMatch(/^images\/.+\.png$/u);
    expect(body.url).toBe(`https://media.example.com/${body.key}`);

    const stored = await env.MEDIA_BUCKET.get(body.key);
    expect(stored).not.toBeNull();
    expect(await stored.arrayBuffer()).toEqual(
      (await pngFile().arrayBuffer()) as ArrayBuffer
    );
  });

  it("stores a valid JPEG with the jpg extension", async () => {
    const user = await verifiedUser("Jpeg Uploader");
    const file = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])],
      "photo.jpg",
      { type: "image/jpeg" }
    );
    const response = await postImage(user.cookie, file);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { key: string; url: string };
    expect(body.key).toMatch(/^images\/.+\.jpg$/u);
    expect(body.url).toBe(`https://media.example.com/${body.key}`);
  });

  it("stores a valid WebP image", async () => {
    const user = await verifiedUser("Webp Uploader");
    const file = new File(
      [
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]),
      ],
      "banner.webp",
      { type: "image/webp" }
    );
    const response = await postImage(user.cookie, file);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { key: string; url: string };
    expect(body.key).toMatch(/^images\/.+\.webp$/u);
    expect(body.url).toBe(`https://media.example.com/${body.key}`);
  });

  it("stores a valid AVIF image", async () => {
    const user = await verifiedUser("Avif Uploader");
    const file = new File(
      [
        new Uint8Array([
          0, 0, 0, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
        ]),
      ],
      "crest.avif",
      { type: "image/avif" }
    );
    const response = await postImage(user.cookie, file);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { key: string; url: string };
    expect(body.key).toMatch(/^images\/.+\.avif$/u);
    expect(body.url).toBe(`https://media.example.com/${body.key}`);
  });
});
