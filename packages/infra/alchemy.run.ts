import alchemy from "alchemy";
import {
  Ai,
  D1Database,
  DurableObjectNamespace,
  Queue,
  R2Bucket,
  TanStackStart,
  VectorizeIndex,
  Worker,
} from "alchemy/cloudflare";
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

const app = await alchemy("rallycaststv", {
  stateStore: (scope) => new CloudflareStateStore(scope),
});

const stage = app.stage ?? "dev";
const isProd = stage === "prod";

const productionServerUrl = "https://api.rallycasts.com";
const productionWebUrl = "https://rallycasts.com";
const webWorkerUrl = isProd
  ? "https://rallycasts-web.rocktown-labs.workers.dev"
  : `https://rallycasts-web-${stage}.rocktown-labs.workers.dev`;

const db = await D1Database("database", {
  adopt: true,
  migrationsDir: "../../packages/db/src/migrations",
  name: isProd ? "rallycaststv-db" : `rallycaststv-db-${stage}`,
});
const ai = Ai();
const searchIndex = await VectorizeIndex("search-index", {
  adopt: true,
  description: "RallyCasts semantic search index",
  dimensions: 768,
  metric: "cosine",
  name: isProd ? "rallycasts-search" : `rallycasts-search-${stage}`,
});

const betterAuthSecret = required(
  alchemy.secret.env.BETTER_AUTH_SECRET,
  "BETTER_AUTH_SECRET"
);
const betterAuthUrl = productionServerUrl;
const corsOrigin = `${webWorkerUrl},${productionWebUrl}`;
const adminEmails = process.env.ADMIN_EMAILS ?? "camstewart7@gmail.com";
const rallycastsAdminEmail =
  process.env.RALLYCASTS_ADMIN_EMAIL ?? "camstewart7@gmail.com";
const googleAiApiKey = required(
  alchemy.secret.env.GOOGLE_GENERATIVE_AI_API_KEY,
  "GOOGLE_GENERATIVE_AI_API_KEY"
);
const githubClientId = process.env.GITHUB_CLIENT_ID ?? "";
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET ?? "";
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY ?? "";
const radarSecretKey = process.env.RADAR_SECRET_KEY ?? "";
const radarPublishableKey = process.env.VITE_RADAR_PUBLISHABLE_KEY ?? "";
const muxTokenSecret = process.env.MUX_TOKEN_SECRET ?? "";
const muxTokenId = process.env.MUX_TOKEN_ID ?? "";
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID ?? "";
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";
const r2BucketName = process.env.R2_BUCKET_NAME ?? "rallycasts-media";
const r2AccountId = process.env.R2_ACCOUNT_ID ?? "";
const r2PublicUrl = process.env.R2_PUBLIC_URL ?? "https://media.rallycasts.com";
const resendApiKey = process.env.RESEND_API_KEY ?? "";
const resendWebhookSecret = process.env.RESEND_WEBHOOK_SECRET ?? "";

const mediaBucket = await R2Bucket("media", {
  adopt: true,
  name: r2BucketName,
});

const venuePresence = DurableObjectNamespace("venue-presence", {
  className: "VenuePresence",
  sqlite: true,
});
const eventCoordinator = DurableObjectNamespace("event-coordinator", {
  className: "EventCoordinator",
  sqlite: true,
});

// stage is defined at the top

const geofenceQueue = await Queue("geofence-events", {
  adopt: true,
  name: `rallycasts-geofence-events-${stage}`,
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
  eventSources: [{ queue: geofenceQueue }],
  name: `rallycasts-geofence-events-${stage}`,
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
  eventSources: [{ queue: eventActivityQueue }],
  name: `rallycasts-event-activity-${stage}`,
});

export const server = await Worker("rallycasts-server", {
  adopt: true,
  bindings: {
    ADMIN_EMAILS: adminEmails,
    AI: ai,
    BETTER_AUTH_SECRET: betterAuthSecret,
    BETTER_AUTH_URL: betterAuthUrl,
    CORS_ORIGIN: corsOrigin,
    DB: db,
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
    MUX_TOKEN_ID: muxTokenId,
    MUX_TOKEN_SECRET: muxTokenSecret,
    R2_ACCESS_KEY_ID: r2AccessKeyId,
    R2_ACCOUNT_ID: r2AccountId,
    R2_PUBLIC_URL: r2PublicUrl,
    R2_SECRET_ACCESS_KEY: r2SecretAccessKey,
    RADAR_SECRET_KEY: radarSecretKey,
    RALLYCASTS_ADMIN_EMAIL: rallycastsAdminEmail,
    RESEND_API_KEY: resendApiKey,
    RESEND_WEBHOOK_SECRET: resendWebhookSecret,
    SEARCH_INDEX: searchIndex,
    VENUE_PRESENCE: venuePresence,
  },
  compatibility: "node",
  cwd: "../../apps/server",
  dev: {
    port: 3000,
  },
  domains: isProd ? ["api.rallycasts.com"] : undefined,
  entrypoint: "src/index.ts",
  name: isProd ? "rallycasts-server" : `rallycasts-server-${stage}`,
  url: true,
});

export const web = await TanStackStart("rallycasts-web", {
  adopt: true,
  bindings: {
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
    VITE_RADAR_PUBLISHABLE_KEY: radarPublishableKey,
    VITE_SERVER_URL: productionServerUrl,
  },
  cwd: "../../apps/web",
  domains: isProd ? ["rallycasts.com"] : undefined,
  name: isProd ? "rallycasts-web" : `rallycasts-web-${stage}`,
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
    owner: "RocktownLabs",
    repository: "rallycaststv",
  });
}

await app.finalize();
