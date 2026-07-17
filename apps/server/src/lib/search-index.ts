import type { createDb } from "@rallycaststv/db";
import type { venue } from "@rallycaststv/db/schema/domain";
import { searchDocument } from "@rallycaststv/db/schema/domain";
import { and, eq } from "drizzle-orm";

import { formatSearchDocumentInput, generateEmbedding } from "./embeddings";
import { createId } from "./ids";
import type { AppEnv } from "./types";

type Db = ReturnType<typeof createDb>;
type SearchBindings = Pick<
  AppEnv["Bindings"],
  "GOOGLE_GENERATIVE_AI_API_KEY" | "SEARCH_INDEX"
>;
type WaitUntilExecutionContext = Pick<ExecutionContext, "waitUntil">;

type SearchEntityType = "event" | "post" | "profile" | "venue" | "video";

interface UpsertSearchDocumentInput {
  content: string;
  entityId: string;
  entityType: SearchEntityType;
  metadata?: Record<string, unknown>;
  title: string;
}

export const upsertSearchDocument = async (
  db: Db,
  input: UpsertSearchDocumentInput
) => {
  const metadataJson = input.metadata
    ? JSON.stringify(input.metadata)
    : undefined;
  const existing = await db
    .select({ id: searchDocument.id })
    .from(searchDocument)
    .where(
      and(
        eq(searchDocument.entityId, input.entityId),
        eq(searchDocument.entityType, input.entityType)
      )
    )
    .limit(1);

  const values = {
    content: input.content,
    embeddingStatus: "pending" as const,
    entityId: input.entityId,
    entityType: input.entityType,
    metadataJson,
    title: input.title,
    updatedAt: new Date(),
  };

  if (existing[0]) {
    await db
      .update(searchDocument)
      .set(values)
      .where(eq(searchDocument.id, existing[0].id));
    return { id: existing[0].id, ...values };
  }

  const record = {
    id: createId(),
    ...values,
  };

  await db.insert(searchDocument).values(record);

  return record;
};

export const indexSearchDocumentVector = async (
  db: Db,
  env: SearchBindings,
  document: {
    content: string;
    entityId: string;
    entityType: SearchEntityType;
    id: string;
    metadataJson?: string | null;
    title: string;
  }
) => {
  if (!(env.SEARCH_INDEX && env.GOOGLE_GENERATIVE_AI_API_KEY)) {
    return { indexed: false, reason: "missing-bindings" as const };
  }

  try {
    const embedding = await generateEmbedding(
      env,
      formatSearchDocumentInput(document.title, document.content),
      "document"
    );

    if (!embedding) {
      await db
        .update(searchDocument)
        .set({ embeddingStatus: "failed" })
        .where(eq(searchDocument.id, document.id));
      return { indexed: false, reason: "missing-embedding" as const };
    }

    const source = document.metadataJson
      ? safeParseMetadata(document.metadataJson)
      : {};

    await env.SEARCH_INDEX.upsert([
      {
        id: document.id,
        metadata: {
          embeddingModel: embedding.model,
          entityId: document.entityId,
          entityType: document.entityType,
          ...("source" in source ? source : {}),
        },
        values: embedding.values,
      },
    ]);

    await db
      .update(searchDocument)
      .set({ embeddingModel: embedding.model, embeddingStatus: "ready" })
      .where(eq(searchDocument.id, document.id));

    return { indexed: true as const };
  } catch {
    await db
      .update(searchDocument)
      .set({ embeddingStatus: "failed" })
      .where(eq(searchDocument.id, document.id));
    return { indexed: false, reason: "indexing-failed" as const };
  }
};

export const scheduleSearchDocumentIndex = (
  getExecutionContext: () => WaitUntilExecutionContext | undefined,
  db: Db,
  env: SearchBindings,
  document: Parameters<typeof indexSearchDocumentVector>[2]
) => {
  if (!(env.SEARCH_INDEX && env.GOOGLE_GENERATIVE_AI_API_KEY)) {
    return;
  }

  try {
    getExecutionContext()?.waitUntil(
      indexSearchDocumentVector(db, env, document)
    );
  } catch {
    // Hono throws when an ExecutionContext is unavailable in local tests.
  }
};

export const removeSearchDocument = async (
  db: Db,
  env: SearchBindings,
  entityType: SearchEntityType,
  entityId: string
) => {
  const records = await db
    .select({ id: searchDocument.id })
    .from(searchDocument)
    .where(
      and(
        eq(searchDocument.entityId, entityId),
        eq(searchDocument.entityType, entityType)
      )
    );

  await db
    .delete(searchDocument)
    .where(
      and(
        eq(searchDocument.entityId, entityId),
        eq(searchDocument.entityType, entityType)
      )
    );

  const ids = records.map((record) => record.id);
  if (ids.length > 0 && env.SEARCH_INDEX?.deleteByIds) {
    try {
      await env.SEARCH_INDEX.deleteByIds(ids);
    } catch {
      // D1 is authoritative, so an orphaned vector cannot resolve to content.
    }
  }
};

export const syncVenueSearchDocument = async (
  getExecutionContext: () => WaitUntilExecutionContext | undefined,
  db: Db,
  env: SearchBindings,
  record: typeof venue.$inferSelect
) => {
  const searchRecord = await upsertSearchDocument(db, {
    content: [record.description, record.venueType, record.city, record.state]
      .filter(Boolean)
      .join(". "),
    entityId: record.id,
    entityType: "venue",
    metadata: { city: record.city, state: record.state },
    title: record.name,
  });
  scheduleSearchDocumentIndex(getExecutionContext, db, env, searchRecord);
};

const safeParseMetadata = (metadataJson: string) => {
  try {
    return {
      source: JSON.parse(metadataJson) as Record<string, unknown>,
    };
  } catch {
    return {};
  }
};
