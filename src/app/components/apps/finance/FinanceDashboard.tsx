"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import {
  ClipboardCheck,
  Clock3,
  Wallet,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type FinanceDashboardMonth = {
  key: string;
  label: string;
  paymentCount: number;
  totalPaid: number;
};

export type FinanceDashboardCategory = {
  kind: string;
  label: string;
  paymentCount: number;
  totalPaid: number;
};

const colors = ["#f28c1b", "#14b8a6", "#8b5cf6", "#38bdf8"];
const compactCurrency = (value: number) =>
  `Rp ${new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)}`;

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function FinanceDashboard({
  reviewCount,
  pendingPaymentCount,
  outstandingAmount,
  months,
  categories,
  onNavigate,
}: {
  reviewCount: number;
  pendingPaymentCount: number;
  outstandingAmount: number;
  months: FinanceDashboardMonth[];
  categories: FinanceDashboardCategory[];
  onNavigate: (tab: "check" | "payment" | "history") => void;
}) {
  const totalPaid = months.reduce((total, month) => total + month.totalPaid, 0);
  const totalTransactions = months.reduce(
    (total, month) => total + month.paymentCount,
    0,
  );
  const populatedCategories = categories.filter(
    (category) => category.paymentCount > 0,
  );

  const trendOptions: ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      fontFamily: "inherit",
      foreColor: "#8da6c4",
      zoom: { enabled: false },
    },
    colors: [colors[2], colors[0]],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: [3, 3] },
    markers: { size: 3, hover: { size: 5 } },
    grid: { borderColor: "rgba(141,166,196,0.18)", strokeDashArray: 4 },
    xaxis: {
      categories: months.map((month) => month.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: [
      {
        seriesName: "Nilai pembayaran",
        title: { text: "Nilai (Rp)" },
        labels: { formatter: compactCurrency },
      },
      {
        seriesName: "Jumlah transaksi",
        opposite: true,
        min: 0,
        forceNiceScale: true,
        title: { text: "Transaksi" },
        labels: { formatter: (value) => `${Math.round(value)}` },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      theme: "dark",
      y: [
        { formatter: currency },
        { formatter: (value) => `${value} transaksi` },
      ],
    },
    legend: { position: "top", horizontalAlign: "left" },
  };

  const trendSeries: ApexAxisChartSeries = [
    {
      name: "Nilai pembayaran",
      type: "line",
      data: months.map((month) => month.totalPaid),
    },
    {
      name: "Jumlah transaksi",
      type: "line",
      data: months.map((month) => month.paymentCount),
    },
  ];

  const distributionOptions: ApexOptions = {
    chart: { type: "donut", fontFamily: "inherit", foreColor: "#8da6c4" },
    colors,
    labels: populatedCategories.map((category) => category.label),
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: { colors: ["#112d50"] },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: { show: true, offsetY: 18 },
            value: {
              show: true,
              offsetY: -10,
              formatter: (value) => `${value} transaksi`,
            },
            total: {
              show: true,
              label: "Total transaksi",
              formatter: () => `${totalTransactions}`,
            },
          },
        },
      },
    },
    tooltip: {
      y: { formatter: (value) => `${value} transaksi` },
    },
  };

  const metricCards = [
    {
      label: "Perlu Diperiksa",
      value: `${reviewCount}`,
      description: "PO menunggu pemeriksaan Keuangan",
      icon: ClipboardCheck,
      color: "text-[#ff981f]",
      style: "border-[#ef8b18] bg-[#1d3b68]",
      tab: "check" as const,
    },
    {
      label: "Antrean Pembayaran",
      value: `${pendingPaymentCount}`,
      description: "Tagihan yang masih perlu dicairkan",
      icon: Clock3,
      color: "text-[#ffb21f]",
      style: "border-[#a77925] bg-[#3b4547]",
      tab: "payment" as const,
    },
    {
      label: "Sisa Tagihan",
      value: compactCurrency(outstandingAmount),
      description: "Nilai pembayaran yang masih terbuka",
      icon: Wallet,
      color: "text-[#16d5c0]",
      style: "border-[#0d827c] bg-[#124d5f]",
      tab: "payment" as const,
    },
    {
      label: "Dibayarkan · 12 Bulan",
      value: compactCurrency(totalPaid),
      description: `${totalTransactions} transaksi berhasil`,
      icon: WalletCards,
      color: "text-[#a78bfa]",
      style: "border-[#6651bd] bg-[#2b356b]",
      tab: "history" as const,
    },
  ];

  return (
    <div className="space-y-5">
      <section
        className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4"
        aria-label="Ringkasan keuangan"
      >
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <Button
              key={metric.label}
              type="button"
              variant="ghost"
              onClick={() => onNavigate(metric.tab)}
              className={`h-auto min-h-28 justify-start rounded-lg border p-4 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-inherit hover:shadow-md ${metric.style}`}
            >
              <span className="flex w-full min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-black/20">
                  <Icon className={`size-5 ${metric.color}`} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-sm font-medium ${metric.color}`}>
                    {metric.label}
                  </span>
                  <span className="mt-1 block truncate text-2xl font-bold tabular-nums text-white">
                    {metric.value}
                  </span>
                  <span className="mt-1 block truncate text-xs text-white/65">
                    {metric.description}
                  </span>
                </span>
              </span>
            </Button>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <article className="overflow-hidden rounded-lg border border-border bg-card xl:col-span-8">
          <header className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">Tren Pembayaran</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nilai pencairan dan jumlah transaksi selama 12 bulan terakhir
            </p>
          </header>
          {totalTransactions > 0 ? (
            <div className="p-3 sm:p-5">
              <Chart
                options={trendOptions}
                series={trendSeries}
                type="line"
                height={320}
                width="100%"
              />
            </div>
          ) : (
            <p className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Belum ada pembayaran pada periode 12 bulan terakhir.
            </p>
          )}
        </article>

        <article className="overflow-hidden rounded-lg border border-border bg-card xl:col-span-4">
          <header className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">Distribusi Pembayaran</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Berdasarkan jenis transaksi · 12 bulan terakhir
            </p>
          </header>
          {totalTransactions > 0 ? (
            <>
              <Chart
                options={distributionOptions}
                series={populatedCategories.map(
                  (category) => category.paymentCount,
                )}
                type="donut"
                height={230}
                width="100%"
              />
              <ul className="space-y-3 px-5 pb-5">
                {populatedCategories.map((category, index) => (
                  <li
                    key={category.kind}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: colors[index % colors.length] }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{category.label}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-medium tabular-nums">
                        {category.paymentCount} transaksi
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {compactCurrency(category.totalPaid)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Belum ada data pembayaran untuk ditampilkan.
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
