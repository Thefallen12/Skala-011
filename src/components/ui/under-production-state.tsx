"use client";

import Image from "next/image";

const logoUrl =
  process.env.NEXT_PUBLIC_LOGO_URL ??
  "https://res.cloudinary.com/vmoos7dn/image/upload/v1792700587/skala_prioritas/daily_reports/g5egrrh0vpgidlivcpgb.png";

export function UnderProductionState({
  className = "",
  footerText = "ADAPT, IMPROVISE AND FINISH",
}: {
  className?: string;
  footerText?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[22px] border-[3px] border-secondary bg-card px-4 py-4 text-foreground shadow-[0_0_0_3px_rgba(249,115,22,0.18)] dark:border-orange-500 dark:bg-[#071f2b] sm:px-6 ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(249,115,22,0.08),_transparent_42%),linear-gradient(180deg,#ffffff_0%,#f1f5f9_100%)] dark:bg-[radial-gradient(circle_at_center,_rgba(255,144,61,0.18),_transparent_35%),linear-gradient(180deg,#071f2b_0%,#091b2a_100%)]" />
      <div
        className="absolute inset-0 opacity-0 dark:opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
        }}
      />

      <div className="relative z-10">
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border-[3px] border-secondary bg-card px-3 py-3 text-card-foreground shadow-[0_0_0_3px_rgba(249,115,22,0.15)] dark:border-orange-500 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-white sm:h-16 sm:w-16">
              <Image
                src={logoUrl}
                alt="Skala Prioritas logo"
                width={52}
                height={52}
                className="h-11 w-11 object-contain sm:h-14 sm:w-14"
              />
            </div>
            <div className="leading-none">
              <div className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground sm:text-[14px]">
                PT SKALA PRIORITAS
              </div>
              <div className="mt-1 text-[8px] font-bold tracking-[0.12em] text-muted-foreground sm:text-[11px]">
                ENGINEERING
              </div>
              <div className="mt-1 text-[6px] font-medium tracking-[0.16em] text-muted-foreground sm:text-[8px]">
                JL. MAWAR NO. 48 PERUMNAS DESA KUTE LOT TANGEN
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-right text-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-secondary bg-muted text-[12px] font-black text-secondary shadow-[0_0_15px_rgba(251,146,60,0.3)] dark:border-orange-300 dark:bg-[#0b1f2d] dark:text-orange-300 sm:h-12 sm:w-12 sm:text-[18px]">
              K3
            </div>
            <div className="text-[7px] font-black uppercase leading-tight text-muted-foreground sm:text-[10px]">
              UTAMAKAN KESEHATAN &amp;<br />
              KESELAMATAN KERJA (K3)
            </div>
          </div>
        </div>

        <div className="pb-3 text-center">
          <h2 className="text-[28px] font-black uppercase leading-none tracking-[-0.06em] text-secondary drop-shadow-[0_0_18px_rgba(249,115,22,0.18)] dark:text-white dark:drop-shadow-[0_0_18px_rgba(255,156,61,0.45)] sm:text-[46px] lg:text-[68px]">
            <span
              className="inline-block dark:bg-gradient-to-b dark:from-[#fff4d6] dark:via-[#f4b059] dark:to-[#ff8b2b] dark:bg-clip-text dark:text-transparent dark:[-webkit-text-stroke:2px_rgba(255,156,91,0.8)]"
            >
              SEDANG DALAM PRODUKSI
            </span>
          </h2>
          <div className="mt-2 text-[16px] font-black uppercase tracking-[0.04em] text-secondary dark:text-[#f7b15d] sm:text-[26px] lg:text-[34px]">
            UNDER PRODUCTION &amp; FABRICATION
          </div>

          <div className="mt-5 text-[13px] font-semibold text-foreground dark:text-[#f6f5f4] sm:text-[18px] lg:text-[22px]">
            <span>Halaman &amp; Area Proyek Ini Sedang Dalam Proses Produksi</span>
            <br />
            <span>Serta Penyempurnaan. Kami Segera Kembali!</span>
          </div>

          <div className="mt-4 text-[12px] font-medium text-secondaryemphasis dark:text-[#f2b768] sm:text-[16px] lg:text-[18px]">
            This website and project area is currently under production, fabrication &amp; development. We&apos;ll be back soon!
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2 rounded-[10px] border-[3px] border-secondary bg-muted px-3 py-2 shadow-[0_0_25px_rgba(255,153,61,0.25)] dark:border-[#ff9d2b] dark:bg-[#0d1f2f] sm:px-4 sm:py-3">
              <div className="single-loader" aria-label="Loading" role="status" />
              <span className="text-[12px] font-black uppercase tracking-[0.08em] text-secondaryemphasis dark:text-[#ffb657] sm:text-[18px]">
                75% IN PROGRESS
              </span>
            </div>

            <div className="mt-1 text-center text-[12px] font-bold text-foreground dark:text-[#f4f7fb] sm:text-[18px]">
              Mohon Maaf Atas Ketidaknyamanan Anda
              <br />
              Apologies For Any Inconvenience
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-3 overflow-hidden rounded-[10px] border-[3px] border-secondary bg-muted px-3 py-3 text-center shadow-[0_0_30px_rgba(255,138,51,0.18)] dark:border-[#ff8a33] dark:bg-[#0b1d2f]">
        <div className="text-[14px] font-black uppercase tracking-[0.08em] text-foreground dark:text-[#ffb657] sm:text-[20px]">
          {footerText}
        </div>
      </div>
    </div>
  );
}
