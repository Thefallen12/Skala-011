"use client";

import dynamic from "next/dynamic";
import { Icon } from "@iconify/react/dist/iconify.js";
import CardBox from "../shared/CardBox";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const YearlyBreakup = ({
  total,
  completed,
  running,
  other,
}: {
  total: number;
  completed: number;
  running: number;
  other: number;
}) => {
  const chartOptions: ApexOptions = {
    series: [completed, running, other],
    labels: ["Selesai", "Berjalan", "Lainnya"],
    chart: {
      type: "donut",
      fontFamily: "inherit",
      foreColor: "#adb0bb",
      height: 200,
      offsetX: 18,
      toolbar: { show: false },
    },
    plotOptions: {
      pie: {
        startAngle: 0,
        endAngle: 360,
        donut: { size: "75%" },
      },
    },
    stroke: { show: false },
    dataLabels: { enabled: false },
    legend: { show: false },
    colors: [
      "var(--color-success)",
      "var(--color-primary)",
      "var(--color-secondary)",
    ],
    tooltip: {
      theme: "dark",
      y: { formatter: (value) => `${value} proyek` },
    },
  };

  const breakdown = [
    { label: "Selesai", value: completed, color: "text-success" },
    { label: "Berjalan", value: running, color: "text-primary" },
    { label: "Lainnya", value: other, color: "text-secondary" },
  ];

  return (
    <CardBox>
      <h5 className="card-title mb-4">Status Proyek</h5>
      <div className="grid grid-cols-12 items-center">
        <div className="col-span-5">
          <p className="mb-1 text-xs text-muted-foreground">Total proyek</p>
          <h4 className="mb-4 text-xl">{total}</h4>
          <div className="flex flex-col gap-2">
            {breakdown.map((item) => (
              <div className="flex items-center gap-1.5" key={item.label}>
                <Icon
                  icon="tabler:point-filled"
                  className={`text-xl ${item.color}`}
                />
                <span className="text-xs text-muted-foreground">
                  {item.label}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-7 flex justify-center">
          {total > 0 ? (
            <Chart
              options={chartOptions}
              series={[completed, running, other]}
              type="donut"
              height={200}
              width={180}
            />
          ) : (
            <p className="py-12 text-center text-xs text-muted-foreground">
              Belum ada data proyek.
            </p>
          )}
        </div>
      </div>
    </CardBox>
  );
};

export { YearlyBreakup };
