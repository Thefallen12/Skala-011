import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }

  const role = session.user.role;
  const [unreadCount, notifications, executiveCount, logisticsCount, financeCount] =
    await Promise.all([
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          isRead: true,
          actionUrl: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isRead: false,
          actionUrl: { startsWith: "/apps/approvals" },
        },
      }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isRead: false,
          OR: [
            { actionUrl: { startsWith: "/apps/logistics" } },
            ...(role === UserRole.LOGISTICS
              ? [{ actionUrl: { startsWith: "/d/" } }]
              : []),
          ],
        },
      }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isRead: false,
          OR: [
            { actionUrl: { startsWith: "/apps/finance" } },
            ...(role === UserRole.FINANCE
              ? [{ actionUrl: { startsWith: "/d/" } }]
              : []),
          ],
        },
      }),
    ]);

  return NextResponse.json({
    unreadCount,
    notifications: notifications.map((notification) => ({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    })),
    sidebarCounts: {
      executive: executiveCount,
      logistics: logisticsCount,
      finance: financeCount,
    },
  });
}
