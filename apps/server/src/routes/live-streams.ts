import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  event,
  liveStream,
  organizationMember,
} from "@rallycaststv/db/schema/domain";
import { and, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { createId } from "../lib/ids";
import {
  getLiveStreamWithRelations,
  syncMuxLiveStream,
  toOwnerLiveStream,
  toPublicLiveStream,
} from "../lib/live-streams";
import {
  createMuxLiveStream,
  deleteMuxLiveStream,
  getMuxLiveStream,
  resetMuxLiveStreamKey,
  signalMuxLiveStreamComplete,
} from "../lib/mux-client";
import type { AppEnv } from "../lib/types";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { requireVerifiedAuth } from "../middleware/security";

const createLiveStreamSchema = z.object({
  description: z.string().max(2000).optional(),
  eventId: z.string().min(1).optional(),
  latencyMode: z.enum(["low", "reduced", "standard"]).default("low"),
  title: z.string().min(1).max(160),
  visibility: z.enum(["public", "private"]).default("public"),
});

const updateLiveStreamSchema = createLiveStreamSchema.partial();

const getMuxCredentials = (c: {
  env: AppEnv["Bindings"];
}): { tokenId: string; tokenSecret: string } | null => {
  if (!(c.env.MUX_TOKEN_ID && c.env.MUX_TOKEN_SECRET)) {
    return null;
  }
  return {
    tokenId: c.env.MUX_TOKEN_ID,
    tokenSecret: c.env.MUX_TOKEN_SECRET,
  };
};

const canManageEvent = async (
  db: ReturnType<typeof createDb>,
  eventId: string,
  userId: string
) => {
  const [record] = await db
    .select({
      organizationId: event.organizationId,
      organizerUserId: event.organizerUserId,
    })
    .from(event)
    .where(eq(event.id, eventId))
    .limit(1);

  if (!record) {
    return false;
  }
  if (record.organizerUserId === userId) {
    return true;
  }
  if (!record.organizationId) {
    return false;
  }

  const [membership] = await db
    .select({ organizationId: organizationMember.organizationId })
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.organizationId, record.organizationId),
        eq(organizationMember.userId, userId)
      )
    )
    .limit(1);
  return Boolean(membership);
};

const getOwnedLiveStream = async (
  db: ReturnType<typeof createDb>,
  id: string,
  userId: string
) => {
  const [record] = await db
    .select()
    .from(liveStream)
    .where(and(eq(liveStream.id, id), eq(liveStream.ownerUserId, userId)))
    .limit(1);
  return record;
};

const getListRows = async (
  db: ReturnType<typeof createDb>,
  where: SQL | undefined,
  limit: number
) => {
  const baseQuery = db
    .select({
      eventId: event.id,
      eventName: event.name,
      eventStartsAt: event.startsAt,
      live: liveStream,
      ownerDisplayUsername: user.displayUsername,
      ownerId: user.id,
      ownerImage: user.image,
      ownerName: user.name,
      ownerUsername: user.username,
    })
    .from(liveStream)
    .innerJoin(user, eq(liveStream.ownerUserId, user.id))
    .leftJoin(event, eq(liveStream.eventId, event.id));

  const rows = await (where ? baseQuery.where(where) : baseQuery)
    .orderBy(desc(liveStream.updatedAt))
    .limit(limit);
  return rows.map((row) => {
    const owner = {
      displayUsername: row.ownerDisplayUsername,
      id: row.ownerId,
      image: row.ownerImage,
      name: row.ownerName,
      username: row.ownerUsername,
    };
    const eventRecord = row.eventId
      ? {
          id: row.eventId,
          name: row.eventName ?? "",
          startsAt: row.eventStartsAt ?? null,
        }
      : null;
    return { eventRecord, owner, record: row.live };
  });
};

