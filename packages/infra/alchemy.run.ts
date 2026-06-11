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

const serverWorkerUrl = "https://rallycasts-server.rocktown-labs.workers.dev";
const webWorkerUrl = "https://rallycasts-web.rocktown-labs.workers.dev";

const db = await D1Database("database", {
  adopt: true,
  migrationsDir: "../../packages/db/src/migrations",
  name: "rallycaststv-db",
});
const ai = Ai();
const searchIndex = await VectorizeIndex("search-index", {
  adopt: true,
  description: "RallyCasts semantic search index",
  dimensions: 768,
  metric: "cosine",
  name: "rallycasts-search",
});

const betterAuthSecret = required(
  alchemy.secret.env.BETTER_AUTH_SECRET,
  "BETTER_AUTH_SECRET"
);
const betterAuthUrl = serverWorkerUrl;
const corsOrigin = webWorkerUrl;
const googleAiApiKey = required(
  alchemy.secret.env.GOOGLE_GENERATIVE_AI_API_KEY,
  "GOOGLE_GENERATIVE_AI_API_KEY"
);
const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY ?? "";
const radarSecretKey = process.env.RADAR_SECRET_KEY ?? "";
const radarPublishableKey = process.env.VITE_RADAR_PUBLISHABLE_KEY ?? "";
const muxTokenSecret = process.env.MUX_TOKEN_SECRET ?? "";
const muxTokenId = process.env.MUX_TOKEN_ID ?? "";
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID ?? "";
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";
const r2BucketName = process.env.R2_BUCKET_NAME ?? "rallycasts-media";
const r2AccountId = process.env.R2_ACCOUNT_ID ?? "";
const r2PublicUrl = process.env.R2_PUBLIC_URL ?? "";

const mediaBucket = await R2Bucket("media", {
  adopt: true,
  name: r2BucketName,
});

const venuePresence = DurableObjectNamespace("venue-presence", {
  className: "VenuePresence",
  sqlite: true,
});

const geofenceQueue = await Queue("geofence-events", {
  adopt: true,
  name: "rallycasts-geofence-events",
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
  name: "rallycasts-geofence-events",
});

export const server = await Worker("rallycasts-server", {
  adopt: true,
  bindings: {
    AI: ai,
    BETTER_AUTH_SECRET: betterAuthSecret,
    BETTER_AUTH_URL: betterAuthUrl,
    CORS_ORIGIN: corsOrigin,
    DB: db,
    GEOFENCE_EVENTS: geofenceQueue,
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
    SEARCH_INDEX: searchIndex,
    VENUE_PRESENCE: venuePresence,
  },
  compatibility: "node",
  cwd: "../../apps/server",
  dev: {
    port: 3000,
  },
  entrypoint: "src/index.ts",
  name: "rallycasts-server",
  url: true,
});

export const web = await TanStackStart("rallycasts-web", {
  adopt: true,
  bindings: {
    BETTER_AUTH_SECRET: betterAuthSecret,
    BETTER_AUTH_URL: betterAuthUrl,
    CORS_ORIGIN: corsOrigin,
    DB: db,
    GOOGLE_GENERATIVE_AI_API_KEY: googleAiApiKey,
    GOOGLE_PLACES_API_KEY: googlePlacesApiKey,
    RADAR_SECRET_KEY: radarSecretKey,
    VITE_RADAR_PUBLISHABLE_KEY: radarPublishableKey,
    VITE_SERVER_URL: required(server.url, "server.url"),
  },
  cwd: "../../apps/web",
  name: "rallycasts-web",
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
