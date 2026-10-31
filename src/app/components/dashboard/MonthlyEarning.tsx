"use client";

import dynamic from "next/dynamic";
import { Icon } from "@iconify/react/dist/iconify.js";
import CardBox from "../shared/CardBox";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const MonthlyEarning = ({
  hours,
  dayLabels,
  hoursByDay,
}: {
  hours: number;
  dayLabels: string[];
  hoursByDay: number[];
}) => {
  const chartOptions: ApexOptions = {
    series: [{ name: "Jam kerja", color: "var(--color-secondary)", data: hoursByDay }],
    chart: {
      id: "weekly-timesheet",
      type: "area",
      height: 64,
      sparkline: { enabled: true },
      fontFamily: "inherit",
      foreColor: "#adb0bb",
    },
    xaxis: { categories: dayLabels },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0,
        inverseColors: false,
        opacityFrom: 0.1,
        opacityTo: 0,
        stops: [20, 180],
      },
    },
    markers: { size: 0 },
    tooltip: {
      theme: "dark",
      x: { show: true },
      y: { formatter: (value) => `${value} jam` },
    },
  };

  return (
    <CardBox className="mt-0! p-0!">
      <div className="px-6 pt-6">
        <div className="mb-2 flex items-center justify-between">
          <h5 className="card-title mb-0">Timesheet Bulan Ini</h5>
          <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-white">
            <Icon icon="tabler:clock-hour-4" className="text-xl" />
          </div>
        </div>
        <div className="mb-4 grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <h4 className="mb-1 text-xl">{hours} jam</h4>
            <p className="mb-0 text-xs text-muted-foreground">
              Total jam kerja tercatat
            </p>
          </div>
        </div>
      </div>
      <Chart
        options={chartOptions}
        series={chartOptions.series}
        type="area"
        height={64}
        width="100%"
      />
    </CardBox>
  );
};

export { MonthlyEarning };
