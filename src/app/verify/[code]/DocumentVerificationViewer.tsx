"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle,
  Download,
  FileCheck2,
  FileText,
  LoaderCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface VerifiedDocument {
  documentNumber: string;
  status: string;
  createdAt: string;
  type: string;
  issuerName: string;
}

interface DocumentVerificationViewerProps {
  code: string;
  document: VerifiedDocument | null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export default function DocumentVerificationViewer({
  code,
  document,
}: DocumentVerificationViewerProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const isValid = document?.status === "VALID";
  const statusLabel = isValid
    ? "Dokumen Valid & Resmi"
    : document
      ? "Dokumen Tidak Lagi Valid"
      : "Dokumen Tidak Ditemukan";

  const handleDownloadPdf = async () => {
    if (!documentRef.current || !isValid || !document) return;

    setIsDownloading(true);
    setDownloadError("");
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 0,
          filename: `${safeFileName(document.documentNumber)}-verifikasi.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(documentRef.current)
        .save();
    } catch (error) {
      console.error("Document verification PDF download failed:", error);
      setDownloadError("PDF gagal dibuat. Silakan coba kembali.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 font-sans text-slate-800 lg:grid-cols-2">
      <aside className="relative flex min-h-[460px] flex-col justify-between overflow-hidden bg-slate-950 px-7 py-8 text-white sm:px-12 sm:py-10 lg:min-h-screen">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&q=85')",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/65 to-slate-950/90"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white p-1.5 shadow-lg">
            <Image
              src="/images/logos/icont%20logo%201.svg"
              alt="Logo Skala Prioritas Engineering"
              width={38}
              height={38}
              priority
            />
          </div>
          <div>
            <p className="text-sm font-bold tracking-[0.12em]">
              SKALA PRIORITAS
            </p>
            <p className="text-[11px] font-semibold tracking-[0.24em] text-orange-300">
              ENGINEERING
            </p>
          </div>
        </div>

        <div className="relative z-10 mx-auto my-14 flex w-full max-w-xl flex-col items-center text-center lg:my-0">
          <div className="mb-8 flex items-center gap-4 rounded-2xl border border-white/25 bg-white/95 px-6 py-5 text-slate-950 shadow-2xl backdrop-blur-md sm:px-9 sm:py-6">
            <Image
              src="/images/logos/icont%20logo%201.svg"
              alt=""
              width={64}
              height={64}
              className="size-14 shrink-0 sm:size-16"
            />
            <div className="text-left">
              <p className="text-sm font-extrabold tracking-wide sm:text-base">
                SKALA PRIORITAS
              </p>
              <p className="mt-1 text-[10px] font-bold tracking-[0.2em] text-orange-600 sm:text-xs">
                ENGINEERING
              </p>
            </div>
          </div>

          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-400/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-orange-200">
            <ShieldCheck className="size-4" aria-hidden="true" />
            SISTEM VERIFIKASI RESMI
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Sistem Verifikasi
            <span className="mt-1 block bg-gradient-to-r from-orange-300 to-amber-100 bg-clip-text text-transparent">
              Dokumen
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-200 sm:text-lg">
            Platform digital resmi untuk memverifikasi keaslian dokumen
            Purchase Order dan Surat Jalan PT Skala Prioritas Engineering.
          </p>
        </div>

        <div className="relative z-10 border-t border-white/15 pt-5 text-xs text-slate-300">
          <p>
            © {new Date().getFullYear()} PT Skala Prioritas Engineering. Hak
            Cipta Dilindungi.
          </p>
          <p className="mt-1 text-slate-400">
            Verifikasi dokumen resmi secara aman dan transparan.
          </p>
        </div>
      </aside>

      <section className="flex min-h-screen flex-col bg-slate-100 lg:h-screen lg:overflow-y-auto">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${
                isValid
                  ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                  : "border-amber-200 bg-amber-50 text-amber-600"
              }`}
            >
              {isValid ? (
                <CheckCircle className="size-5" aria-hidden="true" />
              ) : (
                <AlertCircle className="size-5" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p
                className={`truncate text-sm font-bold ${
                  isValid ? "text-emerald-800" : "text-amber-800"
                }`}
                role="status"
              >
                {statusLabel}
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">
                {isValid
                  ? "Tercatat pada sistem resmi SPE"
                  : "Status verifikasi dari sistem resmi SPE"}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!isValid || isDownloading}
            className="h-10 shrink-0 rounded-lg bg-orange-500 px-3 text-white shadow-sm hover:bg-orange-600 sm:px-4"
          >
            {isDownloading ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {isDownloading ? "Menyiapkan PDF..." : "Download PDF"}
            </span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </header>

        <div className="flex flex-1 justify-center overflow-x-auto p-4 sm:p-8">
          <article
            ref={documentRef}
            id="document-print-area"
            aria-label="Ringkasan verifikasi dokumen"
            className="relative flex min-h-[297mm] w-full max-w-[210mm] flex-col overflow-hidden bg-white p-6 text-slate-800 shadow-xl ring-1 ring-slate-200 sm:p-10 md:p-12"
          >
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute right-[-35px] top-[300px] rotate-[-28deg] select-none text-5xl font-black tracking-[0.18em] opacity-[0.035] sm:right-[-15px] sm:text-6xl ${
                isValid ? "text-emerald-900" : "text-slate-900"
              }`}
            >
              {isValid ? "TERVERIFIKASI" : "VERIFIKASI"}
            </div>

            <div className="relative flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Image
                    src="/images/logos/icont%20logo%201.svg"
                    alt="Logo Skala Prioritas Engineering"
                    width={52}
                    height={52}
                    className="size-12 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-extrabold tracking-wide text-slate-950 sm:text-sm">
                      PT SKALA PRIORITAS ENGINEERING
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500 sm:text-xs">
                      Sistem Verifikasi Dokumen Digital
                    </p>
                  </div>
                </div>
                <div
                  className={`shrink-0 rounded-md border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider sm:text-[10px] ${
                    isValid
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-amber-300 bg-amber-50 text-amber-800"
                  }`}
                >
                  {isValid ? "VALID" : document ? "DICABUT" : "TIDAK DITEMUKAN"}
                </div>
              </div>

              <div className="py-9 text-center sm:py-12">
                <div
                  className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl ${
                    isValid
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {isValid ? (
                    <BadgeCheck className="size-8" aria-hidden="true" />
                  ) : (
                    <FileCheck2 className="size-8" aria-hidden="true" />
                  )}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600">
                  HASIL PEMERIKSAAN SISTEM
                </p>
                <h2 className="mt-3 text-xl font-extrabold uppercase tracking-wide text-slate-950 sm:text-2xl">
                  Ringkasan Verifikasi Dokumen
                </h2>
                <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-orange-500" />
                <p
                  className={`mt-4 text-sm font-semibold ${
                    isValid ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {isValid
                    ? "Dokumen ini terdaftar dan berstatus valid."
                    : document
                      ? "Dokumen ini tercatat, tetapi tidak lagi berstatus valid."
                      : "Kode verifikasi ini tidak ditemukan pada sistem."}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                <h3 className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
                  <FileText className="size-4 text-orange-600" aria-hidden="true" />
                  Informasi Dokumen
                </h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                  <div className="flex min-w-0 gap-2.5">
                    <FileText
                      className="mt-0.5 size-4 shrink-0 text-slate-400"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <dt className="text-[11px] text-slate-500">Nomor dokumen</dt>
                      <dd className="mt-1 break-all text-sm font-bold text-slate-900">
                        {document?.documentNumber ?? "—"}
                      </dd>
                    </div>
                  </div>
                  <div className="flex min-w-0 gap-2.5">
                    <FileCheck2
                      className="mt-0.5 size-4 shrink-0 text-slate-400"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <dt className="text-[11px] text-slate-500">Jenis dokumen</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-900">
                        {document?.type ?? "—"}
                      </dd>
                    </div>
                  </div>
                  <div className="flex min-w-0 gap-2.5">
                    <UserRound
                      className="mt-0.5 size-4 shrink-0 text-slate-400"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <dt className="text-[11px] text-slate-500">Diterbitkan oleh</dt>
                      <dd className="mt-1 break-words text-sm font-bold text-slate-900">
                        {document?.issuerName ?? "—"}
                      </dd>
                    </div>
                  </div>
                  <div className="flex min-w-0 gap-2.5">
                    <CalendarDays
                      className="mt-0.5 size-4 shrink-0 text-slate-400"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <dt className="text-[11px] text-slate-500">Tanggal diterbitkan</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-900">
                        {document ? formatDate(document.createdAt) : "—"}
                      </dd>
                    </div>
                  </div>
                  <div className="flex min-w-0 gap-2.5 sm:col-span-2">
                    <Building2
                      className="mt-0.5 size-4 shrink-0 text-slate-400"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <dt className="text-[11px] text-slate-500">Kode verifikasi</dt>
                      <dd className="mt-1 break-all font-mono text-xs font-semibold text-slate-800">
                        {code}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              <div className="mt-auto border-t border-slate-200 pt-6">
                <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4">
                  <ShieldCheck
                    className={`mt-0.5 size-5 shrink-0 ${
                      isValid ? "text-emerald-600" : "text-slate-500"
                    }`}
                    aria-hidden="true"
                  />
                  <p className="text-xs leading-relaxed text-slate-600">
                    Ringkasan ini dibuat berdasarkan status dokumen pada sistem
                    PT Skala Prioritas Engineering saat halaman diperiksa.
                    {isValid &&
                      " Unduh PDF untuk menyimpan salinan hasil verifikasi ini."}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 text-[10px] text-slate-400">
                  <span>Dokumen elektronik · Verifikasi resmi SPE</span>
                  <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider">
                    <ShieldCheck className="size-3" aria-hidden="true" />
                    {isValid ? "Verified" : "Status"}
                  </span>
                </div>
              </div>
            </div>
          </article>
        </div>
        {downloadError && (
          <p role="alert" className="px-6 pb-5 text-sm text-red-700">
            {downloadError}
          </p>
        )}
      </section>
    </main>
  );
}
