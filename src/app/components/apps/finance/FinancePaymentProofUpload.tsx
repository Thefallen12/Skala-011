"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export default function FinancePaymentProofUpload({
  value,
  onChange,
  disabled = false,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const helpId = useId();

  const clearFile = () => {
    onChange(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        disabled={disabled}
        required
        aria-describedby={helpId}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          if (!file) {
            onChange(null);
            setError("");
            return;
          }
          if (!ACCEPTED_TYPES.has(file.type)) {
            setError("Format file harus PDF, JPG, PNG, atau WEBP.");
            onChange(null);
            event.target.value = "";
            return;
          }
          if (file.size < 1 || file.size > MAX_FILE_SIZE) {
            setError("Ukuran file harus lebih dari 0 dan maksimal 5 MB.");
            onChange(null);
            event.target.value = "";
            return;
          }
          setError("");
          onChange(file);
        }}
      />
      {value && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground" role="status">
            File dipilih: {value.name}
          </span>
          <Button
            type="button"
            size="sm"
            variant="link"
            className="h-auto p-0 text-destructive"
            onClick={clearFile}
            disabled={disabled}
          >
            Hapus
          </Button>
        </div>
      )}
      <p id={helpId} className="text-xs text-muted-foreground">
        PDF, JPG, PNG, atau WEBP; maksimal 5 MB.
      </p>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
