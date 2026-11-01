"use client";

import { CldUploadWidget } from "next-cloudinary";
import { ExternalLink, Upload } from "lucide-react";
import { useState } from "react";
import { FINANCE_PAYMENT_PROOF_CLOUDINARY_FOLDER } from "@/lib/finance-payment-proof-config";
import { Button } from "@/components/ui/button";

export default function FinancePaymentProofUpload({
  value,
  onChange,
  cloudinaryCloudName,
  cloudinaryApiKey,
  disabled = false,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  disabled?: boolean;
}) {
  const [error, setError] = useState("");

  if (!cloudinaryCloudName || !cloudinaryApiKey) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Upload bukti transfer tidak tersedia. Periksa konfigurasi Cloudinary.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <CldUploadWidget
        config={{
          cloud: {
            cloudName: cloudinaryCloudName,
            apiKey: cloudinaryApiKey,
          },
        }}
        signatureEndpoint="/api/cloudinary/finance-payment-proof-signature"
        options={{
          folder: FINANCE_PAYMENT_PROOF_CLOUDINARY_FOLDER,
          resourceType: "image",
          sources: ["local", "camera"],
          multiple: false,
          maxFiles: 1,
          maxFileSize: 5 * 1024 * 1024,
          clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
          showPoweredBy: false,
        }}
        onSuccess={(result) => {
          if (
            result.event === "success" &&
            typeof result.info === "object" &&
            result.info !== null &&
            "secure_url" in result.info &&
            typeof result.info.secure_url === "string"
          ) {
            onChange(result.info.secure_url);
            setError("");
          }
        }}
        onError={(uploadError) => {
          console.error("Finance payment proof upload failed:", uploadError);
          setError("Bukti transfer gagal diunggah. Silakan coba kembali.");
        }}
      >
        {({ open }) => (
          <Button
            type="button"
            variant="outline"
            onClick={() => open()}
            disabled={disabled}
          >
            <Upload className="mr-2 size-4" aria-hidden="true" />
            {value ? "Ganti Bukti Transfer" : "Unggah Bukti Transfer"}
          </Button>
        )}
      </CldUploadWidget>
      {value && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Bukti transfer terunggah.</span>
          <Button asChild size="sm" variant="link" className="h-auto p-0">
            <a href={value} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 size-3" aria-hidden="true" />
              Pratinjau
            </a>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="link"
            className="h-auto p-0 text-destructive"
            onClick={() => onChange(null)}
            disabled={disabled}
          >
            Hapus
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        JPG, PNG, atau WEBP; maksimal 5 MB.
      </p>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
