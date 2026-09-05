import { createAuth } from "@rallycaststv/auth";
import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  casterProfile,
  castingJob,
  conversation,
  conversationParticipant,
  event,
  post,
  userProfile,
  video,
} from "@rallycaststv/db/schema/domain";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import type { AppEnv } from "../lib/types";

const seedSchema = z.object({
  email: z.email(),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128),
  peerEmail: z.email().optional(),
  peerName: z.string().trim().min(1).max(120).optional(),
});

const encoder = new TextEncoder();

const secureTokenMatches = async (provided: string, expected: string) => {
  const [providedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const providedBytes = new Uint8Array(providedDigest);
  const expectedBytes = new Uint8Array(expectedDigest);
  if (providedBytes.length !== expectedBytes.length) {
    return false;
  }
  let matches = true;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    if (providedBytes[index] !== expectedBytes[index]) {
      matches = false;
    }
  }
  return matches;
};

const ensureUser = async (
  db: ReturnType<typeof createDb>,
  database: D1Database,
  input: { email: string; name: string; password: string }
) => {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1);
  if (existing) {
    await db
      .update(user)
      .set({ emailVerified: true, name: input.name, updatedAt: new Date() })
      .where(eq(user.id, existing.id));
    return existing.id;
  }

  const auth = createAuth(database, {
    sendVerificationEmail: () => Promise.resolve(),
  });
  const result = await auth.api.signUpEmail({ body: input });
  const userId = result.user.id;
  await db
    .update(user)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(user.id, userId));
  return userId;
};

export const e2eRouter = new Hono<AppEnv>().post("/seed", async (c) => {
  const expectedToken = c.env.E2E_SEED_TOKEN;
  const providedToken = c.req.header("x-rallycasts-e2e-token");
  if (
    !expectedToken ||
    !providedToken ||
    !(await secureTokenMatches(providedToken, expectedToken))
  ) {
    return c.json({ message: "Not found" }, HttpStatusCodes.NOT_FOUND);
  }

  const parsed = seedSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(
      { message: "Invalid E2E seed payload" },
      HttpStatusCodes.BAD_REQUEST
    );
  }

  const db = createDb(c.env.DB);
  const { email, name, password, peerEmail, peerName } = parsed.data;
  const ownerUserId = await ensureUser(db, c.env.DB, { email, name, password });
  const peerUserId = peerEmail
    ? await ensureUser(db, c.env.DB, {
        email: peerEmail,
        name: peerName ?? "E2E Rally Friend",
        password,
      })
    : null;

  await db
    .insert(userProfile)
    .values({
      isCaster: true,
      isOrganizer: true,
      onboardingStatus: "complete",
      platformRole: "user",
      userId: ownerUserId,
    })
    .onConflictDoUpdate({
      set: {
        isCaster: true,
        isOrganizer: true,
        onboardingStatus: "complete",
        updatedAt: new Date(),
      },
      target: userProfile.userId,
    });

  const postId = `e2e-post-${ownerUserId}`;
  await db
    .insert(post)
    .values({
      content: "E2E RallyCasts post",
      id: postId,
      userId: ownerUserId,
    })
    .onConflictDoNothing();

  const eventId = `e2e-event-${ownerUserId}`;
  await db
    .insert(event)
    .values({
      description: "A seeded event for staging browser coverage.",
      endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      entryFeeCents: 1500,
      eventType: "tournament",
      id: eventId,
      name: "E2E RallyCasts Open",
      organizerUserId: ownerUserId,
      registrationDeadline: new Date(Date.now() + 60 * 60 * 1000),
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "published",
    })
    .onConflictDoNothing();

  if (peerUserId) {
    await db
      .insert(casterProfile)
      .values({
        displayName: peerName ?? "E2E Rally Friend",
        status: "active",
        userId: peerUserId,
      })
      .onConflictDoNothing();
  }

  const castingJobId = `e2e-casting-${ownerUserId}`;
  await db
    .insert(castingJob)
    .values({
      casterUserId: peerUserId,
      endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      id: castingJobId,
      notes: "E2E casting request",
      priceCents: 2500,
      requestedHours: 2,
      requesterUserId: ownerUserId,
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "requested",
    })
    .onConflictDoNothing();

  const conversationId = `e2e-conversation-${ownerUserId}`;
  if (peerUserId) {
    await db
      .insert(conversation)
      .values({ id: conversationId, type: "direct" })
      .onConflictDoNothing();
    await db
      .insert(conversationParticipant)
      .values([
        { conversationId, userId: ownerUserId },
        { conversationId, userId: peerUserId },
      ])
      .onConflictDoNothing();
  }

  const privateVideoId = `e2e-private-video-${ownerUserId}`;
  await db
    .insert(video)
    .values({
      description: "Seeded private video for signed playback checks.",
      durationSeconds: 10,
      id: privateVideoId,
      mediaType: "video",
      muxAssetId: `e2e-private-asset-${ownerUserId}`,
      muxPlaybackId: `e2e-private-playback-${ownerUserId}`,
      muxPlaybackPolicy: "signed",
      muxStatus: "ready",
      ownerUserId,
      publishedAt: new Date(),
      status: "ready",
      title: "E2E Private Rally",
      visibility: "private",
    })
    .onConflictDoNothing();

  const clipVideoId = `e2e-clip-video-${ownerUserId}`;
  await db
    .insert(video)
    .values({
      description: "Seeded clip for signed playback checks.",
      durationSeconds: 5,
      id: clipVideoId,
      mediaType: "short",
      muxAssetId: `e2e-clip-asset-${ownerUserId}`,
      muxPlaybackId: `e2e-clip-playback-${ownerUserId}`,
      muxPlaybackPolicy: "signed",
      muxStatus: "ready",
      ownerUserId,
      publishedAt: new Date(),
      status: "ready",
      title: "E2E Rally Clip",
      visibility: "private",
    })
    .onConflictDoNothing();

  return c.json(
    {
      castingJobId,
      clipVideoId,
      conversationId: peerUserId ? conversationId : null,
      eventId,
      ownerUserId,
      postId,
      privateVideoId,
    },
    HttpStatusCodes.OK
  );
});

export default e2eRouter;
