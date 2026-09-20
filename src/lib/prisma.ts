import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient() {
  const adapter = new PrismaLibSql({ url: "file:./dev.db" });
  return new PrismaClient({ adapter });
}

export const prisma =
  globalForPrisma.prisma ??
  (globalForPrisma.prisma = makeClient());