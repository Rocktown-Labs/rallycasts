import fs from "node:fs";
import { URL, fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/server/.env",
});

function getLocalD1Path(): string | undefined {
  try {
    const d1Dir = fileURLToPath(
      new URL(
        "../../.alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject",
        import.meta.url
      )
    );
    if (fs.existsSync(d1Dir)) {
      const files = fs.readdirSync(d1Dir);
      const sqliteFile = files.find(
        (f) => f.endsWith(".sqlite") && f !== "metadata.sqlite"
      );
      if (sqliteFile) {
        return fileURLToPath(
          new URL(
            `../../.alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject/${sqliteFile}`,
            import.meta.url
          )
        );
      }
    }
  } catch {
    // Ignore error and fall back
  }
  return undefined;
}

const localDbPath = getLocalD1Path();

const config = localDbPath
  ? {
      dbCredentials: {
        url: localDbPath,
      },
      dialect: "sqlite" as const,
    }
  : {
      dbCredentials: {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
        databaseId: process.env.CLOUDFLARE_DATABASE_ID || "",
        token: process.env.CLOUDFLARE_API_TOKEN || "",
      },
      dialect: "sqlite" as const,
      driver: "d1-http" as const,
    };

export default defineConfig({
  ...config,
  // DOCS: https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit
  out: "./src/migrations",
  schema: "./src/schema",
});
