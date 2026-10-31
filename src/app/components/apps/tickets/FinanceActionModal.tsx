"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitPaymentRecord } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PaymentType } from "@/generated/prisma/enums";
import type { TicketRow } from "@/app/(DashboardLayout)/types/ticket";

const formatCurrency = (amount: string | null) =>
  amount === null
    ? "—"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(Number(amount));

export default function FinanceActionModal({
  open,
  ticket,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  ticket: Pick<
    TicketRow,
    | "id"
    | "ticketNumber"
    | "title"
    | "totalAmount"
    | "recipientName"
    | "bankName"
    | "accountNumber"
    | "purchaseOrders"
    | "paymentTransactions"
  >;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>(
    PaymentType.FULL_PAYMENT,
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    const formData = new FormData(event.currentTarget);
    const transferDestination = String(
      formData.get("transferDestination") ?? "",
    );
    setMessage("");
    startTransition(async () => {
      try {
        const result = await submitPaymentRecord({
          target: { kind: "ticket", id: ticket.id },
          file,
          transferDestination,
          paymentType,
          amount: paymentAmount ? Number(paymentAmount) : undefined,
        });
        setMessage(result.message);
        if (result.success) {
          setFile(null);
          setPaymentAmount("");
          setPaymentType(PaymentType.FULL_PAYMENT);
          onOpenChange(false);
          onSuccess();
        }
      } catch (error) {
        console.error("Finance ticket action failed:", error);
        setMessage("Pembayaran gagal diproses. Silakan coba kembali.");
      }
    });
  };
  const purchaseOrder = ticket.purchaseOrders?.[0];
  const amountPaid = ticket.paymentTransactions?.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  ) ?? 0;
  const remainingAmount = Math.max(
    0,
    Number(ticket.totalAmount ?? 0) - amountPaid,
  );
  const defaultDestination =
    purchaseOrder?.paymentBankName && purchaseOrder.paymentAccountNumber
      ? `Ditransfer ke: ${purchaseOrder.paymentBankName} & ${purchaseOrder.paymentAccountNumber}`
      : ticket.bankName && ticket.accountNumber
        ? `Ditransfer ke: ${ticket.bankName} & ${ticket.accountNumber}`
        : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setFile(null);
          setPaymentAmount("");
          setPaymentType(PaymentType.FULL_PAYMENT);
          setMessage("");
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
          <DialogDescription>
            Periksa nilai dan tujuan dana berikut, lalu unggah bukti transfer.
            File PDF, JPG, PNG, atau WEBP maksimal 5 MB.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <section className="space-y-2 rounded-md border p-4 text-sm">
            <p className="font-semibold">
              {ticket.ticketNumber} · {ticket.title}
            </p>
            <p>
              <span className="text-muted-foreground">Biaya: </span>
              <span className="font-semibold">
                {formatCurrency(ticket.totalAmount)}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Sisa tagihan: </span>
              <span className="font-semibold">
                {formatCurrency(String(remainingAmount))}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Nama penerima: </span>
              {ticket.recipientName || "Tidak dicantumkan"}
            </p>
            <p>
              <span className="text-muted-foreground">Bank: </span>
              {ticket.bankName || "Tidak dicantumkan"}
            </p>
            <p>
              <span className="text-muted-foreground">Nomor rekening: </span>
              {ticket.accountNumber || "Tidak dicantumkan"}
            </p>
          </section>
          <label className="block space-y-2 text-sm font-medium">
            Keterangan tujuan transfer
            <Input
              key={ticket.id}
              name="transferDestination"
              defaultValue={defaultDestination}
              placeholder="Ditransfer ke: [Nama Bank] & [Nomor Rekening Vendor]"
              maxLength={300}
              required
              disabled={isPending}
            />
          </label>
          <fieldset className="space-y-2 rounded-md border p-3 text-sm">
            <legend className="px-1 font-medium">Skema pembayaran</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="paymentType"
                checked={paymentType === PaymentType.FULL_PAYMENT}
                onChange={() => setPaymentType(PaymentType.FULL_PAYMENT)}
              />
              Bayar Lunas (Full Payment)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="paymentType"
                checked={paymentType === PaymentType.DOWN_PAYMENT}
                onChange={() => setPaymentType(PaymentType.DOWN_PAYMENT)}
              />
              Bayar Uang Muka (DP) / Sebagian
            </label>
            {paymentType !== PaymentType.FULL_PAYMENT && (
              <label className="block space-y-2 font-medium">
                Nominal DP (Rp)
                <Input
                  type="number"
                  min="0.01"
                  max={Math.max(0, remainingAmount - 0.01)}
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  disabled={isPending}
                />
              </label>
            )}
          </fieldset>
          <label className="block space-y-2 text-sm font-medium">
            Upload Bukti Transfer / Pengiriman Dana
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              required
              disabled={isPending}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {message && (
            <p className="text-sm text-muted-foreground" role="status">
              {message}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Tutup
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={
                !file ||
                isPending ||
                (paymentType !== PaymentType.FULL_PAYMENT &&
                  (!paymentAmount || Number(paymentAmount) <= 0))
              }
            >
              {isPending
                ? "Menyimpan..."
                : paymentType === PaymentType.FULL_PAYMENT
                  ? "Selesaikan Pembayaran"
                  : "Catat Pembayaran DP"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
