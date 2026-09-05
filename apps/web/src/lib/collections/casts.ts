import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";
import { queryClient as defaultQueryClient } from "@/lib/query-client";

export interface CastingJobRecord {
  courtLabel?: string | null;
  currency?: string | null;
  endsAt?: string | null;
  id: string;
  notes?: string | null;
  priceCents?: number | null;
  requestedHours: number;
  startsAt: string;
  status:
    | "accepted"
    | "arrived"
    | "cancelled"
    | "completed"
    | "declined"
    | "draft"
    | "failed"
    | "offered"
    | "recording"
    | "requested"
    | "uploading";
  venueId?: string | null;
  $synced?: boolean;
}

export const castingJobsCollection = createCollection(
  queryCollectionOptions({
    getKey: (item: CastingJobRecord) => item.id,
    id: "casting-jobs",
    onInsert: async ({ transaction }) => {
      const item = transaction.mutations[0].modified as CastingJobRecord;
      await readApiJson(
        apiClient.api.v1["casting-jobs"].$post({
          json: {
            endsAt: item.endsAt ? new Date(item.endsAt) : undefined,
            notes: item.notes ?? undefined,
            priceCents: item.priceCents ?? undefined,
            requestedHours: item.requestedHours,
            startsAt: new Date(item.startsAt),
            venueId: item.venueId ?? undefined,
          },
        })
      );
    },
    queryClient: defaultQueryClient,
    queryFn: () =>
      readApiJson<{ jobs: CastingJobRecord[] }>(
        apiClient.api.v1["casting-jobs"].$get()
      ),
    queryKey: ["casting-jobs"],
    select: (res: { jobs: CastingJobRecord[] }) => res.jobs ?? [],
  })
);
