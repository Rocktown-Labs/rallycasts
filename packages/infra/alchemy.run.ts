/// <reference types="@cloudflare/workers-types" />
import * as Alchemy from "alchemy";
import { Stage } from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as GitHub from "alchemy/GitHub";
import * as Output from "alchemy/Output";
import * as RemovalPolicy from "alchemy/RemovalPolicy";
import { config } from "dotenv";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Redacted from "effect/Redacted";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

type SecretBinding<N extends string> = Partial<
  Record<N, Config.Config<Redacted.Redacted<string>>>
>;

// v1 parity: a missing/empty env var means "binding absent" so workers boot
// degraded (e.g. "Stripe is not configured") instead of failing the deploy.
// NOTE: v1's requiredSecret() never actually threw in CI (empty workflow
// vars took the inherit path), so even BETTER_AUTH_SECRET and the Gemini
// key stay tolerant here. Runtime code already handles absence via 503s
// and fallback modes (e.g. fallback-hybrid search).
const secretBinding = <const N extends string>(name: N): SecretBinding<N> => {
  const value = process.env[name]?.trim();
  return (value ? { [name]: Config.Redacted(name) } : {}) as SecretBinding<N>;
};

const plainBinding = <const N extends string>(
  name: N
): Partial<Record<N, string>> => {
  const value = process.env[name]?.trim();
  return (value ? { [name]: value } : {}) as Partial<Record<N, string>>;
};

const physicalName = (base: string, isProd: boolean, stage: string): string =>
  isProd ? base : `${base}-${stage}`;

const observabilityFor = (isProd: boolean) => ({
  enabled: true,
  headSamplingRate: 1,
  logs: {
    enabled: true,
    headSamplingRate: 1,
    invocationLogs: true,
    persist: true,
  },
  traces: {
    enabled: true,
    headSamplingRate: isProd ? 0.1 : 1,
    persist: true,
  },
});

// Structural mirror of apps/server/src/lib/types.ts VectorizeBinding (kept
// here because packages/env cannot import from apps/). Keep in sync.
interface VectorizeBindingShape {
  deleteByIds?: (ids: string[]) => Promise<unknown>;
  query: (
    vector: number[],
    options: { topK: number }
  ) => Promise<{ matches: { id: string; score?: number }[] }>;
  upsert: (
    vectors: {
      id: string;
      metadata?: Record<string, unknown>;
      values: number[];
    }[]
  ) => Promise<unknown>;
}

// Exact worker-env shape for packages/env type inference. Keys mirror the
// bindings declared on the server Worker below; keep in sync when adding
// bindings (a missing key fails loudly at the use site).
export interface ServerEnv {
  AD_BEACON_SECRET: string;
  ADS_ANALYTICS: AnalyticsEngineDataset;
  ADS_EVENTS: Queue;
  ALLOW_DEMO_ENDPOINTS: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  CHAT_ROOMS: DurableObjectNamespace;
  CORS_ORIGIN: string;
  DB: D1Database;
  E2E_SEED_TOKEN: string;
  EVENT_ACTIVITY_QUEUE: Queue;
  EVENT_COORDINATOR: DurableObjectNamespace;
  GEOFENCE_EVENTS: Queue;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
  GOOGLE_PLACES_API_KEY: string;
  MEDIA_BUCKET: R2Bucket;
  MUX_SIGNING_KEY_ID: string;
  MUX_SIGNING_KEY_SECRET: string;
  MUX_TOKEN_ID: string;
  MUX_TOKEN_SECRET: string;
  MUX_WEBHOOK_SECRET: string;
  R2_ACCESS_KEY_ID: string;
  R2_ACCOUNT_ID: string;
  R2_PUBLIC_URL: string;
  R2_SECRET_ACCESS_KEY: string;
  RADAR_SECRET_KEY: string;
  RADAR_WEBHOOK_SECRET: string;
  RATE_LIMITER: RateLimit;
  RATE_LIMITER_STRICT: RateLimit;
  RESEND_API_KEY: string;
  RESEND_WEBHOOK_SECRET: string;
  SEARCH_INDEX: VectorizeBindingShape;
  SENTRY_DSN: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  USER_NOTIFICATIONS: DurableObjectNamespace;
  VENUE_PRESENCE: DurableObjectNamespace;
}