export const liveStreamsRouter = new Hono<AppEnv>()
  .post(
    "/",
    requireAuth,
    requireVerifiedAuth,
    zValidator("json", createLiveStreamSchema),
    async (c) => {
      const credentials = getMuxCredentials(c);
      if (!credentials) {
        return c.json(
          { message: "Mux live streaming is not configured" },
          HttpStatusCodes.SERVICE_UNAVAILABLE
        );
      }

      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const data = c.req.valid("json");

      if (
        data.eventId &&
        !(await canManageEvent(db, data.eventId, authUser.id))
      ) {
        return c.json(
          { message: "You cannot attach a live stream to this event" },
          HttpStatusCodes.FORBIDDEN
        );
      }

      const id = createId();
      let muxLiveStream;
      try {
        muxLiveStream = await createMuxLiveStream(
          credentials.tokenId,
          credentials.tokenSecret,
          {
            latencyMode: data.latencyMode,
            passthrough: id,
            playbackPolicy: data.visibility === "public" ? "public" : "signed",
            title: data.title,
          }
        );
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "mux_live_stream_create_failed",
            message: error instanceof Error ? error.message : "unknown error",
          })
        );
        return c.json(
          { message: "Mux could not create the live stream" },
          HttpStatusCodes.BAD_GATEWAY
        );
      }

      try {
        await db.insert(liveStream).values({
          createdAt: new Date(),
          description: data.description,
          eventId: data.eventId,
          id,
          latencyMode: data.latencyMode,
          muxLiveStreamId: muxLiveStream.id,
          muxPlaybackId: muxLiveStream.playbackId,
          muxStreamKey: muxLiveStream.streamKey,
          ownerUserId: authUser.id,
          status: "idle",
          title: data.title,
          updatedAt: new Date(),
          visibility: data.visibility,
        });
      } catch (error) {
        try {
          await deleteMuxLiveStream(
            muxLiveStream.id,
            credentials.tokenId,
            credentials.tokenSecret
          );
        } catch {
          // The orphaned Mux stream is harmless; surface the persistence error.
        }
        console.error(
          JSON.stringify({
            event: "live_stream_persist_failed",
            message: error instanceof Error ? error.message : "unknown error",
          })
        );
        return c.json(
          { message: "Live stream could not be saved" },
          HttpStatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      const result = await getLiveStreamWithRelations(db, id);
      if (!result) {
        return c.json(
          { message: "Live stream could not be loaded" },
          HttpStatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      return c.json(
        {
          liveStream: toOwnerLiveStream(
            result.record,
            result.owner,
            result.eventRecord
          ),
        },
        HttpStatusCodes.CREATED
      );
    }
  )
  .get("/mine", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const rows = await getListRows(
      db,
      eq(liveStream.ownerUserId, authUser.id),
      50
    );
    return c.json(
      {
        liveStreams: rows.map((row) =>
          toOwnerLiveStream(row.record, row.owner, row.eventRecord)
        ),
      },
      HttpStatusCodes.OK
    );
  })
  .get("/", optionalAuth, async (c) => {
    const db = createDb(c.env.DB);
    const rows = await getListRows(
      db,
      and(
        eq(liveStream.visibility, "public"),
        or(
          inArray(liveStream.status, ["active", "connected", "recording"]),
          and(
            eq(liveStream.status, "completed"),
            isNotNull(liveStream.recordingVideoId)
          )
        )
      ),
      30
    );
    return c.json(
      {
        liveStreams: rows.map((row) =>
          toPublicLiveStream(row.record, row.owner, row.eventRecord)
        ),
      },
      HttpStatusCodes.OK
    );
  })
  .get("/:id", optionalAuth, async (c) => {
    const db = createDb(c.env.DB);
    const result = await getLiveStreamWithRelations(db, c.req.param("id"));
    if (!result) {
      return c.json(
        { message: "Live stream not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    const viewer = c.var.authSession?.user;
    const isOwner = viewer?.id === result.record.ownerUserId;
    if (result.record.visibility === "private" && !isOwner) {
      return c.json(
        { message: "Live stream not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    return c.json(
      {
        liveStream: isOwner
          ? toOwnerLiveStream(result.record, result.owner, result.eventRecord)
          : toPublicLiveStream(result.record, result.owner, result.eventRecord),
      },
      HttpStatusCodes.OK
    );
  })
  .patch(
    "/:id",
    requireAuth,
    zValidator("json", updateLiveStreamSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const record = await getOwnedLiveStream(
        db,
        c.req.param("id"),
        authUser.id
      );
      if (!record) {
        return c.json(
          { message: "Live stream not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      const data = c.req.valid("json");
      // Mux playback policies are fixed when this stream is created. Never
      // pretend that hiding a database row revokes an existing public URL.
      if (data.visibility && data.visibility !== record.visibility) {
        return c.json(
          { message: "Create a new stream to change visibility safely" },
          HttpStatusCodes.CONFLICT
        );
      }
      if (data.latencyMode && data.latencyMode !== record.latencyMode) {
        return c.json(
          { message: "Create a new stream to change latency mode" },
          HttpStatusCodes.CONFLICT
        );
      }
      if (
        data.eventId &&
        !(await canManageEvent(db, data.eventId, authUser.id))
      ) {
        return c.json(
          { message: "You cannot attach a live stream to this event" },
          HttpStatusCodes.FORBIDDEN
        );
      }

      await db
        .update(liveStream)
        .set({
          description: data.description,
          eventId: data.eventId,
          latencyMode: data.latencyMode,
          title: data.title,
          updatedAt: new Date(),
          visibility: data.visibility,
        })
        .where(eq(liveStream.id, record.id));

      const result = await getLiveStreamWithRelations(db, record.id);
      return c.json(
        {
          liveStream: result
            ? toOwnerLiveStream(result.record, result.owner, result.eventRecord)
            : null,
        },
        HttpStatusCodes.OK
      );
    }
  )
  .post("/:id/reset-key", requireAuth, async (c) => {
    const credentials = getMuxCredentials(c);
    if (!credentials) {
      return c.json(
        { message: "Mux live streaming is not configured" },
        HttpStatusCodes.SERVICE_UNAVAILABLE
      );
    }
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const record = await getOwnedLiveStream(db, c.req.param("id"), authUser.id);
    if (!record) {
      return c.json(
        { message: "Live stream not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    const streamKey = await resetMuxLiveStreamKey(
      record.muxLiveStreamId,
      credentials.tokenId,
      credentials.tokenSecret
    );
    await db
      .update(liveStream)
      .set({ muxStreamKey: streamKey, updatedAt: new Date() })
      .where(eq(liveStream.id, record.id));

    return c.json({ streamKey }, HttpStatusCodes.OK);
  })
  .post("/:id/complete", requireAuth, async (c) => {
    const credentials = getMuxCredentials(c);
    if (!credentials) {
      return c.json(
        { message: "Mux live streaming is not configured" },
        HttpStatusCodes.SERVICE_UNAVAILABLE
      );
    }
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const record = await getOwnedLiveStream(db, c.req.param("id"), authUser.id);
    if (!record) {
      return c.json(
        { message: "Live stream not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    await signalMuxLiveStreamComplete(
      record.muxLiveStreamId,
      credentials.tokenId,
      credentials.tokenSecret
    );
    const [updated] = await db
      .update(liveStream)
      .set({
        endedAt: new Date(),
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(liveStream.id, record.id))
      .returning();

    return c.json({ liveStream: updated }, HttpStatusCodes.OK);
  })
  .post("/:id/sync", requireAuth, async (c) => {
    const credentials = getMuxCredentials(c);
    if (!credentials) {
      return c.json(
        { message: "Mux live streaming is not configured" },
        HttpStatusCodes.SERVICE_UNAVAILABLE
      );
    }
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const record = await getOwnedLiveStream(db, c.req.param("id"), authUser.id);
    if (!record) {
      return c.json(
        { message: "Live stream not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    const muxLiveStream = await getMuxLiveStream(
      record.muxLiveStreamId,
      credentials.tokenId,
      credentials.tokenSecret
    );
    if (!muxLiveStream) {
      return c.json(
        { message: "Mux live stream not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    const updated = await syncMuxLiveStream(db, record, muxLiveStream);
    return c.json({ liveStream: updated }, HttpStatusCodes.OK);
  })
  .delete("/:id", requireAuth, async (c) => {
    const credentials = getMuxCredentials(c);
    if (!credentials) {
      return c.json(
        { message: "Mux live streaming is not configured" },
        HttpStatusCodes.SERVICE_UNAVAILABLE
      );
    }
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const record = await getOwnedLiveStream(db, c.req.param("id"), authUser.id);
    if (!record) {
      return c.json(
        { message: "Live stream not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    await deleteMuxLiveStream(
      record.muxLiveStreamId,
      credentials.tokenId,
      credentials.tokenSecret
    );
    await db.delete(liveStream).where(eq(liveStream.id, record.id));
    return c.json({ deleted: true }, HttpStatusCodes.OK);
  });
