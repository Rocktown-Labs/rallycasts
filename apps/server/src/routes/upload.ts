import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { createId } from "../lib/ids";
import { createMuxUploadUrl, getMuxUpload } from "../lib/mux-client";
import { uploadToR2 } from "../lib/r2-client";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const uploadRouter = new Hono<AppEnv>()
  .get("/mux", requireAuth, async (c) => {
    const tokenId = c.env.MUX_TOKEN_ID;
    const tokenSecret = c.env.MUX_TOKEN_SECRET;

    if (!tokenId || !tokenSecret) {
      return c.json(
        { message: "Mux not configured" },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    try {
      const { uploadId, uploadUrl } = await createMuxUploadUrl(
        tokenId,
        tokenSecret
      );

      return c.json({ uploadId, uploadUrl }, HttpStatusCodes.OK);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      return c.json(
        { message: `Mux upload creation failed: ${message}` },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  })
  .post("/mux/status", requireAuth, async (c) => {
    const { uploadId } = await c.req.json();
    const tokenId = c.env.MUX_TOKEN_ID;
    const tokenSecret = c.env.MUX_TOKEN_SECRET;

    if (!tokenId || !tokenSecret) {
      return c.json(
        { message: "Mux not configured" },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
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
        {
          assetId: upload.assetId,
          status: upload.status,
        },
        HttpStatusCodes.OK
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      return c.json(
        { message: `Mux status check failed: ${message}` },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  })
  .post("/image", requireAuth, async (c) => {
    const bucket = c.env.MEDIA_BUCKET;
    const publicUrl = c.env.R2_PUBLIC_URL;

    if (!bucket) {
      return c.json(
        { message: "R2 not configured" },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    try {
      const formData = await c.req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return c.json(
          { message: "No file provided" },
          HttpStatusCodes.BAD_REQUEST
        );
      }

      const contentType = file.type || "application/octet-stream";
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

      const key = `images/${createId()}-${file.name}`;
      const buffer = await file.arrayBuffer();

      await uploadToR2(bucket, key, new Uint8Array(buffer), contentType);

      const url = publicUrl
        ? `${publicUrl}/${key}`
        : `https://r2.cloudflarestorage.com/${key}`;

      return c.json(
        {
          key,
          url,
        },
        HttpStatusCodes.OK
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      return c.json(
        { message: `Upload failed: ${message}` },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  });
