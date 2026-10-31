"use client";

import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { ProjectProgressPoint } from "@/app/(DashboardLayout)/types/project";

export default function ProjectProgressChartView({
  data,
}: {
  data: ProjectProgressPoint[];
}) {
  const options: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      fontFamily: "inherit",
      foreColor: "#7C8FAC",
      height: 316,
      width: "100%",
      zoom: { enabled: false },
    },
    colors: ["var(--color-primary)"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 3 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.04,
        stops: [0, 95, 100],
      },
    },
    grid: { borderColor: "rgba(124,143,172,0.18)", strokeDashArray: 3 },
    xaxis: {
      type: "datetime",
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { datetimeUTC: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: { formatter: (value) => `${Math.round(value)}%` },
    },
    tooltip: {
      theme: "dark",
      x: { format: "dd MMM yyyy" },
      y: { formatter: (value) => `${value.toFixed(1)}%` },
    },
    markers: { size: 4, hover: { size: 6 } },
  };

  const series: ApexAxisChartSeries = [
    {
      name: "Progres Pekerjaan",
      data: data.map((point) => ({
        x: new Date(`${point.date}T00:00:00`).getTime(),
        y: point.progress,
      })),
    },
  ];

  return (
    <div className="w-full">
      <Chart options={options} series={series} type="area" height={316} width="100%" />
    </div>
  );
}
