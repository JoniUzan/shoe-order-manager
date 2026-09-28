// Prisma CLI config (migrate, studio, db seed, generate). Prisma 7 no longer
// reads `.env` on its own, so load it here.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  // A folder: the multi-file schema (generator + datasource in
  // prisma/schema.prisma, models in prisma/models/*.prisma). Migrations must sit
  // next to schema.prisma.
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The CLI talks to the database directly (on Supabase, the session pooler
    // on port 5432): migrations can't run through a transaction-mode pooler.
    // The app itself uses DATABASE_URL, see src/client.ts.
    // Not `env("DIRECT_URL")`: that throws when unset, and `prisma generate`
    // (run by `pnpm build`) must work where no database URL is configured.
    url: process.env.DIRECT_URL ?? "",
  },
});
