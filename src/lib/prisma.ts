import { PrismaClient } from "@prisma/client";

/**
 * PrismaClient singleton instance to prevent multiple client instances
 * during development hot reloads in Next.js.
 * 
 * @see https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-prisma-client-initializing
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

