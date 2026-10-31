"use client";

import dynamic from "next/dynamic";
import CardBox from "../shared/CardBox";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const monthLabels = (year: number) =>
  Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat("id-ID", { month: "short" }).format(
      new Date(year, month, 1),
    ),
  );

const SalesOverview = ({
  year,
  projectCounts,
  ticketCounts,
}: {
  year: number;
  projectCounts: number[];
  ticketCounts: number[];
}) => {
  const chartOptions: ApexOptions = {
    chart: {
      toolbar: { show: false },
      type: "bar",
      fontFamily: "inherit",
      foreColor: "#7C8FAC",
      height: 310,
      stacked: false,
      width: "100%",
      offsetX: -20,
    },
    colors: ["var(--color-primary)", "var(--color-secondary)"],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "45%",
        borderRadius: 4,
      },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: "rgba(0,0,0,0.1)", strokeDashArray: 3 },
    xaxis: {
      categories: monthLabels(year),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: { formatter: (value) => Math.round(value).toString() },
    },
    tooltip: {
      theme: "dark",
      y: { formatter: (value) => `${value} data` },
    },
  };

  return (
    <CardBox className="h-full w-full pb-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h5 className="card-title">Aktivitas Bulanan</h5>
          <p className="text-sm font-normal text-muted-foreground">
            Proyek baru dan tiket masuk selama {year}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            Proyek baru
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-secondary" />
            Tiket masuk
          </span>
        </div>
      </div>
      <Chart
        options={chartOptions}
        series={[
          { name: "Proyek baru", data: projectCounts },
          { name: "Tiket masuk", data: ticketCounts },
        ]}
        type="bar"
        height={316}
        width="100%"
      />
    </CardBox>
  );
};

export default SalesOverview;
