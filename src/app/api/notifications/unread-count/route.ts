import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { auth } from "../../../../../auth";
import { and, or } from "@prisma/orm-postgres/orm-client";
import { prisma8 } from "@/lib/prisma8";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }

  const role = session.user.role;
  const [unreadCount, notifications, executiveCount, logisticsCount, financeCount] =
    await Promise.all([
      prisma8.orm.public.Notification.where({
        userId: session.user.id,
        isRead: false,
      }).aggregate((aggregate) => ({ count: aggregate.count() })),
      prisma8.orm.public.Notification.select(
        "id",
        "title",
        "message",
        "type",
        "isRead",
        "actionUrl",
        "createdAt",
      )
        .where({ userId: session.user.id })
        .orderBy((notification) => notification.createdAt.desc())
        .limit(25)
        .all(),
      prisma8.orm.public.Notification.where((notification) =>
        and(
          notification.userId.eq(session.user.id),
          notification.isRead.eq(false),
          notification.actionUrl.like("/apps/approvals%"),
        ),
      ).aggregate((aggregate) => ({ count: aggregate.count() })),
      prisma8.orm.public.Notification.where((notification) =>
        and(
          notification.userId.eq(session.user.id),
          notification.isRead.eq(false),
          or(
            notification.actionUrl.like("/apps/logistics%"),
            ...(role === UserRole.LOGISTICS
              ? [notification.actionUrl.like("/d/%")]
              : []),
          ),
        ),
      ).aggregate((aggregate) => ({ count: aggregate.count() })),
      prisma8.orm.public.Notification.where((notification) =>
        and(
          notification.userId.eq(session.user.id),
          notification.isRead.eq(false),
          or(
            notification.actionUrl.like("/apps/finance%"),
            ...(role === UserRole.FINANCE
              ? [notification.actionUrl.like("/d/%")]
              : []),
          ),
        ),
      ).aggregate((aggregate) => ({ count: aggregate.count() })),
    ]);

  return NextResponse.json({
    unreadCount: unreadCount.count,
    notifications,
    sidebarCounts: {
      executive: executiveCount.count,
      logistics: logisticsCount.count,
      finance: financeCount.count,
    },
  });
}
