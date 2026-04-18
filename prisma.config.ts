import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Mirror Next.js env-loading order: .env first, then .env.local overrides.
// Prevents Prisma migrations from accidentally hitting production when a
// developer has a local Supabase configured via .env.local.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DIRECT_URL is the URL of the direct connection to the database
    url: env("DIRECT_URL"),
  },
});
