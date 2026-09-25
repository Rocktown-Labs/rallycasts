import * as Alchemy from "alchemy";
import { Stage } from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as GitHub from "alchemy/GitHub";
import * as Output from "alchemy/Output";
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

// Stage is only available inside Effect (yield* Stage), so every
// stage-dependent prop is computed in a small props Effect. Physical names
// must match v1 exactly (explicit v1 names or {app}-{id}-{stage}) so the
// first v2 deploy adopts resources instead of duplicating them.
const stackConfig = Effect.gen(function* props() {
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
  return {
    corsOrigin: isProd
      ? `${productionWebUrl},${webWorkerUrl}`
      : `${webWorkerUrl},http://localhost:3001,http://127.0.0.1:3001`,
    isProd,
    serverWorkerUrl,
    stage,
  };
});

const physicalName = (base: string) =>
  Effect.gen(function* props() {
    const { isProd, stage } = yield* stackConfig;
    return isProd ? base : `${base}-${stage}`;
  });

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

const workerDefaults = {
  compatibility: {
    flags: ["nodejs_compat"],
  },
  workersDev: true,
};

export const db = Cloudflare.D1.Database(
  "database",
  Effect.gen(function* props() {
    const { isProd, stage } = yield* stackConfig;
    return {
      migrations: "../../packages/db/src/migrations",
      name: isProd ? "rallycaststv-db" : `rallycaststv-db-${stage}`,
    };
  })
);

export const searchIndex = Cloudflare.Vectorize.Index(
  "search-index",
  Effect.gen(function* props() {
    const { isProd, stage } = yield* stackConfig;
    return {
      description: "RallyCasts semantic search index",
      dimensions: 768,
      metric: "cosine" as const,
      name: isProd ? "rallycasts-search-v2" : `rallycasts-search-${stage}`,
    };
  })
);

const r2BucketName = process.env.R2_BUCKET_NAME?.trim() || undefined;

export const mediaBucket = r2BucketName
  ? Cloudflare.R2.Bucket(
      "media-v4",
      Effect.gen(function* props() {
        const { isProd } = yield* stackConfig;
        return {
          domains: isProd ? [{ name: "media.rallycasts.com" }] : undefined,
          name: r2BucketName,
        };
      })
    )
  : undefined;

const queue = (id: string, base: string) =>
  Cloudflare.Queues.Queue(id, {
    name: physicalName(base),
  });

export const geofenceDeadLetterQueue = queue(
  "geofence-events-dlq",
  "rallycasts-geofence-events-dlq"
);
export const geofenceQueue = queue(
  "geofence-events",
  "rallycasts-geofence-events"
);
export const eventActivityDeadLetterQueue = queue(
  "event-activity-dlq",
  "rallycasts-event-activity-dlq"
);
export const eventActivityQueue = queue(
  "event-activity",
  "rallycasts-event-activity"
);
export const adsDeadLetterQueue = queue(
  "ads-events-dlq",
  "rallycasts-ads-events-dlq"
);
export const adsQueue = queue("ads-events", "rallycasts-ads-events");

