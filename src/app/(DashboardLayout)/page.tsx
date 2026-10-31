import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { prisma } from "@/lib/prisma";
import { getJakartaDateKey, getJakartaDayRange, shiftDateKey } from "@/lib/habit-date";
import { ProjectStatus, TicketStatus } from "@/generated/prisma/enums";
import ProfileWelcome from "../components/dashboard/ProfileWelcome";
import { TopCards } from "../components/dashboard/TopCards";
import SalesOverview from "../components/dashboard/SalesOverview";
import { YearlyBreakup } from "../components/dashboard/YearlyBreakup";
import { MonthlyEarning } from "../components/dashboard/MonthlyEarning";
import { RecentTransaction } from "../components/dashboard/RecentTransaction";
import { ProductPerformance } from "../components/dashboard/ProductPerformance";
import { Footer } from "../components/dashboard/Footer";

export const metadata: Metadata = {
  title: "Beranda",
};

const projectStatusLabels: Record<ProjectStatus, string> = {
  [ProjectStatus.PENDING_SETUP]: "PENDING SETUP",
  [ProjectStatus.RUNNING]: "Berjalan",
  [ProjectStatus.PENDING]: "PENDING SETUP",
  [ProjectStatus.ON_PROGRESS]: "RUNNING",
  [ProjectStatus.TERHAMBAT]: "Terhambat",
  [ProjectStatus.DONE]: "Selesai",
  [ProjectStatus.PLANNED]: "PENDING SETUP",
  [ProjectStatus.ACTIVE]: "RUNNING",
  [ProjectStatus.ON_HOLD]: "Ditunda",
  [ProjectStatus.COMPLETED]: "Selesai",
};

