import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOStatus, POStatus } from "@/generated/prisma/enums";
import { isValidPublicCode } from "@/lib/documents/random-code";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Verifikasi Delivery Order",
  robots: { index: false, follow: false },
};

const doStatusLabels: Record<DOStatus, string> = {
  [DOStatus.PENDING]: "Menunggu pengiriman",
  [DOStatus.IN_TRANSIT]: "Dalam pengiriman",
  [DOStatus.DELIVERED]: "Telah diterima",
  [DOStatus.RETURNED]: "Dikembalikan",
};

export default async function VerifyDeliveryOrderPage({
  params,
}: {
  params: Promise<{ publicCode: string }>;
}) {
  const { publicCode } = await params;
  if (!isValidPublicCode(publicCode)) notFound();

  const deliveryOrder = await prisma.deliveryOrder.findUnique({
    where: { publicCode },
    select: {
      doNumber: true,
      status: true,
      createdAt: true,
      receivedAt: true,
      receivedBy: { select: { name: true } },
      receiverName: true,
      signedAt: true,
      signedBy: { select: { name: true } },
      acknowledgedAt: true,
      acknowledgedBy: { select: { name: true } },
      po: {
        select: {
          poNumber: true,
          status: true,
        },
      },
    },
  });
  if (!deliveryOrder) notFound();

  const isDelivered = deliveryOrder.status === DOStatus.DELIVERED;
  const isPoApproved = deliveryOrder.po?.status === POStatus.APPROVED;
  const isVerified =
    Boolean(deliveryOrder.signedAt) && Boolean(deliveryOrder.acknowledgedAt);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center p-4">
      <section className="w-full rounded-xl border bg-white p-6 shadow-lg md:p-10">
        <div className="mb-6 border-b-4 border-secondary pb-4">
          <p className="text-sm font-bold tracking-widest text-secondary">
            SKALA PRIORITAS ENGINEERING
          </p>
          <h1 className="mt-2 text-2xl font-bold text-primary">
            Verifikasi Delivery Order
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
            <dt className="text-sm text-muted-foreground">Nomor DO</dt>
            <dd className="mt-1 font-semibold text-primary">
              {deliveryOrder.doNumber}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Status pengiriman</dt>
            <dd className="mt-1 font-semibold">
              {doStatusLabels[deliveryOrder.status]}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Tanggal dibuat</dt>
            <dd className="mt-1 font-semibold">
              {deliveryOrder.createdAt.toLocaleDateString("id-ID")}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              Ditandatangani Logistik
            </dt>
            <dd className="mt-1 font-semibold">
              {deliveryOrder.signedBy?.name ?? "Belum ditandatangani"}
              {deliveryOrder.signedAt
                ? ` · ${deliveryOrder.signedAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Diketahui Keuangan</dt>
            <dd className="mt-1 font-semibold">
              {deliveryOrder.acknowledgedBy?.name ?? "Belum dikonfirmasi"}
              {deliveryOrder.acknowledgedAt
                ? ` · ${deliveryOrder.acknowledgedAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`
                : ""}
            </dd>
          </div>
          {deliveryOrder.po && (
            <>
              <div>
                <dt className="text-sm text-muted-foreground">Nomor PO</dt>
                <dd className="mt-1 font-semibold">
                  {deliveryOrder.po.poNumber}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Status PO</dt>
                <dd className="mt-1 font-semibold">
                  {deliveryOrder.po.status.replaceAll("_", " ")}
                  {isPoApproved ? " · Disetujui" : ""}
                </dd>
              </div>
            </>
          )}
          {isDelivered && (
            <>
              <div>
                <dt className="text-sm text-muted-foreground">Diterima oleh</dt>
                <dd className="mt-1 font-semibold">
                  {deliveryOrder.receivedBy?.name ??
                    deliveryOrder.receiverName ??
                    "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Waktu diterima</dt>
                <dd className="mt-1 font-semibold">
                  {deliveryOrder.receivedAt?.toLocaleString("id-ID", {
                    timeZone: "Asia/Jakarta",
                  }) ?? "—"}
                </dd>
              </div>
            </>
          )}
        </dl>
        <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          QR ini memverifikasi status Delivery Order pada sistem SKALA PRIORITAS
          ENGINEERING.
        </p>
      </section>
    </main>
  );
}
