import type { createDb } from "@rallycaststv/db";
import { searchDocument } from "@rallycaststv/db/schema/domain";
import { and, eq } from "drizzle-orm";

import { createId } from "./ids";
import type { AppEnv } from "./types";

type Db = ReturnType<typeof createDb>;
type SearchBindings = Pick<AppEnv["Bindings"], "AI" | "SEARCH_INDEX">;
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
    const embeddings = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: [`${document.title}\n${document.content}`],
    });
    const values = embeddings.data?.[0];

    if (!values) {
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

    return { indexed: true as const };
  } catch {
    return { indexed: false, reason: "indexing-failed" as const };
  }
};

export const scheduleSearchDocumentIndex = (
  getExecutionContext: () => WaitUntilExecutionContext | undefined,
  env: SearchBindings,
  document: Parameters<typeof indexSearchDocumentVector>[1]
) => {
  if (!(env.AI && env.SEARCH_INDEX)) {
    return;
  }

  try {
    getExecutionContext()?.waitUntil(indexSearchDocumentVector(env, document));
  } catch {
    // Hono throws when an ExecutionContext is unavailable in local tests.
  }
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
