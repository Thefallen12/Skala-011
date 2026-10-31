import type { Prisma } from "@/generated/prisma/client";

export async function lockTicketDeliveryOrderCreation(
  transaction: Prisma.TransactionClient,
) {
  await transaction.$queryRaw<{ locked: boolean }[]>`
    WITH reservation_lock AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtext('warehouse-stock-reservation')::bigint)
    )
    SELECT TRUE AS locked FROM reservation_lock
  `;
}
