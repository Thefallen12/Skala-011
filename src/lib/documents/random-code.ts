import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";

type PublicCodeClient = Pick<
  Prisma.TransactionClient,
  | "purchaseOrder"
  | "deliveryOrder"
  | "blueprint"
  | "subkonContract"
  | "bASTDocument"
  | "$queryRaw"
>;

export function generateRandomCode(): string {
  return randomBytes(16).toString("hex");
}

export function isValidPublicCode(value: string): boolean {
  return /^(?:[a-f0-9]{10}|[a-f0-9]{32})$/.test(value);
}

export async function generateAvailablePublicCode(
  client: PublicCodeClient,
): Promise<string> {
  await client.$queryRaw<{ locked: boolean }[]>`
    WITH lock_acquired AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtext('public-order-code')::bigint)
    )
    SELECT true AS locked FROM lock_acquired
  `;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const publicCode = generateRandomCode();
    const [
      purchaseOrder,
      deliveryOrder,
      blueprint,
      subkonContract,
      bastDocument,
    ] = await Promise.all([
      client.purchaseOrder.findUnique({
        where: { publicCode },
        select: { id: true },
      }),
      client.deliveryOrder.findUnique({
        where: { publicCode },
        select: { id: true },
      }),
      client.blueprint.findUnique({
        where: { publicCode },
        select: { id: true },
      }),
      client.subkonContract.findUnique({
        where: { publicCode },
        select: { id: true },
      }),
      client.bASTDocument.findUnique({
        where: { publicCode },
        select: { id: true },
      }),
    ]);
    if (
      !purchaseOrder &&
      !deliveryOrder &&
      !blueprint &&
      !subkonContract &&
      !bastDocument
    ) {
      return publicCode;
    }
  }
  throw new Error("Kode URL unik tidak dapat dibuat setelah beberapa percobaan.");
}
