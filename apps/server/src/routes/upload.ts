import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { video } from "@rallycaststv/db/schema/domain";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { createId } from "../lib/ids";
import { createMuxUploadUrl, getMuxUpload } from "../lib/mux-client";
import { uploadToR2 } from "../lib/r2-client";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";
import { requireVerifiedAuth } from "../middleware/security";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const startsWithBytes = (bytes: Uint8Array, signature: number[]) =>
  signature.every((value, index) => bytes[index] === value);

const hasDeclaredImageSignature = (
  bytes: Uint8Array,
  contentType: string
): boolean => {
  if (contentType === "image/jpeg") {
    return startsWithBytes(bytes, [0xff, 0xd8, 0xff]);
  }
  if (contentType === "image/png") {
    return startsWithBytes(
      bytes,
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    );
  }
  if (contentType === "image/webp") {
    return (
      startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      startsWithBytes(bytes.slice(8, 12), [0x57, 0x45, 0x42, 0x50])
    );
  }
  if (contentType === "image/avif") {
    const hasFtyp = startsWithBytes(
      bytes.slice(4, 8),
      [0x66, 0x74, 0x79, 0x70]
    );
    const hasAvifBrand = [8, 16, 20, 24].some((offset) =>
      startsWithBytes(bytes.slice(offset, offset + 4), [0x61, 0x76, 0x69, 0x66])
    );
    const hasAvisBrand = [8, 16, 20, 24].some((offset) =>
      startsWithBytes(bytes.slice(offset, offset + 4), [0x61, 0x76, 0x69, 0x73])
    );
    return hasFtyp && (hasAvifBrand || hasAvisBrand);
  }
  return false;
};

const createMuxUploadSchema = z.object({
  description: z.string().max(2000).optional(),
  mediaType: z.enum(["video", "short"]).default("video"),
  title: z.string().trim().min(1).max(160),
  visibility: z.enum(["public", "friends", "private"]).default("private"),
});

const muxUploadStatusSchema = z.object({
  uploadId: z.string().min(1).max(200),
});

