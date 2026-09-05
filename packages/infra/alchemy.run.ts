import alchemy, { Secret } from "alchemy";
import {
  D1Database,
  DurableObjectNamespace,
  Queue,
  R2Bucket,
  TanStackStart,
  VectorizeIndex,
  Worker,
} from "alchemy/cloudflare";
import type { Binding, Bindings } from "alchemy/cloudflare";
import { GitHubComment } from "alchemy/github";
import { CloudflareStateStore } from "alchemy/state";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

const required = <Value>(value: Value | undefined, name: string): Value => {
  if (value === undefined) {
    throw new Error(`Missing required Alchemy env: ${name}`);
  }

  return value;
};

class InheritedSecret extends Secret<string> {
  constructor(name: string) {
    super("" as unknown as string, name);
    Object.defineProperty(this, "unencrypted", {
      configurable: true,
      enumerable: true,
      get() {
        const stack = new Error("stack check").stack || "";
        if (stack.includes("serialize") || stack.includes("serde")) {
          return "";
        }
        return undefined as unknown as string;
      },
    });
  }
}

const optionalSecret = (name: string) =>
  process.env[name] === undefined || process.env[name] === ""
    ? new InheritedSecret(name)
    : alchemy.secret.env(name);

const optionalPlainEnv = (name: string) =>
  process.env[name]?.trim() || undefined;

const requiredSecret = (name: string) =>
  process.env[name] === undefined || process.env[name] === ""
    ? new InheritedSecret(name)
    : required(alchemy.secret.env(name), name);

const filterMissingBindings = (
  bindings: Record<string, Binding | undefined>
): Bindings =>
  Object.fromEntries(
    Object.entries(bindings).filter(
      ([_, value]) => value !== undefined && !(value instanceof InheritedSecret)
    )
  ) as Bindings;

const app = await alchemy("rallycaststv", {
  stateStore: (scope) =>
    new CloudflareStateStore(scope, {
      forceUpdate: process.env.ALCHEMY_STATE_FORCE_UPDATE === "true",
    }),
});

const stage = app.stage === "ubuntu" ? "prod" : (app.stage ?? "dev");
const isProd = stage === "prod";
const observability = {
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
} as const;

const productionServerUrl = "https://api.rallycasts.com";
const productionWebUrl = "https://rallycasts.com";
const serverWorkerUrl = isProd
  ? productionServerUrl
  : `https://rallycasts-server-${stage}.rocktown-labs.workers.dev`;
const webWorkerUrl = isProd
  ? "https://rallycasts-web.rocktown-labs.workers.dev"
  : `https://rallycasts-web-${stage}.rocktown-labs.workers.dev`;

const db = await D1Database("database", {
  adopt: true,
  migrationsDir: "../../packages/db/src/migrations",
  name: isProd ? "rallycaststv-db" : `rallycaststv-db-${stage}`,
});
const searchIndex = await VectorizeIndex("search-index", {
  adopt: true,
  description: "RallyCasts semantic search index",
  dimensions: 768,
  metric: "cosine",
  name: isProd ? "rallycasts-search-v2" : `rallycasts-search-${stage}`,
});

const betterAuthSecret = requiredSecret("BETTER_AUTH_SECRET");
const betterAuthUrl = serverWorkerUrl;
const corsOrigin = isProd
  ? `${productionWebUrl},${webWorkerUrl}`
  : `${webWorkerUrl},http://localhost:3001,http://127.0.0.1:3001`;
const googleAiApiKey = requiredSecret("GOOGLE_GENERATIVE_AI_API_KEY");
const githubClientId = process.env.GITHUB_CLIENT_ID ?? "";
const githubClientSecret = optionalSecret("GITHUB_CLIENT_SECRET");
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = optionalSecret("GOOGLE_CLIENT_SECRET");
const googlePlacesApiKey = optionalSecret("GOOGLE_PLACES_API_KEY");
const radarSecretKey = optionalSecret("RADAR_SECRET_KEY");
const radarPublishableKey = process.env.VITE_RADAR_PUBLISHABLE_KEY ?? "";
const fourthwallStorefrontUrl =
  process.env.VITE_FOURTHWALL_STOREFRONT_URL ?? "";
