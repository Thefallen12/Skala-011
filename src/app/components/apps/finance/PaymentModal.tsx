"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { TicketActionResult } from "@/app/actions/tickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentType } from "@/generated/prisma/enums";

export type PaymentModalTarget = {
  id: string;
  reference: string;
  title: string;
  grandTotal: number;
  paidAmount: number;
  transferDestination: string;
};

const currency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const isPaymentType = (value: string): value is PaymentType =>
  Object.values(PaymentType).some((paymentType) => paymentType === value);

export default function PaymentModal({
  open,
  onOpenChange,
  target,
  onPay,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: PaymentModalTarget | null;
  onPay: (
    file: File,
    transferDestination: string,
    paymentType: PaymentType,
    amount: number,
  ) => Promise<TicketActionResult>;
}) {
  const router = useRouter();
  const [paidAmount, setPaidAmount] = useState(target?.paidAmount ?? 0);
  const [amount, setAmount] = useState(() =>
    target
      ? String(Math.max(0, target.grandTotal - target.paidAmount))
      : "",
  );
  const [paymentType, setPaymentType] = useState<PaymentType>(
    PaymentType.FULL_PAYMENT,
  );
  const [destination, setDestination] = useState(
    target?.transferDestination ?? "",
  );
  const [receipt, setReceipt] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isMessageError, setIsMessageError] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [requiresReload, setRequiresReload] = useState(false);
  const remainingBalance = target
    ? Math.round((target.grandTotal - paidAmount) * 100) / 100
    : 0;
  const remainingAmount = Math.max(0, remainingBalance);
  const isSettled = remainingBalance <= 0;
  const paymentStatus =
    isSettled
      ? "LUNAS"
      : paidAmount > 0
        ? "DIBAYAR SEBAGIAN"
        : "BELUM DIBAYAR";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target || !receipt) {
      setMessage("Pilih bukti transfer terlebih dahulu.");
      setIsMessageError(true);
      return;
    }
    const transferAmount = Number(amount);
    if (
      !destination.trim() ||
      !Number.isFinite(transferAmount) ||
      transferAmount <= 0 ||
      transferAmount > remainingAmount ||
      (paymentType === PaymentType.FULL_PAYMENT &&
        transferAmount !== remainingAmount) ||
      (paymentType !== PaymentType.FULL_PAYMENT &&
        transferAmount >= remainingAmount)
    ) {
      setMessage(
        paymentType === PaymentType.FULL_PAYMENT
          ? "Nominal pelunasan harus sama dengan sisa tagihan."
          : "Nominal DP/termin harus lebih kecil dari sisa tagihan.",
      );
      setIsMessageError(true);
      return;
    }

    setMessage("");
    setRequiresReload(false);
    setIsPending(true);
    try {
      const result = await onPay(
        receipt,
        destination.trim(),
        paymentType,
        transferAmount,
      );
      setMessage(result.message);
      setIsMessageError(!result.success);
      if (!result.success) {
        router.refresh();
        return;
      }

      const updatedPaid = Math.min(
        target.grandTotal,
        Math.round((paidAmount + transferAmount) * 100) / 100,
      );
      setPaidAmount(updatedPaid);
      const updatedRemaining = Math.max(
        0,
        Math.round((target.grandTotal - updatedPaid) * 100) / 100,
      );
      setAmount(String(updatedRemaining));
      setPaymentType(PaymentType.FULL_PAYMENT);
      setReceipt(null);
      const fileInput = document.getElementById(
        "payment-modal-receipt",
      ) as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      router.refresh();
    } catch (error) {
      console.error("Finance payment submission failed:", error);
      const isStaleServerAction =
        error instanceof Error &&
        /(?:Server Action.*not found|Failed to find Server Action)/i.test(
          error.message,
        );
      setRequiresReload(isStaleServerAction);
      setMessage(
        isStaleServerAction
          ? "Halaman memakai versi aplikasi lama. Muat ulang halaman, lalu kirim pembayaran kembali. Pembayaran ini belum tercatat."
          : "Pembayaran gagal diproses. Silakan coba kembali.",
      );
      setIsMessageError(true);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bayar / Transfer</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.reference} · ${target.title}`
              : "Pilih tagihan yang akan dibayar."}
          </DialogDescription>
        </DialogHeader>
        {target && (
          <form className="space-y-4" onSubmit={submit}>
            <section className="grid gap-2 rounded-lg border p-4 text-sm sm:grid-cols-3">
              <p>
                Tagihan
                <strong className="mt-1 block">{currency(target.grandTotal)}</strong>
              </p>
              <p>
                Total Terbayar
                <strong className="mt-1 block">{currency(paidAmount)}</strong>
              </p>
              <p>
                Sisa Hutang
                <strong className="mt-1 block">{currency(remainingAmount)}</strong>
                <Badge
                  className="mt-1"
                  variant={
                    isSettled
                      ? "success"
                      : paidAmount > 0
                        ? "warning"
                        : "error"
                  }
                >
                  {paymentStatus}
                </Badge>
              </p>
            </section>
            {!isSettled ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="payment-modal-amount">
                      Nominal Transfer (Rp)
                    </Label>
                    <Input
                      id="payment-modal-amount"
                      type="number"
                      min="0.01"
                      max={remainingAmount}
                      step="0.01"
                      required
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      disabled={
                        isPending || paymentType === PaymentType.FULL_PAYMENT
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-modal-type">Jenis Pembayaran</Label>
                    <Select
                      value={paymentType}
                      onValueChange={(value) => {
                        if (isPaymentType(value)) {
                          setPaymentType(value);
                          if (value === PaymentType.FULL_PAYMENT) {
                            setAmount(String(remainingAmount));
                          }
                        }
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger id="payment-modal-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PaymentType.DOWN_PAYMENT}>
                          Down Payment
                        </SelectItem>
                        <SelectItem value={PaymentType.PROGRESS_PAYMENT}>
                          Progress Payment (Termin)
                        </SelectItem>
                        <SelectItem value={PaymentType.FULL_PAYMENT}>
                          Pelunasan
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-modal-destination">
                    Ditransfer Ke (Bank/Rekening/Atas Nama)
                  </Label>
                  <Input
                    id="payment-modal-destination"
                    maxLength={300}
                    required
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    disabled={isPending}
                    placeholder="Nama bank, nomor rekening, atas nama"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-modal-receipt">
                    Upload Struk/Bukti Transfer
                  </Label>
                  <Input
                    id="payment-modal-receipt"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    required
                    disabled={isPending}
                    onChange={(event) =>
                      setReceipt(event.target.files?.[0] ?? null)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    PDF/JPG/PNG/WEBP, maksimal 5 MB.
                  </p>
                </div>
                <Button type="submit" disabled={isPending || !receipt}>
                  {isPending ? "Memproses..." : "Simpan Pembayaran"}
                </Button>
              </>
            ) : (
              <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                PO ini sudah lunas.
              </p>
            )}
            {message && (
              <div className="space-y-2">
                <p
                  className={`text-sm ${isMessageError ? "text-destructive" : "text-muted-foreground"}`}
                  role={isMessageError ? "alert" : "status"}
                >
                  {message}
                </p>
                {requiresReload && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Muat Ulang Halaman
                  </Button>
                )}
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
