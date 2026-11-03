"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  Menu,
  Minus,
  Plus,
  Printer,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type UniversalDocumentPreviewProps = {
  title: string;
  src: string;
  documentNumber: string;
  onCreateTemplate?: () => void;
};

export default function UniversalDocumentPreview({
  title,
  src,
  documentNumber,
  onCreateTemplate,
}: UniversalDocumentPreviewProps) {
  const [zoom, setZoom] = useState(90);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const previewSrc = `${src}${src.includes("?") ? "&" : "?"}format=html`;

  const resetPreviewScroll = () => {
    previewViewportRef.current?.scrollTo({ top: 0, left: 0 });
  };

  useEffect(() => {
    const viewport = previewViewportRef.current;
    if (!viewport) return;

    const frame = requestAnimationFrame(() => {
      viewport.scrollTo({ top: 0, left: 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [previewSrc]);

  const printDocument = () => {
    const printWindow = window.open(
      previewSrc,
      "_blank",
      "noopener,noreferrer",
    );
    if (!printWindow) return;
    printWindow.addEventListener("load", () => printWindow.print(), {
      once: true,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-700 bg-[#3f4145] shadow-inner">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-600 bg-[#25272b] px-3 py-2 text-slate-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-slate-200 hover:bg-slate-700 hover:text-white"
          aria-label="Buka menu viewer"
        >
          <Menu className="size-4" />
        </Button>
        <span className="mr-auto max-w-48 truncate text-sm font-medium">
          {documentNumber}
        </span>
        <span className="hidden items-center gap-1 text-xs text-slate-300 sm:flex">
          1 / 1
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-slate-200 hover:bg-slate-700 hover:text-white"
          aria-label="Perkecil pratinjau"
          onClick={() => setZoom((value) => Math.max(50, value - 10))}
        >
          <Minus className="size-4" />
        </Button>
        <span className="w-10 text-center text-xs text-slate-200">{zoom}%</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-slate-200 hover:bg-slate-700 hover:text-white"
          aria-label="Perbesar pratinjau"
          onClick={() => setZoom((value) => Math.min(150, value + 10))}
        >
          <Plus className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-slate-200 hover:bg-slate-700 hover:text-white"
          aria-label="Muat ulang pratinjau"
          onClick={() => setZoom(90)}
        >
          <Redo2 className="size-4" />
        </Button>
        {onCreateTemplate && (
          <Button
            type="button"
            size="sm"
            className="bg-orange-500 text-white hover:bg-orange-600"
            onClick={onCreateTemplate}
          >
            <Plus className="mr-1.5 size-4" />
            Buat Template
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            const link = document.createElement("a");
            link.href = src;
            link.download = `${documentNumber}.pdf`;
            link.click();
          }}
        >
          <Download className="mr-1.5 size-4" />
          <span className="hidden sm:inline">Unduh / Download</span>
          <span className="sm:hidden">Unduh</span>
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={printDocument}>
          <Printer className="mr-1.5 size-4" />
          <span className="hidden sm:inline">Cetak / Print</span>
          <span className="sm:hidden">Cetak</span>
        </Button>
      </div>
      <div
        ref={previewViewportRef}
        className="flex min-h-0 flex-1 justify-start overflow-auto p-4 sm:p-6"
      >
        <div
          className="relative mx-auto shrink-0"
          style={{
            width: `calc(210mm * ${zoom / 100})`,
            height: `calc(297mm * ${zoom / 100})`,
          }}
        >
          <div
            className="absolute left-0 top-0 h-[297mm] w-[210mm] origin-top-left bg-white shadow-2xl"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <iframe
              title={title}
              src={previewSrc}
              scrolling="no"
              onLoad={resetPreviewScroll}
              className="block h-full w-full overflow-hidden border-0 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
