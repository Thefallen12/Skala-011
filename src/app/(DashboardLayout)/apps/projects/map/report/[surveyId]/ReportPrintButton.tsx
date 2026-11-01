"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function ReportPrintButton() {
  return (
    <Button
      type="button"
      className="print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="mr-2 size-4" />
      Download / Cetak PDF
    </Button>
  );
}
