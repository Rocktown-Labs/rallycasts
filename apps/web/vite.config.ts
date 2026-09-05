import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import alchemy from "alchemy/cloudflare/tanstack-start";
import { defineConfig } from "vite";

const alchemyConfigPath = fileURLToPath(
  new URL(".alchemy/local/wrangler.jsonc", import.meta.url)
);
const shouldUseAlchemy = existsSync(alchemyConfigPath);
const cloudflareWorkersShimPath = fileURLToPath(
  new URL("../../packages/env/src/cloudflare-local.ts", import.meta.url)
);
const cloudflareWorkersAlias: Record<string, string> = shouldUseAlchemy
  ? {}
  : {
      "cloudflare:workers": cloudflareWorkersShimPath,
    };
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryRelease = process.env.GITHUB_SHA;
const sentryBuildPlugins = sentryAuthToken
  ? sentryTanstackStart({
      authToken: sentryAuthToken,
      org: "rocktown-labs-tq",
      project: "rallycasts-web",
      release: sentryRelease
        ? {
            create: true,
            finalize: true,
            inject: true,
            name: sentryRelease,
          }
        : undefined,
      sourcemaps: {
        filesToDeleteAfterUpload: ["**/*.map"],
      },
      telemetry: false,
    })
  : [];

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart(),
    ...sentryBuildPlugins,
    viteReact(),
    ...(shouldUseAlchemy ? [alchemy({ configPath: alchemyConfigPath })] : []),
  ],
  resolve: {
    alias: cloudflareWorkersAlias,
    tsconfigPaths: true,
  },
  server: {
    port: 3001,
  },
});
