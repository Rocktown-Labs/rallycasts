import { applyD1Migrations, reset } from "cloudflare:test";
import type { D1Migration } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach, inject } from "vitest";

const migrations = inject("d1Migrations") as D1Migration[];

beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.DB, migrations);
});
