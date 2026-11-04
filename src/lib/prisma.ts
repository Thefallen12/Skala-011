import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

function normalizePostgresSslMode(value: string): string {
  const url = new URL(value);
  const legacyModes = new Set(["prefer", "require", "verify-ca"]);

  for (const [key, mode] of url.searchParams) {
    if (key.toLowerCase() === "sslmode" && legacyModes.has(mode.toLowerCase())) {
      url.searchParams.set(key, "verify-full");
    }
  }

  return url.toString();
}

const normalizedConnectionString = normalizePostgresSslMode(connectionString);

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(
      {
        connectionString: normalizedConnectionString,
        max: 3,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 10_000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 5_000,
        maxLifetimeSeconds: 300,
      },
      {
        onPoolError: (error) => {
          console.error("PostgreSQL connection pool error:", error);
        },
      },
    ),
  });

globalForPrisma.prisma = prisma;
