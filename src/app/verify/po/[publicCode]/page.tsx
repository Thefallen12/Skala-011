import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { POStatus } from "@/generated/prisma/enums";
import { isValidPublicCode } from "@/lib/documents/random-code";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Verifikasi Purchase Order",
  robots: { index: false, follow: false },
};

export default async function VerifyPurchaseOrderPage({
  params,
}: {
  params: Promise<{ publicCode: string }>;
}) {
  const { publicCode } = await params;
  if (!isValidPublicCode(publicCode)) notFound();

  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { publicCode },
    select: {
      poNumber: true,
      status: true,
      approvedAt: true,
      approvedBy: { select: { name: true } },
    },
  });
  if (!purchaseOrder) notFound();

  const isApproved = purchaseOrder.status === POStatus.APPROVED;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center p-4">
      <section className="w-full rounded-xl border bg-white p-6 shadow-lg md:p-10">
        <div className="mb-6 border-b-4 border-secondary pb-4">
          <p className="text-sm font-bold tracking-widest text-secondary">
            SKALA PRIORITAS ENGINEERING
          </p>
          <h1 className="mt-2 text-2xl font-bold text-primary">
            Verifikasi Purchase Order
          </h1>
        </div>
        <p
          className={`mb-6 rounded-md p-4 font-semibold ${
            isApproved
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-800"
          }`}
          role="status"
        >
          {isApproved
            ? "Dokumen ini valid dan telah disetujui."
            : "Dokumen tercatat, tetapi belum disetujui."}
        </p>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Nomor PO</dt>
            <dd className="mt-1 font-semibold text-primary">
              {purchaseOrder.poNumber}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Status</dt>
            <dd className="mt-1 font-semibold">
              {purchaseOrder.status.replaceAll("_", " ")}
            </dd>
          </div>
          {isApproved && (
            <>
              <div>
                <dt className="text-sm text-muted-foreground">Disetujui oleh</dt>
                <dd className="mt-1 font-semibold">
                  {purchaseOrder.approvedBy?.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Waktu persetujuan</dt>
                <dd className="mt-1 font-semibold">
                  {purchaseOrder.approvedAt?.toLocaleString("id-ID") ?? "—"}
                </dd>
              </div>
            </>
          )}
        </dl>
        <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          QR ini memverifikasi status dokumen pada sistem SKALA PRIORITAS ENGINEERING.
        </p>
      </section>
    </main>
  );
}
