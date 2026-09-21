import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  event,
  organization,
  organizationMember,
  post,
  video,
} from "@rallycaststv/db/schema/domain";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { isPlatformAdminUser } from "../lib/admin";
import { createId } from "../lib/ids";
import { toPublicVideo } from "../lib/public-data";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const organizationFields = z.object({
  bio: z.string().max(1000).optional(),
  city: z.string().max(120).optional(),
  logoUrl: z.url().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  state: z.string().max(80).optional(),
});

const addMemberSchema = z.object({
  role: z.enum(["admin", "editor"]).default("editor"),
  username: z.string().trim().min(1),
});

const organizationPostSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

const organizationVideoSchema = z.object({
  videoId: z.string().min(1),
});

const toPublicOrganization = (record: typeof organization.$inferSelect) => {
  const {
    createdByUserId: _createdByUserId,
    stripeAccountId: _stripeAccountId,
    stripeOnboardingStatus: _stripeOnboardingStatus,
    ...publicRecord
  } = record;
  return publicRecord;
};

const toMemberOrganization = (record: typeof organization.$inferSelect) => {
  const { stripeAccountId: _stripeAccountId, ...memberRecord } = record;
  return memberRecord;
};

const getMembership = async (
  db: ReturnType<typeof createDb>,
  organizationId: string,
  userId: string
) => {
  const [membership] = await db
    .select()
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.organizationId, organizationId),
        eq(organizationMember.userId, userId)
      )
    )
    .limit(1);
  return membership;
};

