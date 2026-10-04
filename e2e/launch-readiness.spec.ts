import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

interface StagingFixtures {
  castingJobId: string;
  clipVideoId: string;
  conversationId: string | null;
  eventId: string;
  ownerUserId: string;
  postId: string;
  privateVideoId: string;
}

interface ApiResult {
  body: unknown;
  status: number;
}

const apiURL = () => {
  const value = process.env.E2E_API_URL;
  if (!value) {
    throw new Error("Missing required E2E_API_URL");
  }
  return value;
};

const readFixtures = async (): Promise<StagingFixtures> => {
  const fixturePath =
    process.env.E2E_FIXTURES_PATH ?? ".e2e/staging-fixtures.json";
  return JSON.parse(await readFile(fixturePath, "utf-8")) as StagingFixtures;
};

const login = async (page: Page) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!(email && password)) {
    throw new Error("E2E_EMAIL and E2E_PASSWORD are required");
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/u(?:\/|$)/u);
};

const apiRequest = (
  page: Page,
  path: string,
  init?: RequestInit
): Promise<ApiResult> =>
  page.evaluate(
    async ({ apiBaseURL, requestInit, requestPath }) => {
      const response = await fetch(`${apiBaseURL}${requestPath}`, {
        ...requestInit,
        credentials: "include",
      });
      const body = await response.json().catch(() => null);
      return { body, status: response.status };
    },
    {
      apiBaseURL: apiURL(),
      requestInit: init,
      requestPath: path,
    }
  );

const getPlaybackURL = (body: unknown) => {
  if (
    !body ||
    typeof body !== "object" ||
    !("playbackUrl" in body) ||
    typeof body.playbackUrl !== "string"
  ) {
    throw new Error("Playback response did not include a playback URL");
  }
  return new URL(body.playbackUrl);
};

test("serves public launch routes in a real browser", async ({ page }) => {
  for (const path of [
    "/",
    "/trending",
    "/events",
    "/players",
    "/casters",
    "/shop",
  ]) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- sequential test steps by design
    const response = await page.goto(path);
    expect(response?.ok(), `${path} did not return a successful response`).toBe(
      true
    );
    // oxlint-disable-next-line eslint/no-await-in-loop -- sequential test steps by design
    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error"
    );
  }
});

test("supports authenticated event and casting flows", async ({ page }) => {
  const fixtures = await readFixtures();
  await login(page);

  await page.goto(`/events/${fixtures.eventId}`);
  await expect(page.locator("body")).toContainText("E2E RallyCasts Open");

  await page.goto("/u/casts/pending");
  await expect(page.locator("body")).toContainText("E2E casting request");
});

test("supports authenticated comments and chat messages", async ({ page }) => {
  const fixtures = await readFixtures();
  await login(page);

  const commentBody = `E2E comment ${Date.now()}`;
  const commentResponse = await apiRequest(
    page,
    `/api/v1/social/posts/${fixtures.postId}/comments`,
    {
      body: JSON.stringify({ content: commentBody }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }
  );
  expect(commentResponse.status).toBe(201);

  const chatBody = `E2E chat ${Date.now()}`;
  if (!fixtures.conversationId) {
    throw new Error("E2E fixtures did not include a conversation");
  }
  const messageResponse = await apiRequest(
    page,
    `/api/v1/social/conversations/${fixtures.conversationId}/messages`,
    {
      body: JSON.stringify({ body: chatBody }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }
  );
  expect(messageResponse.status).toBe(201);

  await page.goto("/u/messages");
  await expect(page.locator("body")).toContainText(chatBody);
});

test("returns signed playback URLs for private videos and clips", async ({
  page,
}) => {
  const fixtures = await readFixtures();
  await login(page);

  for (const videoId of [fixtures.privateVideoId, fixtures.clipVideoId]) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- sequential test steps by design
    const response = await apiRequest(
      page,
      `/api/v1/videos/${videoId}/playback`
    );
    expect(response.status).toBe(200);
    const playbackURL = getPlaybackURL(response.body);
    expect(playbackURL.hostname).toBe("stream.mux.com");
    expect(playbackURL.searchParams.get("token")).toBeTruthy();
    expect(playbackURL.pathname).not.toContain(videoId);
  }
});

if (process.env.E2E_RUN_MUX_UPLOAD === "true") {
  test("creates an authenticated Mux upload draft", async ({ page }) => {
    await login(page);
    await page.goto("/u/studio/upload");
    await page
      .getByLabel("Choose a video file")
      .setInputFiles("e2e/fixtures/test.mp4");
    await page.getByLabel("Working title").fill("E2E Mux upload");
    await page.getByRole("button", { name: "Continue to studio" }).click();
    await page.waitForURL(/\/u\/studio\/videos\//u);
    await expect(page.locator("body")).toContainText("Video details");
  });
}
