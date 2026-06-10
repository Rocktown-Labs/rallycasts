import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/server/.env",
});

export default defineConfig({
  dialect: "sqlite",
  driver: "d1-http",
  // DOCS: https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit
  out: "./src/migrations",
  schema: "./src/schema",
});
