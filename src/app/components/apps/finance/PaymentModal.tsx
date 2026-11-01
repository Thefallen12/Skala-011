"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { TicketActionResult } from "@/app/actions/tickets";
import FinancePaymentProofUpload from "@/app/components/apps/finance/FinancePaymentProofUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlobalModal } from "@/components/ui/global-modal";
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
  cloudinaryCloudName,
  cloudinaryApiKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: PaymentModalTarget | null;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  onPay: (
    proof: string | File,
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
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
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
    const proof = receiptUrl ?? pdfFile;
    if (!target || !proof) {
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
        proof,
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
      setReceiptUrl(null);
      setPdfFile(null);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
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
    <GlobalModal
      isOpen={open}
      onClose={() => {
        if (isPending) return;
        setReceiptUrl(null);
        setPdfFile(null);
        setMessage("");
        if (pdfInputRef.current) pdfInputRef.current.value = "";
        onOpenChange(false);
      }}
      title="Bayar / Transfer"
      description={
        target
          ? `${target.reference} · ${target.title}`
          : "Pilih tagihan yang akan dibayar."
      }
      className="sm:max-w-xl"
    >
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
                  <Label>Bukti Transfer</Label>
                  <FinancePaymentProofUpload
                    value={receiptUrl}
                    onChange={(url) => {
                      setReceiptUrl(url);
                      if (url) {
                        setPdfFile(null);
                        if (pdfInputRef.current) pdfInputRef.current.value = "";
                      }
                    }}
                    cloudinaryCloudName={cloudinaryCloudName}
                    cloudinaryApiKey={cloudinaryApiKey}
                    disabled={isPending}
                  />
                  <label className="grid gap-2 text-sm">
                    Atau pilih PDF bukti transfer privat (maksimal 5 MB)
                    <Input
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={isPending}
                      onChange={(event) => {
                        const selected = event.target.files?.[0] ?? null;
                        if (
                          selected &&
                          (selected.type !== "application/pdf" ||
                            selected.size > 5 * 1024 * 1024)
                        ) {
                          setPdfFile(null);
                          event.target.value = "";
                          setMessage(
                            selected.size > 5 * 1024 * 1024
                              ? "Ukuran PDF maksimal 5 MB."
                              : "Format file harus PDF.",
                          );
                          setIsMessageError(true);
                          return;
                        }
                        setMessage("");
                        setIsMessageError(false);
                        setPdfFile(selected);
                        if (selected) setReceiptUrl(null);
                      }}
                    />
                    {pdfFile && (
                      <span className="text-xs text-muted-foreground" role="status">
                        PDF dipilih: {pdfFile.name}
                      </span>
                    )}
                  </label>
                </div>
                <Button
                  type="submit"
                  disabled={isPending || (!receiptUrl && !pdfFile)}
                >
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
    </GlobalModal>
  );
}
