"use client";

import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { TicketStatisticsMonth } from "./ticket-statistics";

export default function TicketStatisticsChart({
  months,
  categoryLabel,
}: {
  months: TicketStatisticsMonth[];
  categoryLabel: string;
}) {
  const values = months.map((month) =>
    Number((month.totalCents + BigInt(50)) / BigInt(100)),
  );
  const counts = months.map((month) => month.count);

  const options: ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      fontFamily: "inherit",
      foreColor: "#7C8FAC",
      height: 340,
      zoom: { enabled: false },
    },
    colors: ["var(--color-info)", "var(--color-primary)"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: [3, 3] },
    markers: { size: 4, hover: { size: 6 } },
    grid: { borderColor: "rgba(124,143,172,0.18)", strokeDashArray: 3 },
    xaxis: {
      categories: months.map((month) => month.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: [
      {
        seriesName: "Nilai transaksi",
        title: { text: "Nilai (Rp)" },
        labels: {
          formatter: (value) =>
            new Intl.NumberFormat("id-ID", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(value),
        },
      },
      {
        seriesName: "Jumlah transaksi",
        opposite: true,
        min: 0,
        forceNiceScale: true,
        title: { text: "Jumlah tiket" },
        labels: { formatter: (value) => `${Math.round(value)}` },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      theme: "dark",
      y: [
        {
          formatter: (value) =>
            new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              maximumFractionDigits: 0,
            }).format(value),
        },
        {
          formatter: (value) => `${value} tiket`,
        },
      ],
    },
    legend: { position: "top", horizontalAlign: "left" },
  };

  const series: ApexAxisChartSeries = [
    { name: `Nilai transaksi · ${categoryLabel}`, type: "line", data: values },
    { name: `Jumlah transaksi · ${categoryLabel}`, type: "line", data: counts },
  ];

  return (
    <div className="min-h-[340px] w-full">
      {months.length > 0 ? (
        <Chart
          options={options}
          series={series}
          type="line"
          height={340}
          width="100%"
        />
      ) : (
        <div className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">
          Belum ada data transaksi untuk periode ini.
        </div>
      )}
    </div>
  );
}
