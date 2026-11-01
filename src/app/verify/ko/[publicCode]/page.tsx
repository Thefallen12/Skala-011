import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidPublicCode } from "@/lib/documents/random-code";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Verifikasi Konfirmasi Order",
  robots: { index: false, follow: false },
};

export default async function VerifyOrderConfirmationPage({
  params,
}: {
  params: Promise<{ publicCode: string }>;
}) {
  const { publicCode } = await params;
  if (!isValidPublicCode(publicCode)) notFound();

  const confirmation = await prisma.orderConfirmation.findUnique({
    where: { publicCode },
    select: {
      koNumber: true,
      paymentType: true,
      paymentAmount: true,
      paidAt: true,
      po: {
        select: {
          poNumber: true,
          vendorName: true,
        },
      },
      signedAt: true,
      signedBy: { select: { name: true } },
      acknowledgedAt: true,
      acknowledgedBy: { select: { name: true } },
    },
  });
  if (!confirmation) notFound();
  const isVerified = Boolean(
    confirmation.signedAt && confirmation.acknowledgedAt,
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center p-4">
      <section className="w-full rounded-xl border bg-white p-6 shadow-lg md:p-10">
        <div className="mb-6 border-b-4 border-secondary pb-4">
          <p className="text-sm font-bold tracking-widest text-secondary">
            SKALA PRIORITAS ENGINEERING
          </p>
          <h1 className="mt-2 text-2xl font-bold text-primary">
            Verifikasi Konfirmasi Order
          </h1>
        </div>
        <p
          className={`mb-6 rounded-md p-4 font-semibold ${
            isVerified
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-800"
          }`}
          role="status"
        >
          {isVerified
            ? "Dokumen valid: telah ditandatangani Logistik dan diketahui Keuangan."
            : "Dokumen belum valid: tanda tangan Logistik dan konfirmasi Keuangan harus lengkap."}
        </p>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Nomor KO</dt>
            <dd className="mt-1 font-semibold text-primary">
              {confirmation.koNumber}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Nomor PO</dt>
            <dd className="mt-1 font-semibold">
              {confirmation.po.poNumber}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Vendor</dt>
            <dd className="mt-1 font-semibold">
              {confirmation.po.vendorName}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Jenis pembayaran</dt>
            <dd className="mt-1 font-semibold">
              {confirmation.paymentType?.replaceAll("_", " ") ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Nominal pembayaran</dt>
            <dd className="mt-1 font-semibold">
              {confirmation.paymentAmount === null
                ? "—"
                : new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(confirmation.paymentAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Tanggal pembayaran</dt>
            <dd className="mt-1 font-semibold">
              {confirmation.paidAt?.toLocaleDateString("id-ID", {
                timeZone: "Asia/Jakarta",
              }) ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              Ditandatangani Logistik
            </dt>
            <dd className="mt-1 font-semibold">
              {confirmation.signedBy?.name ?? "Belum ditandatangani"}
              {confirmation.signedAt
                ? ` · ${confirmation.signedAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Diketahui Keuangan</dt>
            <dd className="mt-1 font-semibold">
              {confirmation.acknowledgedBy?.name ?? "Belum dikonfirmasi"}
              {confirmation.acknowledgedAt
                ? ` · ${confirmation.acknowledgedAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`
                : ""}
            </dd>
          </div>
        </dl>
        <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          QR ini memverifikasi tanda tangan dan konfirmasi KO pada sistem SKALA
          PRIORITAS ENGINEERING.
        </p>
      </section>
    </main>
  );
}
