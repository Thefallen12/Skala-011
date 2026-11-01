"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { replaceFinancePaymentProof } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { GlobalModal } from "@/components/ui/global-modal";
import { Input } from "@/components/ui/input";

export default function FinancePaymentProofReplacement({
  paymentTransactionId,
  label,
  onSaved,
}: {
  paymentTransactionId: string;
  label: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitReplacement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!proofFile) {
      setMessage("Pilih foto pengganti sebelum menyimpan.");
      return;
    }

    const selectedFile = proofFile;
    setMessage("");
    startTransition(async () => {
      try {
        const result = await replaceFinancePaymentProof(
          paymentTransactionId,
          selectedFile,
        );
        if (!result.success) {
          setMessage(result.message);
          return;
        }

        setOpen(false);
        setProofFile(null);
        onSaved();
      } catch (error) {
        console.error("Finance payment proof replacement failed:", error);
        setMessage("Bukti transfer gagal diperbarui. Silakan coba kembali.");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={(event) => {
          event.stopPropagation();
          setMessage("");
          setOpen(true);
        }}
      >
        Unggah Ulang
      </Button>
      <GlobalModal
        isOpen={open}
        onClose={() => {
          if (isPending) return;
          setOpen(false);
          setProofFile(null);
          setMessage("");
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        title="Unggah Ulang Bukti Transfer"
        description={`Pilih file pengganti untuk ${label}. Foto diunggah ke Cloudinary, sedangkan PDF disimpan sebagai aset privat Cloudinary.`}
        className="sm:max-w-xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setProofFile(null);
                setMessage("");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="finance-proof-replacement-form"
              disabled={isPending || !proofFile}
            >
              {isPending ? "Mengunggah dan menyimpan..." : "Simpan Bukti"}
            </Button>
          </>
        }
      >
          <form
            id="finance-proof-replacement-form"
            className="space-y-4"
            onSubmit={submitReplacement}
          >
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => {
                setProofFile(event.target.files?.[0] ?? null);
                setMessage("");
              }}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG, atau WEBP; maksimal 5 MB.
            </p>
            {proofFile && (
              <p className="text-sm text-muted-foreground" role="status">
                File dipilih: {proofFile.name}
              </p>
            )}
            {message && (
              <p className="text-sm text-destructive" role="alert">
                {message}
              </p>
            )}
          </form>
      </GlobalModal>
    </>
  );
}
