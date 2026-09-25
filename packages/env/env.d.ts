import type { ServerEnv } from "@rallycaststv/infra/alchemy.run";

/* oxlint-disable typescript/no-empty-interface, typescript/no-empty-object-type */

// This file infers types for the cloudflare:workers environment from your Alchemy Worker.
// ServerEnv is an explicit interface in alchemy.run.ts (kept in sync with the
// server Worker's bindings) because the worker is declared inside the Stack
// effect, where the deployment stage is available.

export type CloudflareEnv = ServerEnv;

declare global {
  type Env = CloudflareEnv;
}

declare module "cloudflare:workers" {
  namespace Cloudflare {
    export interface Env extends CloudflareEnv {}
  }
}
