import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidPublicCode } from "@/lib/documents/random-code";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Verifikasi Invoice",
  robots: { index: false, follow: false },
};

export default async function VerifyInvoicePage({
  params,
}: {
  params: Promise<{ publicCode: string }>;
}) {
  const { publicCode } = await params;
  if (!isValidPublicCode(publicCode)) notFound();

  const invoice = await prisma.invoice.findUnique({
    where: { publicCode },
    select: {
      invoiceNumber: true,
      vendorName: true,
      status: true,
      grandTotal: true,
      createdAt: true,
      signedAt: true,
      signedBy: { select: { name: true } },
      acknowledgedAt: true,
      acknowledgedBy: { select: { name: true } },
    },
  });
  if (!invoice) notFound();
  const isVerified = Boolean(invoice.signedAt && invoice.acknowledgedAt);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center p-4">
      <section className="w-full rounded-xl border bg-white p-6 shadow-lg md:p-10">
        <div className="mb-6 border-b-4 border-secondary pb-4">
          <p className="text-sm font-bold tracking-widest text-secondary">
            SKALA PRIORITAS ENGINEERING
          </p>
          <h1 className="mt-2 text-2xl font-bold text-primary">
            Verifikasi Invoice
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
            ? "Dokumen valid: telah ditandatangani Keuangan dan diketahui Direktur."
            : "Dokumen belum valid: tanda tangan Keuangan dan konfirmasi Direktur harus lengkap."}
        </p>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Nomor Invoice</dt>
            <dd className="mt-1 font-semibold text-primary">
              {invoice.invoiceNumber}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Vendor / Mandor</dt>
            <dd className="mt-1 font-semibold">{invoice.vendorName}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Status pembayaran</dt>
            <dd className="mt-1 font-semibold">
              {invoice.status.replaceAll("_", " ")}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Total Invoice</dt>
            <dd className="mt-1 font-semibold">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(invoice.grandTotal)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              Ditandatangani Keuangan
            </dt>
            <dd className="mt-1 font-semibold">
              {invoice.signedBy?.name ?? "Belum ditandatangani"}
              {invoice.signedAt
                ? ` · ${invoice.signedAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              Diketahui Direktur
            </dt>
            <dd className="mt-1 font-semibold">
              {invoice.acknowledgedBy?.name ?? "Belum dikonfirmasi"}
              {invoice.acknowledgedAt
                ? ` · ${invoice.acknowledgedAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`
                : ""}
            </dd>
          </div>
        </dl>
        <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          QR ini memverifikasi tanda tangan dan konfirmasi Invoice pada sistem
          SKALA PRIORITAS ENGINEERING.
        </p>
      </section>
    </main>
  );
}