const muxTokenSecret = optionalSecret("MUX_TOKEN_SECRET");
const muxTokenId = optionalSecret("MUX_TOKEN_ID");
const muxSigningKeyId = optionalSecret("MUX_SIGNING_KEY_ID");
const muxSigningKeySecret = optionalSecret("MUX_SIGNING_KEY_SECRET");
const muxWebhookSecret = optionalSecret("MUX_WEBHOOK_SECRET");
const e2eSeedToken = isProd ? undefined : optionalSecret("E2E_SEED_TOKEN");
const radarWebhookSecret = optionalSecret("RADAR_WEBHOOK_SECRET");
const r2AccessKeyId = optionalSecret("R2_ACCESS_KEY_ID");
const r2SecretAccessKey = optionalSecret("R2_SECRET_ACCESS_KEY");
const r2BucketName = optionalPlainEnv("R2_BUCKET_NAME");
const r2AccountId = optionalPlainEnv("R2_ACCOUNT_ID");
const r2PublicUrl = optionalPlainEnv("R2_PUBLIC_URL");
const resendApiKey = optionalSecret("RESEND_API_KEY");
const resendWebhookSecret = optionalSecret("RESEND_WEBHOOK_SECRET");
const stripeSecretKey = optionalSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = optionalSecret("STRIPE_WEBHOOK_SECRET");
const sentryDsn = optionalSecret("SENTRY_DSN");

const mediaBucket = r2BucketName
  ? await R2Bucket("media-v4", {
      adopt: true,
      domains: isProd ? ["media.rallycasts.com"] : undefined,
      name: r2BucketName,
    })
  : undefined;

const venuePresence = DurableObjectNamespace("venue-presence", {
  className: "VenuePresence",
  sqlite: true,
});
const eventCoordinator = DurableObjectNamespace("event-coordinator", {
  className: "EventCoordinator",
  sqlite: true,
});
const chatRooms = DurableObjectNamespace("chat-rooms", {
  className: "ChatRoom",
  sqlite: true,
});
const userNotifications = DurableObjectNamespace("user-notifications", {
  className: "UserNotifications",
  sqlite: true,
});

// stage is defined at the top

const geofenceDeadLetterQueue = await Queue("geofence-events-dlq", {
  adopt: true,
  name: `rallycasts-geofence-events-dlq-${stage}`,
});
const geofenceQueue = await Queue("geofence-events", {
  adopt: true,
  name: `rallycasts-geofence-events-${stage}`,
});
const eventActivityDeadLetterQueue = await Queue("event-activity-dlq", {
  adopt: true,
  name: `rallycasts-event-activity-dlq-${stage}`,
});
const eventActivityQueue = await Queue("event-activity", {
  adopt: true,
  name: `rallycasts-event-activity-${stage}`,
});

await Worker("rallycasts-geofence-events", {
  adopt: true,
  bindings: {
    DB: db,
    VENUE_PRESENCE: venuePresence,
  },
  compatibility: "node",
  cwd: "../../apps/server",
  entrypoint: "src/queues/geofence-events.ts",
  eventSources: [
    {
      queue: geofenceQueue,
      settings: {
        batchSize: 25,
        deadLetterQueue: geofenceDeadLetterQueue,
        maxConcurrency: 5,
        maxRetries: 5,
        maxWaitTimeMs: 5000,
        retryDelay: 60,
      },
    },
  ],
  name: `rallycasts-geofence-events-${stage}`,
  observability,
});

await Worker("rallycasts-event-activity", {
  adopt: true,
  bindings: {
    DB: db,
    EVENT_ACTIVITY_QUEUE: eventActivityQueue,
    EVENT_COORDINATOR: eventCoordinator,
  },
  compatibility: "node",
  cwd: "../../apps/server",
  entrypoint: "src/queues/event-activity.ts",
  eventSources: [
    {
      queue: eventActivityQueue,
      settings: {
        batchSize: 25,
        deadLetterQueue: eventActivityDeadLetterQueue,
        maxConcurrency: 5,
        maxRetries: 5,
        maxWaitTimeMs: 5000,
        retryDelay: 60,
      },
    },
  ],
  name: `rallycasts-event-activity-${stage}`,
  observability,
});

