"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ApexOptions } from "apexcharts";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowLeft, ArrowRight, Ellipsis } from "lucide-react";
import { getWeekDateKeys } from "@/lib/habit-date";
import CardBox from "@/app/components/shared/CardBox";
import { Button } from "@/components/ui/button";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Entry = { workDate: string; durationMinutes: number; projectId: string };

function datesForWeek(start: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${start}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export default function WeeklySummary({
  weekStart,
  previousStart,
  nextWeekStart,
  today,
  memberId,
  team,
  projectId,
  entries,
  previousEntries,
}: {
  weekStart: string;
  previousStart: string;
  nextWeekStart: string;
  today: string;
  memberId: string;
  team: string;
  projectId: string;
  entries: Entry[];
  previousEntries: Entry[];
}) {
  const dates = datesForWeek(weekStart);
  const previousDates = datesForWeek(previousStart);
  const dailyHours = dates.map(
    (date) =>
      Number(
        (
          entries
            .filter((entry) => entry.workDate === date)
            .reduce((total, entry) => total + entry.durationMinutes, 0) / 60
        ).toFixed(1),
      ),
  );
  const currentProjects = new Set(entries.map((entry) => entry.projectId)).size;
  const previousProjects = new Set(previousEntries.map((entry) => entry.projectId)).size;
  const projectChange =
    previousProjects > 0
      ? Math.round(((currentProjects - previousProjects) / previousProjects) * 100)
      : null;
  const dailyProjects = dates.map(
    (date) =>
      new Set(
        entries
          .filter((entry) => entry.workDate === date)
          .map((entry) => entry.projectId),
      ).size,
  );
  const previousDailyProjects = previousDates.map(
    (date) =>
      new Set(
        previousEntries
          .filter((entry) => entry.workDate === date)
          .map((entry) => entry.projectId),
      ).size,
  );
  const barOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit", foreColor: "#8a98a8" },
    colors: ["#25313b"],
    plotOptions: { bar: { columnWidth: "38%", borderRadius: 2, distributed: true } },
    dataLabels: { enabled: false },
    grid: { show: false },
    xaxis: {
      categories: dates.map((date) => format(new Date(`${date}T12:00:00`), "EEE", { locale: id })),
      labels: { style: { fontSize: "9px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: false },
    legend: { show: false },
    tooltip: { y: { formatter: (value) => `${value} jam` } },
  };
  const trendOptions: ApexOptions = {
    chart: { type: "line", toolbar: { show: false }, sparkline: { enabled: true }, fontFamily: "inherit" },
    colors: ["#102a4d", "#e67e22"],
    stroke: { curve: "smooth", width: [2, 1], dashArray: [0, 4] },
    markers: { size: 0 },
    dataLabels: { enabled: false },
    tooltip: { enabled: false },
    yaxis: { show: false },
    xaxis: { categories: dates.map((date) => format(new Date(`${date}T12:00:00`), "d MMM", { locale: id })) },
    legend: { show: false },
  };
  const queryFor = (date: string, timeframe?: number) => {
    const query = new URLSearchParams({
      tab: "timesheet",
      date,
      memberId,
      team,
      projectId,
    });
    if (timeframe) query.set("timeframe", String(timeframe));
    return query.toString();
  };
  const navigate = (date: string) =>
    `/apps/habits?${queryFor(date)}`;
  const isCurrentWeek = weekStart === getWeekDateKeys(today)[0];

  return (
    <div className="my-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Weekly summary</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Ringkasan jam kerja dan proyek untuk periode minggu yang sama di Timesheet.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button asChild variant="outline" size="icon" className="size-8" aria-label="Minggu sebelumnya">
            <Link href={navigate(previousStart)} scroll={false}><ArrowLeft className="size-3.5" /></Link>
          </Button>
          <span className="min-w-32 text-center text-[10px] text-muted-foreground">
            {format(new Date(`${weekStart}T12:00:00`), "d MMM", { locale: id })} –{" "}
            {format(new Date(`${dates[6]}T12:00:00`), "d MMM yyyy", { locale: id })}
          </span>
          <Button asChild variant="outline" size="icon" className="size-8" aria-label="Minggu berikutnya">
            <Link href={navigate(nextWeekStart)} scroll={false}><ArrowRight className="size-3.5" /></Link>
          </Button>
          {!isCurrentWeek && (
            <Button asChild variant="outline" size="sm" className="h-8 px-2 text-[10px]">
              <Link href={navigate(today)} scroll={false}>Minggu ini</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
        <CardBox className="overflow-hidden p-0">
          <div className="flex items-start justify-between px-4 pt-4">
            <div>
              <h2 className="text-sm font-semibold">Jam kerja harian</h2>
              <p className="mt-1 text-[10px] text-muted-foreground">Durasi tercatat setiap hari</p>
            </div>
            <span className="rounded p-1 text-muted-foreground" title="Jam kerja aktual dari timesheet">
              <Ellipsis className="size-4" />
            </span>
          </div>
          {entries.length ? (
            <div className="px-3 pb-2 pt-1">
              <Chart
                options={barOptions}
                series={[{ name: "Jam kerja", data: dailyHours }]}
                type="bar"
                height={112}
                width="100%"
              />
            </div>
          ) : (
            <p className="px-4 py-10 text-center text-xs text-muted-foreground">
              Catat jam di Timesheet untuk mengisi ringkasan mingguan.
            </p>
          )}
          <div className="border-t border-border px-4 py-2 text-right">
            <Link href={`/apps/habits?${queryFor(weekStart, 7)}`} scroll={false} className="text-[10px] font-medium text-primary hover:underline">
              Buka timesheet <ArrowRight className="ml-1 inline size-3" />
            </Link>
          </div>
        </CardBox>

        <CardBox className="overflow-hidden p-0">
          <div className="flex items-start justify-between px-4 pt-4">
            <div>
              <h2 className="text-sm font-semibold">Projects Worked</h2>
              <p className="mt-1 text-[10px] text-muted-foreground">Proyek yang tercatat minggu ini</p>
            </div>
            <Ellipsis className="size-4 text-muted-foreground" />
          </div>
          <div className="px-4 pt-3">
            <p className="text-2xl font-semibold">{currentProjects}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {projectChange === null
                ? previousProjects === 0
                  ? "Belum ada proyek pada minggu pembanding"
                  : `${previousProjects} proyek minggu lalu`
                : `${projectChange > 0 ? "+" : ""}${projectChange}% sejak minggu lalu`}
            </p>
          </div>
          {entries.length || previousEntries.length ? (
            <div className="px-3 pb-3 pt-2">
              <Chart
                options={trendOptions}
                series={[
                  { name: "Minggu ini", data: dailyProjects },
                  { name: "Minggu lalu", data: previousDailyProjects },
                ]}
                type="line"
                height={84}
                width="100%"
              />
            </div>
          ) : (
            <p className="px-4 py-8 text-xs text-muted-foreground">Belum ada aktivitas timesheet untuk dibandingkan.</p>
          )}
        </CardBox>
      </div>
    </div>
  );
}
