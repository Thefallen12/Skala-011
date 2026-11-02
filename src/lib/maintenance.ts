import { prisma } from "@/lib/prisma";
import { MAINTENANCE_PAGES } from "@/lib/config/maintenance-pages";

export async function getEnabledMaintenancePageKeys() {
  const records = await prisma.pageMaintenance.findMany({
    where: { isUnderMaintenance: true },
    select: { pageKey: true },
  });

  return records.map((record) => record.pageKey);
}

export async function getPageMaintenanceSettings() {
  const records = await prisma.pageMaintenance.findMany({
    select: { pageKey: true, isUnderMaintenance: true },
  });
  const enabledKeys = new Set(
    records
      .filter((record) => record.isUnderMaintenance)
      .map((record) => record.pageKey),
  );

  return MAINTENANCE_PAGES.map((page) => ({
    ...page,
    isUnderMaintenance: enabledKeys.has(page.key),
  }));
}