export const server = await Worker("rallycasts-server", {
  adopt: true,
  bindings: filterMissingBindings({
    BETTER_AUTH_SECRET: betterAuthSecret,
    BETTER_AUTH_URL: betterAuthUrl,
    CHAT_ROOMS: chatRooms,
    CORS_ORIGIN: corsOrigin,
    DB: db,
    E2E_SEED_TOKEN: e2eSeedToken,
    EVENT_ACTIVITY_QUEUE: eventActivityQueue,
    EVENT_COORDINATOR: eventCoordinator,
    GEOFENCE_EVENTS: geofenceQueue,
    GITHUB_CLIENT_ID: githubClientId,
    GITHUB_CLIENT_SECRET: githubClientSecret,
    GOOGLE_CLIENT_ID: googleClientId,
    GOOGLE_CLIENT_SECRET: googleClientSecret,
    GOOGLE_GENERATIVE_AI_API_KEY: googleAiApiKey,
    GOOGLE_PLACES_API_KEY: googlePlacesApiKey,
    MEDIA_BUCKET: mediaBucket,
    MUX_SIGNING_KEY_ID: muxSigningKeyId,
    MUX_SIGNING_KEY_SECRET: muxSigningKeySecret,
    MUX_TOKEN_ID: muxTokenId,
    MUX_TOKEN_SECRET: muxTokenSecret,
    MUX_WEBHOOK_SECRET: muxWebhookSecret,
    R2_ACCESS_KEY_ID: r2AccessKeyId,
    R2_ACCOUNT_ID: r2AccountId,
    R2_PUBLIC_URL: r2PublicUrl,
    R2_SECRET_ACCESS_KEY: r2SecretAccessKey,
    RADAR_SECRET_KEY: radarSecretKey,
    RADAR_WEBHOOK_SECRET: radarWebhookSecret,
    RESEND_API_KEY: resendApiKey,
    RESEND_WEBHOOK_SECRET: resendWebhookSecret,
    SEARCH_INDEX: searchIndex,
    SENTRY_DSN: sentryDsn,
    STRIPE_SECRET_KEY: stripeSecretKey,
    STRIPE_WEBHOOK_SECRET: stripeWebhookSecret,
    USER_NOTIFICATIONS: userNotifications,
    VENUE_PRESENCE: venuePresence,
  }),
  compatibility: "node",
  cwd: "../../apps/server",
  dev: {
    port: 3000,
  },
  entrypoint: "src/index.ts",
  name: isProd ? "rallycasts-server" : `rallycasts-server-${stage}`,
  observability,
  url: true,
});

export const web = await TanStackStart("rallycasts-web", {
  adopt: true,
  bindings: filterMissingBindings({
    BETTER_AUTH_SECRET: betterAuthSecret,
    BETTER_AUTH_URL: betterAuthUrl,
    CORS_ORIGIN: corsOrigin,
    DB: db,
    GITHUB_CLIENT_ID: githubClientId,
    GITHUB_CLIENT_SECRET: githubClientSecret,
    GOOGLE_CLIENT_ID: googleClientId,
    GOOGLE_CLIENT_SECRET: googleClientSecret,
    GOOGLE_GENERATIVE_AI_API_KEY: googleAiApiKey,
    GOOGLE_PLACES_API_KEY: googlePlacesApiKey,
    RADAR_SECRET_KEY: radarSecretKey,
    SENTRY_DSN: sentryDsn,
    VITE_FOURTHWALL_STOREFRONT_URL: fourthwallStorefrontUrl,
    VITE_RADAR_PUBLISHABLE_KEY: radarPublishableKey,
    VITE_SENTRY_DSN: sentryDsn,
    VITE_SERVER_URL: serverWorkerUrl,
  }),
  compatibility: "node",
  cwd: "../../apps/web",
  name: isProd ? "rallycasts-web" : `rallycasts-web-${stage}`,
  observability,
  url: true,
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

if (process.env.PULL_REQUEST) {
  // Add a comment to the PR with the preview URL
  await GitHubComment("preview-comment", {
    body: `## 🚀 Preview Deployed

Your changes have been deployed to a preview environment:

**Web:** ${web.url}
**Server:** ${server.url}

Built from commit ${process.env.GITHUB_SHA?.slice(0, 7)}

---
<sub>🤖 This comment updates automatically with each push.</sub>`,
    issueNumber: Number(process.env.PULL_REQUEST),
    owner: "Rocktown-Labs",
    repository: "rallycasts",
  });
}

await app.finalize();