export const server = Cloudflare.Worker(
  "rallycasts-server",
  Effect.gen(function* props() {
    const { corsOrigin, isProd, serverWorkerUrl, stage } = yield* stackConfig;
    // Dataset takes plain props only, so it is declared here (per-stage
    // name) instead of at module scope. Binding-only: no cloud resource,
    // nothing to adopt; datasets materialize on first write.
    const adsAnalytics = yield* Cloudflare.AnalyticsEngine.Dataset(
      "ads-analytics",
      {
        dataset: isProd ? "rallycasts_ads" : `rallycasts_ads_${stage}`,
      }
    );
    return {
      ...workerDefaults,
      bindings: {
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
      dev: {
        port: 3000,
      },
      env: {
        ADS_ANALYTICS: adsAnalytics,
        ADS_EVENTS: adsQueue,
        ...secretBinding("AD_BEACON_SECRET"),
        ...(isProd ? {} : { ALLOW_DEMO_ENDPOINTS: "true" }),
        BETTER_AUTH_SECRET: Config.Redacted("BETTER_AUTH_SECRET"),
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
        GOOGLE_GENERATIVE_AI_API_KEY: Config.Redacted(
          "GOOGLE_GENERATIVE_AI_API_KEY"
        ),
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
      },
      main: "../../apps/server/src/index.ts",
      name: physicalName("rallycasts-server"),
      observability: observabilityFor(isProd),
    };
  })
);

export const adsEventsWorker = Cloudflare.Worker(
  "rallycasts-ads-events",
  Effect.gen(function* props() {
    const { isProd, stage } = yield* stackConfig;
    const adsAnalytics = yield* Cloudflare.AnalyticsEngine.Dataset(
      "ads-analytics",
      {
        dataset: isProd ? "rallycasts_ads" : `rallycasts_ads_${stage}`,
      }
    );
    return {
      ...workerDefaults,
      env: {
        ADS_ANALYTICS: adsAnalytics,
        DB: db,
      },
      main: "../../apps/server/src/queues/ads-events.ts",
      name: physicalName("rallycasts-ads-events"),
      observability: observabilityFor(isProd),
    };
  })
);

export const geofenceEventsWorker = Cloudflare.Worker(
  "rallycasts-geofence-events",
  Effect.gen(function* props() {
    const { isProd } = yield* stackConfig;
    return {
      ...workerDefaults,
      bindings: {
        VENUE_PRESENCE: Cloudflare.DurableObject("venue-presence", {
          className: "VenuePresence",
          scriptName: physicalName("rallycasts-server"),
        }),
      },
      env: {
        DB: db,
        GEOFENCE_EVENTS: geofenceQueue,
      },
      main: "../../apps/server/src/queues/geofence-events.ts",
      name: physicalName("rallycasts-geofence-events"),
      observability: observabilityFor(isProd),
    };
  })
);

export const eventActivityWorker = Cloudflare.Worker(
  "rallycasts-event-activity",
  Effect.gen(function* props() {
    const { isProd } = yield* stackConfig;
    return {
      ...workerDefaults,
      bindings: {
        EVENT_COORDINATOR: Cloudflare.DurableObject("event-coordinator", {
          className: "EventCoordinator",
          scriptName: physicalName("rallycasts-server"),
        }),
      },
      env: {
        DB: db,
        EVENT_ACTIVITY_QUEUE: eventActivityQueue,
      },
      main: "../../apps/server/src/queues/event-activity.ts",
      name: physicalName("rallycasts-event-activity"),
      observability: observabilityFor(isProd),
    };
  })
);

export const web = Cloudflare.Website.Vite(
  "rallycasts-web",
  Effect.gen(function* props() {
    const { corsOrigin, isProd, serverWorkerUrl } = yield* stackConfig;
    return {
      ...workerDefaults,
      env: {
        BETTER_AUTH_SECRET: Config.Redacted("BETTER_AUTH_SECRET"),
        BETTER_AUTH_URL: serverWorkerUrl,
        CORS_ORIGIN: corsOrigin,
        DB: db,
        ...plainBinding("GITHUB_CLIENT_ID"),
        ...secretBinding("GITHUB_CLIENT_SECRET"),
        ...plainBinding("GOOGLE_CLIENT_ID"),
        ...secretBinding("GOOGLE_CLIENT_SECRET"),
        GOOGLE_GENERATIVE_AI_API_KEY: Config.Redacted(
          "GOOGLE_GENERATIVE_AI_API_KEY"
        ),
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
      name: physicalName("rallycasts-web"),
      observability: observabilityFor(isProd),
      rootDir: "../../apps/web",
    };
  })
);

export type ServerEnv = Cloudflare.InferEnv<typeof server>;

export default Alchemy.Stack(
  "rallycaststv",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), GitHub.providers()),
    state: Cloudflare.state(),
  },
  Effect.gen(function* props() {
    const serverWorker = yield* server;
    const adsWorker = yield* adsEventsWorker;
    const geofenceWorker = yield* geofenceEventsWorker;
    const activityWorker = yield* eventActivityWorker;
    const webApp = yield* web;

    const adsQ = yield* adsQueue;
    const adsDlq = yield* adsDeadLetterQueue;
    const geofenceQ = yield* geofenceQueue;
    const geofenceDlq = yield* geofenceDeadLetterQueue;
    const activityQ = yield* eventActivityQueue;
    const activityDlq = yield* eventActivityDeadLetterQueue;

    yield* Cloudflare.Queues.Consumer("ads-events-consumer", {
      deadLetterQueue: adsDlq.queueName,
      queueId: adsQ.queueId,
      scriptName: adsWorker.workerName,
      settings: {
        batchSize: 100,
        maxConcurrency: 5,
        maxRetries: 5,
        maxWaitTimeMs: 5000,
        retryDelay: 60,
      },
    });

    yield* Cloudflare.Queues.Consumer("geofence-events-consumer", {
      deadLetterQueue: geofenceDlq.queueName,
      queueId: geofenceQ.queueId,
      scriptName: geofenceWorker.workerName,
      settings: {
        batchSize: 25,
        maxConcurrency: 5,
        maxRetries: 5,
        maxWaitTimeMs: 5000,
        retryDelay: 60,
      },
    });

    yield* Cloudflare.Queues.Consumer("event-activity-consumer", {
      deadLetterQueue: activityDlq.queueName,
      queueId: activityQ.queueId,
      scriptName: activityWorker.workerName,
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
