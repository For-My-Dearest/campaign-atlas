import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "prisma/seed.ts" },
  datasource: {
    url: "file:./dev.db",
  },
});