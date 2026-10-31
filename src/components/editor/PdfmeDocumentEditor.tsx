"use client";

import { useEffect, useRef, useState } from "react";
import type { Template } from "@pdfme/common";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createBlankPdfmeTemplate } from "@/lib/documents/pdfme-template";

function makeTemplateSerializable(template: Template): Template {
  const basePdf = template.basePdf;
  if (basePdf instanceof ArrayBuffer || basePdf instanceof Uint8Array) {
    const bytes = basePdf instanceof ArrayBuffer ? new Uint8Array(basePdf) : basePdf;
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return { ...template, basePdf: btoa(binary) };
  }
  return template;
}

export default function PdfmeDocumentEditor({
  initialTemplate,
  onChange,
}: {
  initialTemplate: Template | null;
  onChange: (template: Template) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialTemplateRef = useRef(initialTemplate);
  const onChangeRef = useRef(onChange);
  const [error, setError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let designer: { destroy: () => void } | undefined;
    let cancelled = false;

    const mountDesigner = async () => {
      const container = containerRef.current;
      if (!container) return;
      try {
        const [{ Designer }, { barcodes, builtInPlugins, image, table }] =
          await Promise.all([
            import("@pdfme/ui"),
            import("@pdfme/schemas"),
          ]);
        if (cancelled) return;
        const instance = new Designer({
          domContainer: container,
          template: initialTemplateRef.current ?? createBlankPdfmeTemplate(),
          plugins: {
            ...builtInPlugins,
            Image: image,
            Table: table,
            "QR Code": barcodes.qrcode,
          },
          options: { lang: "en" },
        });
        instance.onChangeTemplate((template) => {
          onChangeRef.current(makeTemplateSerializable(template));
          setError("");
        });
        designer = instance;
      } catch (cause) {
        console.error("PDFme designer initialization failed:", cause);
        setError("Editor PDFme gagal dimuat. Muat ulang halaman atau coba kembali.");
      }
    };

    void mountDesigner();
    return () => {
      cancelled = true;
      designer?.destroy();
    };
  }, []);

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Editor tidak tersedia</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div
        ref={containerRef}
        className="min-h-[720px] overflow-hidden rounded-md border bg-white"
        aria-label="PDFme template designer"
      />
      <p className="text-sm text-muted-foreground">
        Atur posisi dan ukuran elemen dengan mouse. Gunakan tipe Text untuk
        variabel seperti nama_proyek atau nomor_dokumen, Table untuk daftar
        barang, Image untuk logo, dan QR Code untuk verifikasi.
      </p>
    </div>
  );
}