const ticketStatusLabels: Record<TicketStatus, string> = {
  [TicketStatus.DRAFT]: "Draf",
  [TicketStatus.PENDING_DIRECTOR]: "Menunggu persetujuan",
  [TicketStatus.APPROVED_DIR]: "Disetujui",
  [TicketStatus.PROCESSED_FINANCE]: "Diproses keuangan",
  [TicketStatus.PROCESSED_LOGISTIC]: "Diproses logistik",
  [TicketStatus.ASSIGNED_TO_MOVER]: "Dalam pengiriman",
  [TicketStatus.IN_TRANSIT]: "Dalam perjalanan (ekspedisi)",
  [TicketStatus.WAITING_FINANCE_PAYMENT]: "Menunggu pembayaran",
  [TicketStatus.COMPLETED]: "Selesai",
  [TicketStatus.REJECTED]: "Ditolak",
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const monthFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  month: "short",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const todayKey = getJakartaDateKey();
  const today = getJakartaDayRange(todayKey);
  const tomorrow = getJakartaDayRange(shiftDateKey(todayKey, 1));
  const year = Number(todayKey.slice(0, 4));
  const yearStart = new Date(`${year}-01-01T00:00:00+07:00`);
  const nextYearStart = new Date(`${year + 1}-01-01T00:00:00+07:00`);
  const monthStart = new Date(`${todayKey.slice(0, 7)}-01T00:00:00+07:00`);
  const nextMonthKey = new Date(
    Date.UTC(year, Number(todayKey.slice(5, 7)), 1),
  )
    .toISOString()
    .slice(0, 10);
  const nextMonthStart = new Date(`${nextMonthKey}T00:00:00+07:00`);
  const monthStartDate = new Date(`${todayKey.slice(0, 7)}-01T00:00:00.000Z`);
  const nextMonthDate = new Date(`${nextMonthKey}T00:00:00.000Z`);
  const tomorrowDate = new Date(`${shiftDateKey(todayKey, 1)}T00:00:00.000Z`);
  const weekStartKey = shiftDateKey(todayKey, -6);
  const weekStart = new Date(`${weekStartKey}T00:00:00.000Z`);

  const [
    user,
    projectCount,
    projectsByStatus,
    recentProjects,
    ticketCountByStatus,
    recentTickets,
    activeTaskCount,
    monthlyStockMovements,
    timesheetTotal,
    timesheetByDay,
    monthlyActivity,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, role: true, profilePhotoUrl: true },
    }),
    prisma.project.count(),
    prisma.project.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        priority: true,
        progress: true,
        budget: true,
        fieldPic: { select: { name: true } },
      },
    }),
    prisma.ticket.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        type: true,
        createdAt: true,
        totalAmount: true,
      },
    }),
    prisma.workTask.count({
      where: {
        status: { not: "DONE" },
        startsAt: { lt: tomorrow.start },
        endsAt: { gte: today.start },
        OR: [
          { assigneeId: session.user.id },
          { creatorId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    }),
    prisma.stockMovement.count({
      where: {
        occurredAt: { gte: monthStart, lt: nextMonthStart },
      },
    }),
    prisma.timesheetEntry.aggregate({
      where: { workDate: { gte: monthStartDate, lt: nextMonthDate } },
      _sum: { durationMinutes: true },
    }),
    prisma.timesheetEntry.groupBy({
      by: ["workDate"],
      where: { workDate: { gte: weekStart, lt: tomorrowDate } },
      _sum: { durationMinutes: true },
    }),
    prisma.$queryRaw<{ category: string; month: number; count: number }[]>`
      SELECT 'project' AS category,
        EXTRACT(MONTH FROM ("createdAt" AT TIME ZONE 'Asia/Jakarta'))::int AS month,
        COUNT(*)::int AS count
      FROM "Project"
      WHERE "createdAt" >= ${yearStart} AND "createdAt" < ${nextYearStart}
      GROUP BY month
      UNION ALL
      SELECT 'ticket' AS category,
        EXTRACT(MONTH FROM ("createdAt" AT TIME ZONE 'Asia/Jakarta'))::int AS month,
        COUNT(*)::int AS count
      FROM "Ticket"
      WHERE "createdAt" >= ${yearStart} AND "createdAt" < ${nextYearStart}
      GROUP BY month
    `,
  ]);

  if (!user) redirect("/auth/login");

  const projectCounts = new Map(
    projectsByStatus.map((entry) => [entry.status, entry._count._all]),
  );
  const ticketCounts = new Map(
    ticketCountByStatus.map((entry) => [entry.status, entry._count._all]),
  );
  const activeTickets = ticketCountByStatus
    .filter(
      ({ status }) =>
        status !== TicketStatus.DRAFT &&
        status !== TicketStatus.COMPLETED &&
        status !== TicketStatus.REJECTED,
    )
    .reduce((total, entry) => total + entry._count._all, 0);
  const monthlyProjectCounts = Array(12).fill(0) as number[];
  const monthlyTicketCounts = Array(12).fill(0) as number[];
  for (const item of monthlyActivity) {
    const target =
      item.category === "project" ? monthlyProjectCounts : monthlyTicketCounts;
    target[item.month - 1] = item.count;
  }

  const days = Array.from({ length: 7 }, (_, index) =>
    shiftDateKey(weekStartKey, index),
  );
  const hoursByDay = days.map((dayKey) => {
    const totalMinutes = timesheetByDay
      .filter(
        (entry) => entry.workDate.toISOString().slice(0, 10) === dayKey,
      )
      .reduce((total, entry) => total + (entry._sum.durationMinutes ?? 0), 0);
    return Math.round((totalMinutes / 60) * 10) / 10;
  });

  const cards = [
    {
      title: "Total Proyek",
      value: String(projectCount),
      image: "/images/svgs/icon-briefcase.svg",
      href: "/apps/projects",
      color: "info",
    },
    {
      title: "Proyek Berjalan",
      value: String(
        (projectCounts.get(ProjectStatus.RUNNING) ?? 0) +
          (projectCounts.get(ProjectStatus.ON_PROGRESS) ?? 0) +
          (projectCounts.get(ProjectStatus.ACTIVE) ?? 0),
      ),
      image: "/images/svgs/icon-tasks.svg",
      href: "/apps/projects",
      color: "success",
    },
    {
      title: "Tugas Saya Hari Ini",
      value: String(activeTaskCount),
      image: "/images/svgs/icon-tasks.svg",
      href: `/apps/habits?tab=tasks&date=${todayKey}`,
      color: "primary",
    },
    {
      title: "Tiket Aktif",
      value: String(activeTickets),
      image: "/images/svgs/icon-mailbox.svg",
      href: "/apps/tickets",
      color: "warning",
    },
    {
      title: "Mutasi Stok Bulan Ini",
      value: String(monthlyStockMovements),
      image: "/images/svgs/icon-inbox.svg",
      href: "/apps/projects",
      color: "secondary",
    },
    {
      title: "Jam Timesheet Bulan Ini",
      value: `${Math.round((timesheetTotal._sum.durationMinutes ?? 0) / 6) / 10} jam`,
      image: "/images/svgs/icon-office-bag.svg",
      href: "/apps/habits?tab=timesheet",
      color: "error",
    },
  ] as const;

  const totalProjectProgress =
    recentProjects.length > 0
      ? Math.round(
          recentProjects.reduce((sum, project) => sum + project.progress, 0) /
            recentProjects.length,
        )
      : 0;
  const completedProjects =
    (projectCounts.get(ProjectStatus.DONE) ?? 0) +
    (projectCounts.get(ProjectStatus.COMPLETED) ?? 0);

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <ProfileWelcome
          name={user.name}
          role={user.role}
          profilePhotoUrl={user.profilePhotoUrl}
        />
      </div>
      <div className="col-span-12">
        <TopCards cards={cards} />
      </div>
      <div className="col-span-12 lg:col-span-8">
        <SalesOverview
          year={year}
          projectCounts={monthlyProjectCounts}
          ticketCounts={monthlyTicketCounts}
        />
      </div>
      <div className="col-span-12 lg:col-span-4">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <YearlyBreakup
              total={projectCount}
              completed={completedProjects}
              running={
                (projectCounts.get(ProjectStatus.RUNNING) ?? 0) +
                (projectCounts.get(ProjectStatus.ON_PROGRESS) ?? 0) +
                (projectCounts.get(ProjectStatus.ACTIVE) ?? 0)
              }
              other={Math.max(
                projectCount -
                  completedProjects -
                  (projectCounts.get(ProjectStatus.RUNNING) ?? 0) -
                  (projectCounts.get(ProjectStatus.ON_PROGRESS) ?? 0) -
                  (projectCounts.get(ProjectStatus.ACTIVE) ?? 0),
                0,
              )}
            />
          </div>
          <div className="col-span-12">
            <MonthlyEarning
              hours={Math.round(
                (timesheetTotal._sum.durationMinutes ?? 0) / 6,
              ) / 10}
              dayLabels={days.map((dayKey) =>
                new Intl.DateTimeFormat("id-ID", {
                  timeZone: "Asia/Jakarta",
                  weekday: "short",
                }).format(new Date(`${dayKey}T12:00:00+07:00`)),
              )}
              hoursByDay={hoursByDay}
            />
          </div>
        </div>
      </div>
      <div className="col-span-12 lg:col-span-4">
        <RecentTransaction
          tickets={recentTickets.map((ticket) => ({
            ...ticket,
            createdAt: dateTimeFormatter.format(ticket.createdAt),
            totalAmount: ticket.totalAmount
              ? rupiah.format(Number(ticket.totalAmount))
              : "—",
            statusLabel: ticketStatusLabels[ticket.status],
          }))}
        />
      </div>
      <div className="col-span-12 flex lg:col-span-8">
        <ProductPerformance
          projects={recentProjects.map((project) => ({
            ...project,
            statusLabel: projectStatusLabels[project.status],
            budget: project.budget ? rupiah.format(Number(project.budget)) : "—",
          }))}
          averageProgress={totalProjectProgress}
        />
      </div>
      <div className="col-span-12">
        <Footer />
      </div>
    </div>
  );
}
