import alchemy from "alchemy";
import { D1Database, TanStackStart, Worker } from "alchemy/cloudflare";
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

const app = await alchemy("rallycaststv");
const serverWorkerUrl = "https://rallycasts-server.rocktown-labs.workers.dev";
const webWorkerUrl = "https://rallycasts-web.rocktown-labs.workers.dev";

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

export const server = await Worker("rallycasts-server", {
  bindings: {
    BETTER_AUTH_SECRET: betterAuthSecret,
    BETTER_AUTH_URL: betterAuthUrl,
    CORS_ORIGIN: corsOrigin,
    DB: db,
    GOOGLE_GENERATIVE_AI_API_KEY: googleAiApiKey,
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
  bindings: {
    BETTER_AUTH_SECRET: betterAuthSecret,
    BETTER_AUTH_URL: betterAuthUrl,
    CORS_ORIGIN: corsOrigin,
    DB: db,
    GOOGLE_GENERATIVE_AI_API_KEY: googleAiApiKey,
    VITE_SERVER_URL: required(server.url, "server.url"),
  },
  cwd: "../../apps/web",
  name: "rallycasts-web",
  url: true,
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