const getMuxCorsOrigin = (
  requestedOrigin: string | undefined,
  configuredOrigins: string | undefined
) => {
  const origins = (configuredOrigins ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return requestedOrigin && origins.includes(requestedOrigin)
    ? requestedOrigin
    : origins[0];
};

const logUploadError = (event: string, error: unknown) => {
  console.error(
    JSON.stringify({
      event,
      message: error instanceof Error ? error.message : "unknown error",
    })
  );
};

export const uploadRouter = new Hono<AppEnv>()
  .post(
    "/mux",
    requireAuth,
    requireVerifiedAuth,
    zValidator("json", createMuxUploadSchema),
    async (c) => {
      const tokenId = c.env.MUX_TOKEN_ID;
      const tokenSecret = c.env.MUX_TOKEN_SECRET;
      const muxCorsOrigin = getMuxCorsOrigin(
        c.req.header("Origin"),
        c.env.CORS_ORIGIN
      );

      if (!tokenId || !tokenSecret) {
        return c.json(
          { message: "Mux not configured" },
          HttpStatusCodes.SERVICE_UNAVAILABLE
        );
      }
      if (!muxCorsOrigin) {
        return c.json(
          { message: "CORS is not configured" },
          HttpStatusCodes.SERVICE_UNAVAILABLE
        );
      }

      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const data = c.req.valid("json");
      const videoId = createId();

      try {
        const playbackPolicy =
          data.visibility === "public"
            ? ("public" as const)
            : ("signed" as const);
        const { uploadId, uploadUrl } = await createMuxUploadUrl(
          tokenId,
          tokenSecret,
          videoId,
          muxCorsOrigin,
          playbackPolicy
        );
        const draft = {
          description: data.description,
          id: videoId,
          mediaType: data.mediaType,
          muxPlaybackPolicy: playbackPolicy,
          muxStatus: "waiting",
          muxUploadId: uploadId,
          ownerUserId: authUser.id,
          status: "uploading" as const,
          title: data.title,
          visibility: data.visibility,
        };

        await db.insert(video).values(draft);
        return c.json(
          { uploadId, uploadUrl, video: draft },
          HttpStatusCodes.CREATED
        );
      } catch (error) {
        logUploadError("mux_upload_creation_failed", error);
        return c.json(
          { message: "Mux upload creation failed" },
          HttpStatusCodes.BAD_GATEWAY
        );
      }
    }
  )
  .post(
    "/mux/status",
    requireAuth,
    requireVerifiedAuth,
    zValidator("json", muxUploadStatusSchema),
    async (c) => {
      const { uploadId } = c.req.valid("json");
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const [ownedVideo] = await db
        .select({ id: video.id })
        .from(video)
        .where(
          and(
            eq(video.muxUploadId, uploadId),
            eq(video.ownerUserId, authUser.id)
          )
        )
        .limit(1);
      if (!ownedVideo) {
        return c.json(
          { message: "Upload not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      const tokenId = c.env.MUX_TOKEN_ID;
      const tokenSecret = c.env.MUX_TOKEN_SECRET;
      if (!tokenId || !tokenSecret) {
        return c.json(
          { message: "Mux not configured" },
          HttpStatusCodes.SERVICE_UNAVAILABLE
        );
      }

      try {
        const upload = await getMuxUpload(uploadId, tokenId, tokenSecret);
        if (!upload) {
          return c.json(
            { message: "Upload not found" },
            HttpStatusCodes.NOT_FOUND
          );
        }
        return c.json(
          { assetId: upload.assetId, status: upload.status },
          HttpStatusCodes.OK
        );
      } catch (error) {
        logUploadError("mux_upload_status_failed", error);
        return c.json(
          { message: "Mux status check failed" },
          HttpStatusCodes.BAD_GATEWAY
        );
      }
    }
  )
  .post("/image", requireAuth, requireVerifiedAuth, async (c) => {
    const bucket = c.env.MEDIA_BUCKET;
    let publicUrl: string | undefined;
    if (c.env.R2_PUBLIC_URL) {
      try {
        const configuredUrl = new URL(c.env.R2_PUBLIC_URL);
        if (configuredUrl.protocol === "https:") {
          publicUrl = configuredUrl.toString().replace(/\/$/u, "");
        }
      } catch {
        publicUrl = undefined;
      }
    }

    try {
      const formData = await c.req.formData();
      const fileValue = formData.get("file");
      if (
        !fileValue ||
        typeof fileValue === "string" ||
        !(
          "arrayBuffer" in fileValue &&
          typeof (fileValue as { arrayBuffer?: unknown }).arrayBuffer ===
            "function"
        )
      ) {
        return c.json(
          { message: "No file provided" },
          HttpStatusCodes.BAD_REQUEST
        );
      }

      const file = fileValue as unknown as File;
      const contentType = file.type;
      if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
        return c.json(
          { message: "Only AVIF, JPEG, PNG, and WebP images are supported" },
          HttpStatusCodes.BAD_REQUEST
        );
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return c.json(
          { message: "Image must be 5MB or smaller" },
          HttpStatusCodes.BAD_REQUEST
        );
      }
      const imageBytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
      if (!hasDeclaredImageSignature(imageBytes, contentType)) {
        return c.json(
          { message: "Image contents do not match the declared type" },
          HttpStatusCodes.BAD_REQUEST
        );
      }
      if (!(bucket && publicUrl)) {
        return c.json(
          { message: "Media storage is not configured" },
          HttpStatusCodes.SERVICE_UNAVAILABLE
        );
      }

      const extension = IMAGE_EXTENSIONS[contentType];
      const key = `images/${createId()}.${extension}`;
      await uploadToR2(
        bucket,
        key,
        new Uint8Array(await file.arrayBuffer()),
        contentType
      );

      return c.json(
        { key, url: publicUrl ? `${publicUrl}/${key}` : null },
        HttpStatusCodes.OK
      );
    } catch (error) {
      logUploadError("image_upload_failed", error);
      return c.json({ message: "Upload failed" }, HttpStatusCodes.BAD_GATEWAY);
    }
  });
