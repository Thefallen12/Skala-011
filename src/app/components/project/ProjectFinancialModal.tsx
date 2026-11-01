"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { getProjectFinancialBreakdown } from "@/app/actions/project";
import type { ProjectFinancialBreakdown as FinancialResult } from "@/app/actions/project";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GlobalModal } from "@/components/ui/global-modal";

type ProjectSummary = {
  id: string;
  title: string;
};

const formatCurrency = (amount: string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount));

export default function ProjectFinancialModal({
  project,
  open,
  onOpenChange,
}: {
  project: ProjectSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [result, setResult] = useState<FinancialResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !project) {
      setResult(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setResult(null);

    getProjectFinancialBreakdown(project.id)
      .then((response) => {
        if (active) setResult(response);
      })
      .catch((error: unknown) => {
        console.error("Loading project financial breakdown failed:", error);
        if (active) {
          setResult({
            success: false,
            message: "Realisasi anggaran gagal dimuat. Silakan coba kembali.",
          });
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, project]);

  const financials = result?.success ? result.data : null;
  const percentage = financials?.percentage ?? 0;
  const progressVariant =
    percentage > 90 ? "error" : percentage >= 75 ? "warning" : "success";
  const budgetState =
    percentage > 100
      ? { label: "Over Budget", variant: "lightError" as const }
      : percentage > 90
        ? { label: "Kritis", variant: "lightError" as const }
        : percentage >= 75
          ? { label: "Waspada", variant: "lightWarning" as const }
          : { label: "Aman", variant: "lightSuccess" as const };

  return (
    <GlobalModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={`Laporan Realisasi Anggaran - ${project?.title ?? ""}`}
      description="Ringkasan pagu dan tiket yang sudah masuk tahap pemrosesan atau selesai."
      className="sm:max-w-xl"
    >

        {isLoading && (
          <div
            className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground"
            role="status"
          >
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Memuat realisasi anggaran...
          </div>
        )}

        {!isLoading && result && !result.success && (
          <p className="mt-8 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
            {result.message}
          </p>
        )}

        {!isLoading && financials && (
          <div className="mt-8 space-y-8">
            <section className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dana terealisasi</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatCurrency(financials.realized)}
                  </p>
                </div>
                <Badge variant={budgetState.variant}>{budgetState.label}</Badge>
              </div>

              <Progress
                value={Math.min(100, Math.max(0, percentage))}
                variant={progressVariant}
                className="h-3"
                aria-label={`Anggaran terealisasi ${percentage.toFixed(1)} persen`}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">Total Pagu</p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(financials.budget)}
                  </p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">Sisa Anggaran</p>
                  <p
                    className={`mt-1 font-semibold ${
                      Number(financials.remaining) < 0 ? "text-destructive" : ""
                    }`}
                  >
                    {formatCurrency(financials.remaining)}
                  </p>
                </div>
              </div>
              <p className="text-right text-sm text-muted-foreground">
                {percentage.toFixed(1)}% dari pagu
              </p>
              {percentage > 90 && (
                <p
                  className="flex items-center gap-2 text-sm text-destructive"
                  role="status"
                >
                  <AlertTriangle className="size-4" aria-hidden="true" />
                  {percentage > 100
                    ? "Realisasi sudah melebihi pagu proyek."
                    : "Realisasi anggaran mendekati batas pagu."}
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-3 font-semibold">Rincian Pengeluaran</h3>
              <div className="divide-y rounded-md border px-4">
                {financials.categories.map((category) => (
                  <div
                    key={category.key}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {category.label}
                    </span>
                    <span className="whitespace-nowrap font-medium">
                      {formatCurrency(category.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
    </GlobalModal>
  );
}
