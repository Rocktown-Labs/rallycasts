import type { D1Migration } from "cloudflare:test";

declare module "vitest" {
  export interface ProvidedContext {
    d1Migrations: D1Migration[];
  }
}
