import alchemy from "alchemy";
import { D1Database, Queue, TanStackStart, Worker } from "alchemy/cloudflare";
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

const stage = process.env.STAGE || "prod";
const isProd = stage === "prod";
const serverWorkerUrl = isProd
  ? "https://rallycasts-server.rocktown-labs.workers.dev"
  : `https://rallycasts-server-${stage}.rocktown-labs.workers.dev`;
const webWorkerUrl = isProd
  ? "https://rallycasts-web.rocktown-labs.workers.dev"
  : `https://rallycasts-web-${stage}.rocktown-labs.workers.dev`;

const db = await D1Database("database", {
  migrationsDir: "../../packages/db/src/migrations",
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
const googlePlacesApiKey = alchemy.secret.env.GOOGLE_PLACES_API_KEY ?? "";
const radarSecretKey = alchemy.secret.env.RADAR_SECRET_KEY ?? "";
const radarPublishableKey = alchemy.secret.env.VITE_RADAR_PUBLISHABLE_KEY ?? "";

const geofenceQueue = await Queue("geofence-events", {
  consumer: {
    cwd: "../../apps/server",
    entrypoint: "src/queues/geofence-events.ts",
    type: "worker",
  },
});

export const server = await Worker("rallycasts-server", {
  bindings: {
    BETTER_AUTH_SECRET: betterAuthSecret,
    BETTER_AUTH_URL: betterAuthUrl,
    CORS_ORIGIN: corsOrigin,
    DB: db,
    GEOFENCE_EVENTS: geofenceQueue,
    GOOGLE_GENERATIVE_AI_API_KEY: googleAiApiKey,
    GOOGLE_PLACES_API_KEY: googlePlacesApiKey,
    RADAR_SECRET_KEY: radarSecretKey,
  },
  compatibility: "node",
  cwd: "../../apps/server",
  dev: {
    port: 3000,
  },
  durableObjects: {
    VenuePresence: {
      className: "VenuePresence",
      scriptPath: "src/durable-objects/venue-presence.ts",
    },
  },
  entrypoint: "src/index.ts",
  name: "rallycasts-server",
  url: true,
});

export const web = await TanStackStart("rallycasts-web", {
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
console.log(`Stage  -> ${stage}`);

if (process.env.PULL_REQUEST) {
  // Add a comment to the PR with the preview URL
  await GitHubComment("preview-comment", {
    body: `## 🚀 Preview Deployed

Your changes have been deployed to a preview environment:

**Stage:** ${stage}
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