const workerDefaults = {
  compatibility: {
    flags: ["nodejs_compat"],
  },
  workersDev: true,
};

export default Alchemy.Stack(
  "rallycaststv",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), GitHub.providers()),
    state: Cloudflare.state(),
  },
  Effect.gen(function* props() {
    const rawStage: string = yield* Stage;
    const stage = rawStage === "ubuntu" ? "prod" : (rawStage ?? "dev");
    const isProd = stage === "prod";
    const productionServerUrl = "https://api.rallycasts.com";
    const productionWebUrl = "https://rallycasts.com";
    const serverWorkerUrl = isProd
      ? productionServerUrl
      : `https://rallycasts-server-${stage}.rocktown-labs.workers.dev`;
    const webWorkerUrl = isProd
      ? "https://rallycasts-web.rocktown-labs.workers.dev"
      : `https://rallycasts-web-${stage}.rocktown-labs.workers.dev`;
    const corsOrigin = isProd
      ? `${productionWebUrl},${webWorkerUrl}`
      : `${webWorkerUrl},http://localhost:3001,http://127.0.0.1:3001`;
    const observability = observabilityFor(isProd);
    const r2BucketName = process.env.R2_BUCKET_NAME?.trim() || undefined;

    // NOTE: no `migrations` prop — schema changes ship via
    // `wrangler d1 migrations apply` in CI (deploy + e2e-staging
    // workflows). The v2 layout validator rejects our drizzle-kit
    // 0.31 meta/ directory, and converting it would break the
    // vitest pool's migration reader. Revisit together with a
    // drizzle-kit/test-harness upgrade.
    // Retain in prod only: preview DBs must still tear down with PR
    // stages, but nothing may ever auto-delete the production database.
    const db = yield* Cloudflare.D1.Database("database", {
      name: physicalName("rallycaststv-db", isProd, stage),
    }).pipe(RemovalPolicy.retain(isProd));

    // Retain in prod only (preview indexes tear down with PR stages).
    const searchIndex = yield* Cloudflare.Vectorize.Index("search-index", {
      description: "RallyCasts semantic search index",
      dimensions: 768,
      metric: "cosine",
      name: isProd ? "rallycasts-search-v2" : `rallycasts-search-${stage}`,
    }).pipe(RemovalPolicy.retain(isProd));

    // Unconditional retain: this is ONE physical bucket shared by every
    // stage. No stage teardown (especially PR preview cleanup) may ever
    // delete it — that is what wiped it on 2026-09-27.
    const mediaBucket = r2BucketName
      ? yield* Cloudflare.R2.Bucket("media-v4", {
          domains: isProd ? [{ name: "media.rallycasts.com" }] : undefined,
          name: r2BucketName,
        }).pipe(RemovalPolicy.retain())
      : undefined;

    const geofenceDeadLetterQueue = yield* Cloudflare.Queues.Queue(
      "geofence-events-dlq",
      { name: physicalName("rallycasts-geofence-events-dlq", isProd, stage) }
    );
    const geofenceQueue = yield* Cloudflare.Queues.Queue("geofence-events", {
      name: physicalName("rallycasts-geofence-events", isProd, stage),
    });
    const eventActivityDeadLetterQueue = yield* Cloudflare.Queues.Queue(
      "event-activity-dlq",
      { name: physicalName("rallycasts-event-activity-dlq", isProd, stage) }
    );
    const eventActivityQueue = yield* Cloudflare.Queues.Queue(
      "event-activity",
      { name: physicalName("rallycasts-event-activity", isProd, stage) }
    );
    const adsDeadLetterQueue = yield* Cloudflare.Queues.Queue(
      "ads-events-dlq",
      { name: physicalName("rallycasts-ads-events-dlq", isProd, stage) }
    );
    const adsQueue = yield* Cloudflare.Queues.Queue("ads-events", {
      name: physicalName("rallycasts-ads-events", isProd, stage),
    });

    const serverWorker = yield* Cloudflare.Worker("rallycasts-server", {
      ...workerDefaults,
      dev: {
        port: 3000,
      },
      env: {
        ADS_ANALYTICS: Cloudflare.AnalyticsEngine.Dataset("ads-analytics", {
          dataset: isProd ? "rallycasts_ads" : `rallycasts_ads_${stage}`,
        }),
        ADS_EVENTS: adsQueue,
        ...secretBinding("AD_BEACON_SECRET"),
        ...(isProd ? {} : { ALLOW_DEMO_ENDPOINTS: "true" }),
        ...secretBinding("BETTER_AUTH_SECRET"),
        BETTER_AUTH_URL: serverWorkerUrl,
        CORS_ORIGIN: corsOrigin,
        DB: db,
        ...(isProd ? {} : secretBinding("E2E_SEED_TOKEN")),
        EVENT_ACTIVITY_QUEUE: eventActivityQueue,
        GEOFENCE_EVENTS: geofenceQueue,
        ...plainBinding("GITHUB_CLIENT_ID"),
        ...secretBinding("GITHUB_CLIENT_SECRET"),
        ...plainBinding("GOOGLE_CLIENT_ID"),
        ...secretBinding("GOOGLE_CLIENT_SECRET"),
        ...secretBinding("GOOGLE_GENERATIVE_AI_API_KEY"),
        ...secretBinding("GOOGLE_PLACES_API_KEY"),
        ...(mediaBucket ? { MEDIA_BUCKET: mediaBucket } : {}),
        ...secretBinding("MUX_SIGNING_KEY_ID"),
        ...secretBinding("MUX_SIGNING_KEY_SECRET"),
        ...secretBinding("MUX_TOKEN_ID"),
        ...secretBinding("MUX_TOKEN_SECRET"),
        ...secretBinding("MUX_WEBHOOK_SECRET"),
        ...plainBinding("R2_ACCESS_KEY_ID"),
        ...plainBinding("R2_ACCOUNT_ID"),
        ...plainBinding("R2_PUBLIC_URL"),
        ...secretBinding("R2_SECRET_ACCESS_KEY"),
        ...secretBinding("RADAR_SECRET_KEY"),
        ...secretBinding("RADAR_WEBHOOK_SECRET"),
        RATE_LIMITER: Cloudflare.RateLimit("api-rate-limiter", {
          namespaceId: 1101,
          simple: { limit: 600, period: 60 },
        }),
        RATE_LIMITER_STRICT: Cloudflare.RateLimit("strict-rate-limiter", {
          namespaceId: 1102,
          simple: { limit: 60, period: 60 },
        }),
        ...secretBinding("RESEND_API_KEY"),
        ...secretBinding("RESEND_WEBHOOK_SECRET"),
        SEARCH_INDEX: searchIndex,
        ...secretBinding("SENTRY_DSN"),
        ...secretBinding("STRIPE_SECRET_KEY"),
        ...secretBinding("STRIPE_WEBHOOK_SECRET"),
        CHAT_ROOMS: Cloudflare.DurableObject("chat-rooms", {
          className: "ChatRoom",
        }),
        EVENT_COORDINATOR: Cloudflare.DurableObject("event-coordinator", {
          className: "EventCoordinator",
        }),
        USER_NOTIFICATIONS: Cloudflare.DurableObject("user-notifications", {
          className: "UserNotifications",
        }),
        VENUE_PRESENCE: Cloudflare.DurableObject("venue-presence", {
          className: "VenuePresence",
        }),
      },
      main: "../../apps/server/src/index.ts",
      name: physicalName("rallycasts-server", isProd, stage),
      observability,
    });

    const adsEventsWorker = yield* Cloudflare.Worker("rallycasts-ads-events", {
      ...workerDefaults,
      env: {
        ADS_ANALYTICS: Cloudflare.AnalyticsEngine.Dataset("ads-analytics", {
          dataset: isProd ? "rallycasts_ads" : `rallycasts_ads_${stage}`,
        }),
        DB: db,
      },
      main: "../../apps/server/src/queues/ads-events.ts",
      name: physicalName("rallycasts-ads-events", isProd, stage),
      observability,
    });

    const geofenceEventsWorker = yield* Cloudflare.Worker(
      "rallycasts-geofence-events",
      {
        ...workerDefaults,
        env: {
          DB: db,
          GEOFENCE_EVENTS: geofenceQueue,
          VENUE_PRESENCE: Cloudflare.DurableObject("venue-presence", {
            className: "VenuePresence",
            scriptName: physicalName("rallycasts-server", isProd, stage),
          }),
        },
        main: "../../apps/server/src/queues/geofence-events.ts",
        name: physicalName("rallycasts-geofence-events", isProd, stage),
        observability,
      }
    );

    const eventActivityWorker = yield* Cloudflare.Worker(
      "rallycasts-event-activity",
      {
        ...workerDefaults,
        env: {
          DB: db,
          EVENT_ACTIVITY_QUEUE: eventActivityQueue,
          EVENT_COORDINATOR: Cloudflare.DurableObject("event-coordinator", {
            className: "EventCoordinator",
            scriptName: physicalName("rallycasts-server", isProd, stage),
          }),
        },
        main: "../../apps/server/src/queues/event-activity.ts",
        name: physicalName("rallycasts-event-activity", isProd, stage),
        observability,
      }
    );

    const webApp = yield* Cloudflare.Website.Vite("rallycasts-web", {
      ...workerDefaults,
      env: {
        ...secretBinding("BETTER_AUTH_SECRET"),
        BETTER_AUTH_URL: serverWorkerUrl,
        CORS_ORIGIN: corsOrigin,
        DB: db,
        ...plainBinding("GITHUB_CLIENT_ID"),
        ...secretBinding("GITHUB_CLIENT_SECRET"),
        ...plainBinding("GOOGLE_CLIENT_ID"),
        ...secretBinding("GOOGLE_CLIENT_SECRET"),
        ...secretBinding("GOOGLE_GENERATIVE_AI_API_KEY"),
        ...secretBinding("GOOGLE_PLACES_API_KEY"),
        ...secretBinding("RADAR_SECRET_KEY"),
        ...secretBinding("SENTRY_DSN"),
        ...plainBinding("VITE_FOURTHWALL_STOREFRONT_TOKEN"),
        ...plainBinding("VITE_FOURTHWALL_STOREFRONT_URL"),
        ...plainBinding("VITE_RADAR_PUBLISHABLE_KEY"),
        ...secretBinding("VITE_SENTRY_DSN"),
        VITE_SERVER_URL: serverWorkerUrl,
      },
      main: "src/server.ts",
      memo: {
        include: ["**/*", "../../packages/*/src/**"],
        lockfile: true,
      },
      name: physicalName("rallycasts-web", isProd, stage),
      observability,
      rootDir: "../../apps/web",
    });

    yield* Cloudflare.Queues.Consumer("ads-events-consumer", {
      deadLetterQueue: adsDeadLetterQueue.queueName,
      queueId: adsQueue.queueId,
      scriptName: adsEventsWorker.workerName,
      settings: {
        batchSize: 100,
        maxConcurrency: 5,
        maxRetries: 5,
        maxWaitTimeMs: 5000,
        retryDelay: 60,
      },
    });

    yield* Cloudflare.Queues.Consumer("geofence-events-consumer", {
      deadLetterQueue: geofenceDeadLetterQueue.queueName,
      queueId: geofenceQueue.queueId,
      scriptName: geofenceEventsWorker.workerName,
      settings: {
        batchSize: 25,
        maxConcurrency: 5,
        maxRetries: 5,
        maxWaitTimeMs: 5000,
        retryDelay: 60,
      },
    });

    yield* Cloudflare.Queues.Consumer("event-activity-consumer", {
      deadLetterQueue: eventActivityDeadLetterQueue.queueName,
      queueId: eventActivityQueue.queueId,
      scriptName: eventActivityWorker.workerName,
      settings: {
        batchSize: 25,
        maxConcurrency: 5,
        maxRetries: 5,
        maxWaitTimeMs: 5000,
        retryDelay: 60,
      },
    });

    const github = yield* GitHub.GitHubEnv;
    if (github?.pr) {
      yield* GitHub.Comment("preview-comment", {
        body: Output.interpolate`## 🚀 Preview Deployed

Your changes have been deployed to a preview environment:

**Web:** ${webApp.url}
**Server:** ${serverWorker.url}

Built from commit ${github.sha.slice(0, 7)}

---
<sub>🤖 This comment updates automatically with each push.</sub>`,
        issueNumber: github.pr,
        owner: "Rocktown-Labs",
        repository: "rallycasts",
      });
    }

    return {
      serverUrl: serverWorker.url,
      webUrl: webApp.url,
    };
  })
);