export const organizationsRouter = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = createDb(c.env.DB);
    const records = await db
      .select()
      .from(organization)
      .orderBy(desc(organization.isOfficial), desc(organization.createdAt));
    return c.json(
      { organizations: records.map(toPublicOrganization) },
      HttpStatusCodes.OK
    );
  })
  .get("/me", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const records = await db
      .select({ organization, role: organizationMember.role })
      .from(organizationMember)
      .innerJoin(
        organization,
        eq(organizationMember.organizationId, organization.id)
      )
      .where(eq(organizationMember.userId, authUser.id))
      .orderBy(desc(organization.updatedAt));
    return c.json(
      {
        organizations: records.map((record) => ({
          ...record,
          organization: toMemberOrganization(record.organization),
        })),
      },
      HttpStatusCodes.OK
    );
  })
  .post("/", requireAuth, zValidator("json", organizationFields), async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const data = c.req.valid("json");
    const record = {
      ...data,
      createdByUserId: authUser.id,
      id: createId(),
      isOfficial:
        data.slug === "rallycasts" ||
        data.slug === "official-rallycasts" ||
        (await isPlatformAdminUser(db, authUser.id)),
    };

    const inserted = await db
      .insert(organization)
      .values(record)
      .onConflictDoNothing({ target: organization.slug })
      .returning();
    if (!inserted[0]) {
      return c.json(
        { message: "That organization slug is already taken" },
        HttpStatusCodes.CONFLICT
      );
    }

    await db.insert(organizationMember).values({
      organizationId: record.id,
      role: "owner",
      userId: authUser.id,
    });
    return c.json(
      { organization: toPublicOrganization(inserted[0]) },
      HttpStatusCodes.CREATED
    );
  })
  .get("/:slug", async (c) => {
    const db = createDb(c.env.DB);
    const [record] = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, c.req.param("slug")))
      .limit(1);
    if (!record) {
      return c.json(
        { message: "Organization not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    const [members, events, videos, posts] = await Promise.all([
      db
        .select({
          role: organizationMember.role,
          user: {
            id: user.id,
            image: user.image,
            name: user.name,
            username: user.username,
          },
        })
        .from(organizationMember)
        .innerJoin(user, eq(organizationMember.userId, user.id))
        .where(eq(organizationMember.organizationId, record.id)),
      db
        .select()
        .from(event)
        .where(
          and(
            eq(event.organizationId, record.id),
            eq(event.status, "published")
          )
        )
        .orderBy(desc(event.startsAt)),
      db
        .select()
        .from(video)
        .where(
          and(
            eq(video.organizationId, record.id),
            eq(video.status, "ready"),
            eq(video.visibility, "public")
          )
        )
        .orderBy(desc(video.createdAt)),
      db
        .select()
        .from(post)
        .where(eq(post.organizationId, record.id))
        .orderBy(desc(post.createdAt)),
    ]);
    return c.json(
      {
        events,
        members,
        organization: toPublicOrganization(record),
        posts,
        videos: videos.map(toPublicVideo),
      },
      HttpStatusCodes.OK
    );
  })
  .patch(
    "/:slug",
    requireAuth,
    zValidator("json", organizationFields.partial().omit({ slug: true })),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const [record] = await db
        .select()
        .from(organization)
        .where(eq(organization.slug, c.req.param("slug")))
        .limit(1);
      if (!record) {
        return c.json(
          { message: "Organization not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }
      const membership = await getMembership(db, record.id, authUser.id);
      if (!membership || membership.role === "editor") {
        return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
      }
      const [updated] = await db
        .update(organization)
        .set({ ...c.req.valid("json"), updatedAt: new Date() })
        .where(eq(organization.id, record.id))
        .returning();
      return c.json(
        {
          organization: updated ? toPublicOrganization(updated) : null,
        },
        HttpStatusCodes.OK
      );
    }
  )
  .post(
    "/:slug/members",
    requireAuth,
    zValidator("json", addMemberSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const [record] = await db
        .select()
        .from(organization)
        .where(eq(organization.slug, c.req.param("slug")))
        .limit(1);
      if (!record) {
        return c.json(
          { message: "Organization not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }
      const membership = await getMembership(db, record.id, authUser.id);
      if (!membership || membership.role === "editor") {
        return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
      }
      const data = c.req.valid("json");
      const [memberUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.username, data.username.trim().toLowerCase()))
        .limit(1);
      if (!memberUser) {
        return c.json(
          { message: "Player not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }
      const [existingMember] = await db
        .select({ role: organizationMember.role })
        .from(organizationMember)
        .where(
          and(
            eq(organizationMember.organizationId, record.id),
            eq(organizationMember.userId, memberUser.id)
          )
        )
        .limit(1);
      if (existingMember?.role === "owner") {
        return c.json(
          { message: "Organization ownership cannot be changed here" },
          HttpStatusCodes.FORBIDDEN
        );
      }
      await db
        .insert(organizationMember)
        .values({
          organizationId: record.id,
          role: data.role,
          userId: memberUser.id,
        })
        .onConflictDoUpdate({
          set: { role: data.role },
          target: [
            organizationMember.organizationId,
            organizationMember.userId,
          ],
        });
      return c.json({ added: true }, HttpStatusCodes.OK);
    }
  )
  .post(
    "/:slug/posts",
    requireAuth,
    zValidator("json", organizationPostSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const [record] = await db
        .select()
        .from(organization)
        .where(eq(organization.slug, c.req.param("slug")))
        .limit(1);
      if (!record || !(await getMembership(db, record.id, authUser.id))) {
        return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
      }
      const organizationPost = {
        content: c.req.valid("json").content,
        id: createId(),
        organizationId: record.id,
        userId: authUser.id,
      };
      await db.insert(post).values(organizationPost);
      return c.json({ post: organizationPost }, HttpStatusCodes.CREATED);
    }
  )
  .post(
    "/:slug/videos",
    requireAuth,
    zValidator("json", organizationVideoSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const [record] = await db
        .select()
        .from(organization)
        .where(eq(organization.slug, c.req.param("slug")))
        .limit(1);
      if (!record || !(await getMembership(db, record.id, authUser.id))) {
        return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
      }
      const [updatedVideo] = await db
        .update(video)
        .set({ organizationId: record.id, updatedAt: new Date() })
        .where(
          and(
            eq(video.id, c.req.valid("json").videoId),
            eq(video.ownerUserId, authUser.id)
          )
        )
        .returning();
      if (!updatedVideo) {
        return c.json(
          { message: "Video not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }
      return c.json({ video: updatedVideo }, HttpStatusCodes.OK);
    }
  );
