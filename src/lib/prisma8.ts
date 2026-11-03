import "server-only";
import contractJson from "@/generated/prisma8/contract.json" with { type: "json" };
import { contractFromJson } from "@prisma/orm-postgres/static";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "@/generated/prisma8/contract";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

export const contract = contractFromJson<Contract>(contractJson);

const createPrisma8 = () => postgres({ contract, url: connectionString });
type Prisma8Client = ReturnType<typeof createPrisma8>;

const globalForPrisma8 = globalThis as typeof globalThis & {
  prisma8?: Prisma8Client;
};

export const prisma8 = globalForPrisma8.prisma8 ?? createPrisma8();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma8.prisma8 = prisma8;
}
