import type { createDb } from "@rallycaststv/db";
import type { venue } from "@rallycaststv/db/schema/domain";
import { searchDocument } from "@rallycaststv/db/schema/domain";
import { and, eq } from "drizzle-orm";

import { createId } from "./ids";
import type { AppEnv } from "./types";

type Db = ReturnType<typeof createDb>;
type SearchBindings = Pick<AppEnv["Bindings"], "AI" | "SEARCH_INDEX">;
type WaitUntilExecutionContext = Pick<ExecutionContext, "waitUntil">;
const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5" as const;

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
  if (!(env.AI && env.SEARCH_INDEX)) {
    return { indexed: false, reason: "missing-bindings" as const };
  }

  try {
    const embeddings = await env.AI.run(EMBEDDING_MODEL, {
      text: [`${document.title}\n${document.content}`],
    });
    const values = embeddings.data?.[0];

    if (!values) {
      await db
        .update(searchDocument)
        .set({ embeddingModel: EMBEDDING_MODEL, embeddingStatus: "failed" })
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
          entityId: document.entityId,
          entityType: document.entityType,
          ...("source" in source ? source : {}),
        },
        values,
      },
    ]);

    await db
      .update(searchDocument)
      .set({ embeddingModel: EMBEDDING_MODEL, embeddingStatus: "ready" })
      .where(eq(searchDocument.id, document.id));

    return { indexed: true as const };
  } catch {
    await db
      .update(searchDocument)
      .set({ embeddingModel: EMBEDDING_MODEL, embeddingStatus: "failed" })
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
  if (!(env.AI && env.SEARCH_INDEX)) {
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
