"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { importProjects } from "@/app/actions/project";
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
import { Label } from "@/components/ui/label";

type ImportProjectRow = {
  code: string;
  title: string;
  pagu: string | number;
  jenisPekerjaan: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  status: string;
};

const columns = [
  "Kode Proyek",
  "Nama Proyek",
  "Pagu Anggaran",
  "Jenis Pekerjaan",
  "Desa",
  "Kecamatan",
  "Kabupaten",
  "Status",
] as const;

function normalizeAmount(value: unknown): string | number {
  if (typeof value === "number") return value;
  const text = String(value ?? "").trim().replace(/[^\d,.-]/g, "");
  if (text.includes(",") && text.includes(".")) {
    return text.lastIndexOf(",") > text.lastIndexOf(".")
      ? text.replace(/\./g, "").replace(",", ".")
      : text.replace(/,/g, "");
  }
  if (text.includes(",")) return text.replace(",", ".");
  if (/^\d{1,3}(?:\.\d{3})+$/.test(text)) return text.replace(/\./g, "");
  return text;
}

function cellValue(value: ExcelJS.CellValue): unknown {
  if (typeof value === "string" || typeof value === "number") return value;
  if (value && typeof value === "object" && "text" in value) return value.text;
  if (value && typeof value === "object" && "result" in value) return value.result;
  return "";
}

export default function ImportProjectModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [rows, setRows] = useState<ImportProjectRow[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const readFile = async (file?: File) => {
    setRows([]);
    setMessage("");
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setMessage("Pilih file .xlsx, .xls, atau .csv.");
      return;
    }

    try {
      let headers: string[];
      let records: Record<string, unknown>[];
      if (/\.csv$/i.test(file.name)) {
        const parsedCsv = Papa.parse<Record<string, unknown>>(await file.text(), {
          header: true,
          skipEmptyLines: "greedy",
          transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),
        });
        if (parsedCsv.errors.length) {
          setMessage(`Format CSV tidak valid: ${parsedCsv.errors[0].message}`);
          return;
        }
        headers = parsedCsv.meta.fields ?? [];
        records = parsedCsv.data;
      } else {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const sheet = workbook.worksheets[0];
        if (!sheet) {
          setMessage("File tidak memiliki lembar kerja.");
          return;
        }
        headers = Array.from({ length: sheet.columnCount }, (_, index) =>
          sheet.getRow(1).getCell(index + 1).text.trim(),
        );
        records = [];
        for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
          const row = sheet.getRow(rowIndex);
          records.push(
            Object.fromEntries(
              headers.map((header, index) => [
                header,
                cellValue(row.getCell(index + 1).value),
              ]),
            ),
          );
        }
      }
      records = records.filter((record) =>
        Object.values(record).some((value) => String(value ?? "").trim() !== ""),
      );
      if (!records.length) {
        setMessage("File belum berisi data proyek.");
        return;
      }
      const missingHeaders = columns.filter(
        (column) => !headers.includes(column),
      );
      if (missingHeaders.length) {
        setMessage(`Header tidak lengkap: ${missingHeaders.join(", ")}.`);
        return;
      }
      const importedRows = records.map((record) => ({
        code: String(record["Kode Proyek"] ?? "").trim(),
        title: String(record["Nama Proyek"] ?? "").trim(),
        pagu: normalizeAmount(record["Pagu Anggaran"]),
        jenisPekerjaan: String(record["Jenis Pekerjaan"] ?? "").trim(),
        desa: String(record["Desa"] ?? "").trim(),
        kecamatan: String(record["Kecamatan"] ?? "").trim(),
        kabupaten: String(record["Kabupaten"] ?? "").trim(),
        status: String(record.Status ?? "").trim(),
      }));
      setRows(importedRows);
      setMessage(`${importedRows.length} baris siap diimpor.`);
    } catch (error) {
      console.error("Reading project import file failed:", error);
      setMessage("File gagal dibaca. Pastikan file Excel/CSV tidak rusak.");
    }
  };

  const submitImport = () => {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await importProjects(rows);
        setMessage(result.message);
        if (result.success) {
          setRows([]);
          router.refresh();
        }
      } catch (error) {
        console.error("Project import action failed:", error);
        setMessage("Impor proyek gagal. Silakan coba kembali.");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setRows([]);
          setMessage("");
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Proyek</DialogTitle>
          <DialogDescription>
            Unggah berkas Excel atau CSV dengan header sesuai template. Maksimal
            500 baris; kode proyek yang sudah terdaftar akan dilewati.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="project-import-file">File proyek (.xlsx, .xls, .csv)</Label>
          <Input
            id="project-import-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={isPending}
            onChange={(event) => void readFile(event.target.files?.[0])}
          />
          <a
            className="inline-block text-sm font-medium text-primary underline underline-offset-4"
            href="/api/projects/template-csv"
          >
            Download Template CSV
          </a>
          {rows.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {rows.length} baris terdeteksi. Contoh: {rows[0]?.code} ·{" "}
              {rows[0]?.title} · {rows[0]?.pagu}
            </p>
          )}
          {message && (
            <p className="text-sm" role="status">
              {message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={isPending || rows.length === 0}
            onClick={submitImport}
          >
            {isPending ? "Mengimpor..." : `Impor ${rows.length || ""} Proyek`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
