import { fileURLToPath } from "node:url";

import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const cloudflareWorkersShimPath = fileURLToPath(
  new URL("../../packages/env/src/cloudflare-local.ts", import.meta.url)
);
// Local `vite dev` / `vite build` runs outside a Worker, so
// `cloudflare:workers` resolves to a process.env-backed shim. Deployed
// builds get real bindings from Alchemy (v2 appends its own Cloudflare
// Vite plugin at deploy time and is incompatible with
// `@cloudflare/vite-plugin`, which must stay uninstalled).
const cloudflareWorkersAlias: Record<string, string> = {
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
  plugins: [tailwindcss(), tanstackStart(), ...sentryBuildPlugins, viteReact()],
  resolve: {
    alias: cloudflareWorkersAlias,
    tsconfigPaths: true,
  },
  server: {
    port: 3001,
  },
});
