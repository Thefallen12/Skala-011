"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";
import { ExternalLink, Send, Upload } from "lucide-react";
import {
  markPurchaseOrderSentToVendor,
  submitPurchaseOrderInvoice,
} from "@/app/actions/orders";
import type { VendorInvoiceInput } from "@/lib/invoice-input";
import { PURCHASE_ORDER_INVOICE_CLOUDINARY_FOLDER } from "@/lib/purchase-order-invoice-config";
import InvoiceDetailsFields, {
  type InvoiceDraft,
} from "@/app/components/apps/logistics/InvoiceDetailsFields";
import { Button } from "@/components/ui/button";
import { GlobalModal } from "@/components/ui/global-modal";

type InvoiceItemSeed = {
  itemCode: string | null;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

function createInvoiceDraft(items: InvoiceItemSeed[]): InvoiceDraft {
  return {
    invoiceNumber: "",
    periodOrDate: new Date().toLocaleDateString("id-ID"),
    paymentMethod: "",
    bankAccount: "",
    tax: 0,
    deduction: 0,
    items: items.map((item) => ({
      itemCode: item.itemCode ?? "",
      description: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
    })),
  };
}

export default function PurchaseOrderInvoiceUpload({
  publicCode,
  invoiceUrl,
  invoiceId,
  vendorPoSentAt,
  ticketLinked,
  items,
  includeTax,
  cloudinaryCloudName,
  cloudinaryApiKey,
}: {
  publicCode: string;
  invoiceUrl: string | null;
  invoiceId: string | null;
  vendorPoSentAt: string | null;
  ticketLinked: boolean;
  items: InvoiceItemSeed[];
  includeTax: boolean;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [draft, setDraft] = useState(() => {
    const seed = createInvoiceDraft(items);
    if (includeTax) {
      seed.tax = Math.round(
        seed.items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0,
        ) * 0.11,
      );
    }
    return seed;
  });

  const markPoSent = async () => {
    setIsPending(true);
    setMessage("");
    try {
      const response = await markPurchaseOrderSentToVendor(publicCode);
      setMessage(response.message);
      setIsError(!response.success);
      if (response.success) router.refresh();
    } catch (error) {
      console.error("Purchase order vendor dispatch failed:", error);
      setMessage("Pengiriman PO gagal dicatat. Silakan coba kembali.");
      setIsError(true);
    } finally {
      setIsPending(false);
    }
  };

  const submitInvoice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadedUrl) {
      setMessage("Unggah file invoice/bon terlebih dahulu.");
      setIsError(true);
      return;
    }
    setIsPending(true);
    setMessage("");
    const input: VendorInvoiceInput = { ...draft, documentUrl: uploadedUrl };
    try {
      const response = await submitPurchaseOrderInvoice(publicCode, input);
      setMessage(response.message);
      setIsError(!response.success);
      if (response.success) {
        setIsOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Purchase order invoice submission failed:", error);
      setMessage("Invoice gagal dikirim ke Keuangan. Silakan coba kembali.");
      setIsError(true);
    } finally {
      setIsPending(false);
    }
  };

  if (!vendorPoSentAt) {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={markPoSent}
          disabled={isPending}
        >
          <Send className="mr-2 size-4" aria-hidden="true" />
          {isPending ? "Menyimpan..." : "Tandai PO Dikirim ke Vendor"}
        </Button>
        {message && (
          <p
            className={`text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`}
            role={isError ? "alert" : "status"}
          >
            {message}
          </p>
        )}
      </div>
    );
  }

  if (invoiceUrl) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          PO ditandai dikirim {new Date(vendorPoSentAt).toLocaleString("id-ID")}.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="link" className="h-auto p-0">
            <a href={invoiceUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 size-3" aria-hidden="true" />
              Lihat invoice/bon
            </a>
          </Button>
          {invoiceId && (
            <Button asChild size="sm" variant="link" className="h-auto p-0">
              <a
                href={`/api/documents/transactions?kind=INVOICE&id=${encodeURIComponent(invoiceId)}`}
                target="_blank"
                rel="noreferrer"
              >
                Cetak Invoice
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (ticketLinked) {
    return (
      <p className="text-sm text-muted-foreground">
        PO dikirim. Invoice/bon dan rincian tagihan dicatat melalui detail tiket.
      </p>
    );
  }

  if (!cloudinaryCloudName || !cloudinaryApiKey) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Upload invoice tidak tersedia. Periksa konfigurasi Cloudinary.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          PO ditandai dikirim {new Date(vendorPoSentAt).toLocaleString("id-ID")}.
        </p>
        <Button type="button" size="sm" onClick={() => setIsOpen(true)}>
          <Upload className="mr-2 size-4" aria-hidden="true" />
          Catat Invoice Vendor
        </Button>
        {message && (
          <p
            className={`text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`}
            role={isError ? "alert" : "status"}
          >
            {message}
          </p>
        )}
      </div>
      <GlobalModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Invoice / Bon Vendor"
        description="Masukkan rincian sesuai invoice yang diterima; Keuangan menggunakan nilai ini untuk pembayaran."
        className="sm:max-w-5xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button form="purchase-order-invoice-form" type="submit" disabled={isPending}>
              {isPending ? "Mengirim..." : "Simpan & Kirim ke Keuangan"}
            </Button>
          </>
        }
      >
        <form
          id="purchase-order-invoice-form"
          className="max-h-[70vh] space-y-5 overflow-y-auto px-1"
          onSubmit={submitInvoice}
        >
          <InvoiceDetailsFields
            idPrefix={`po-invoice-${publicCode}`}
            value={draft}
            onChange={setDraft}
          />
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Dokumen Invoice / Bon</p>
            <CldUploadWidget
              config={{ cloud: { cloudName: cloudinaryCloudName, apiKey: cloudinaryApiKey } }}
              signatureEndpoint="/api/cloudinary/purchase-order-invoice-signature"
              options={{
                folder: PURCHASE_ORDER_INVOICE_CLOUDINARY_FOLDER,
                resourceType: "auto",
                sources: ["local", "camera"],
                multiple: false,
                maxFiles: 1,
                maxFileSize: 5 * 1024 * 1024,
                clientAllowedFormats: ["pdf", "jpg", "jpeg", "png", "webp"],
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
                  setUploadedUrl(result.info.secure_url);
                  setMessage("Dokumen berhasil diunggah. Simpan untuk mengirim invoice ke Keuangan.");
                  setIsError(false);
                }
              }}
              onError={(error) => {
                console.error("Purchase order invoice upload failed:", error);
                setMessage("Invoice gagal diunggah. Silakan coba kembali.");
                setIsError(true);
              }}
            >
              {({ open }) => (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => open()}
                  disabled={isPending}
                >
                  <Upload className="mr-2 size-4" aria-hidden="true" />
                  {uploadedUrl ? "Ganti File Invoice" : "Unggah Invoice via Cloudinary"}
                </Button>
              )}
            </CldUploadWidget>
            {uploadedUrl && (
              <p className="text-sm text-muted-foreground">
                Dokumen invoice sudah diunggah dan siap disimpan.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG, atau WEBP; maksimal 5 MB.
            </p>
          </div>
          {message && (
            <p
              className={`text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`}
              role={isError ? "alert" : "status"}
            >
              {message}
            </p>
          )}
        </form>
      </GlobalModal>
    </>
  );
}
