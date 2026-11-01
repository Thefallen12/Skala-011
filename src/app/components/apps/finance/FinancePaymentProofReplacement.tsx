"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { replaceFinancePaymentProof } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen && !isPending) {
            setProofFile(null);
            setMessage("");
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <form className="space-y-4" onSubmit={submitReplacement}>
            <DialogHeader>
              <DialogTitle>Unggah Ulang Bukti Transfer</DialogTitle>
              <DialogDescription>
                Pilih file pengganti untuk {label}. Foto diunggah ke Cloudinary,
                sedangkan PDF disimpan sebagai aset privat Cloudinary.
              </DialogDescription>
            </DialogHeader>
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending || !proofFile}>
                {isPending ? "Mengunggah dan menyimpan..." : "Simpan Bukti"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
