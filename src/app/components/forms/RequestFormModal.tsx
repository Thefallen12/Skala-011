"use client";

import { CldUploadWidget } from "next-cloudinary";
import {
  Check,
  FileText,
  FolderOpen,
  Paperclip,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GlobalModal } from "@/components/ui/global-modal";
import { REQUEST_DOCUMENT_CLOUDINARY_FOLDER } from "@/lib/request-document-config";

type RequestKind = "MATERIAL" | "OPERATIONAL";

export type RequestProjectOption = {
  id: string;
  projectName: string;
  projectCode?: string | null;
};

export type RequestAssigneeOption = {
  id: string;
  name: string;
  profilePhotoUrl?: string | null;
};

export type RequestFormValues = {
  requestKind: RequestKind;
  projectId: string;
  category: string;
  itemName: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  picId: string;
  description: string;
  documentUrls: string[];
};

type UploadedDocument = {
  url: string;
  name: string;
};

const requestCategories = [
  "Material/Bahan",
  "Operasional Lapangan",
  "Logistik",
  "Lain-lain",
];

function formatRupiahInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

export default function RequestFormModal({
  isOpen,
  onClose,
  projects,
  assignees,
  cloudinaryCloudName,
  cloudinaryApiKey,
  onSubmit,
  isSubmitting = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  projects: RequestProjectOption[];
  assignees: RequestAssigneeOption[];
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  onSubmit: (values: RequestFormValues) => Promise<void>;
  isSubmitting?: boolean;
}) {
  const [requestKind, setRequestKind] = useState<RequestKind>("MATERIAL");
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState("Material/Bahan");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [picId, setPicId] = useState("");
  const [description, setDescription] = useState("");
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");

  const handleClose = () => {
    setError("");
    setUploadError("");
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const parsedQuantity = Number(quantity);
    const parsedCost = Number(estimatedCost.replace(/\D/g, ""));

    if (!projectId || !category || !itemName.trim() || !picId) {
      setError("Lengkapi proyek, kategori, nama kebutuhan, dan PIC.");
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Jumlah/kuantitas harus lebih besar dari nol.");
      return;
    }
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      setError("Estimasi biaya tidak valid.");
      return;
    }
    if (!description.trim()) {
      setError("Deskripsi atau catatan wajib diisi.");
      return;
    }
    if (documents.length === 0) {
      setError("Unggah minimal satu bukti atau dokumen pendukung.");
      return;
    }

    try {
      await onSubmit({
        requestKind,
        projectId,
        category,
        itemName: itemName.trim(),
        quantity: parsedQuantity,
        unit: unit.trim(),
        estimatedCost: parsedCost,
        picId,
        description: description.trim(),
        documentUrls: documents.map((document) => document.url),
      });
      handleClose();
    } catch (submitError) {
      console.error("Request form submission failed:", submitError);
      setError("Pengajuan gagal dikirim. Silakan coba kembali.");
    }
  };

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <>
          <span className="flex size-9 items-center justify-center rounded-lg bg-orange-500/15 text-orange-300">
            <FolderOpen className="size-5" aria-hidden="true" />
          </span>
          Pengajuan Request &amp; Operasional
        </>
      }
      description="Lengkapi formulir untuk permintaan material/bahan atau pengajuan biaya operasional proyek."
      className="sm:max-w-4xl"
      footerNote="* Pastikan seluruh data telah sesuai dengan kebutuhan dan pagu anggaran proyek."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            form="request-form"
            disabled={isSubmitting}
            className="bg-orange-500 text-white hover:bg-orange-600"
          >
            <Check className="size-4" aria-hidden="true" />
            {isSubmitting ? "Mengirim..." : "Kirim Pengajuan"}
            <Send className="size-4" aria-hidden="true" />
          </Button>
        </>
      }
    >
      <form id="request-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-700 bg-slate-950/40 p-1">
          {(
            [
              ["MATERIAL", "Request Material & Bahan"],
              ["OPERATIONAL", "Biaya Operasional"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setRequestKind(value);
                setCategory(
                  value === "MATERIAL" ? "Material/Bahan" : "Operasional Lapangan",
                );
              }}
              className={`min-h-10 rounded-md px-3 text-sm transition ${
                requestKind === value
                  ? "border border-orange-400/70 bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
              aria-pressed={requestKind === value}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300" htmlFor="request-project">
              Pilih Proyek <span className="text-orange-400">*</span>
            </Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="request-project" className="w-full border-slate-700 bg-slate-800 text-slate-100">
                <SelectValue placeholder="Pilih proyek terkait" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.projectCode
                      ? `${project.projectCode} - ${project.projectName}`
                      : project.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300" htmlFor="request-item">
              Nama Barang / Kebutuhan <span className="text-orange-400">*</span>
            </Label>
            <Input
              id="request-item"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              maxLength={160}
              required
              placeholder="Contoh: Semen Padang PC 50 kg"
              className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300" htmlFor="request-category">
              Kategori Pengeluaran <span className="text-orange-400">*</span>
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="request-category" className="w-full border-slate-700 bg-slate-800 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {requestCategories.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-slate-300" htmlFor="request-quantity">
                Jumlah / Kuantitas <span className="text-orange-400">*</span>
              </Label>
              <Input
                id="request-quantity"
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
                placeholder="100"
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300" htmlFor="request-unit">
                Satuan
              </Label>
              <Input
                id="request-unit"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                maxLength={32}
                placeholder="Sak"
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300" htmlFor="request-estimated-cost">
              Estimasi Biaya / Anggaran <span className="text-orange-400">*</span>
            </Label>
            <div className="flex h-9 items-center rounded-md border border-slate-700 bg-slate-800 focus-within:ring-2 focus-within:ring-orange-400/50">
              <span className="px-3 text-sm text-slate-400">Rp</span>
              <Input
                id="request-estimated-cost"
                inputMode="numeric"
                value={estimatedCost}
                onChange={(event) =>
                  setEstimatedCost(formatRupiahInput(event.target.value))
                }
                required
                placeholder="12.500.000"
                className="h-full border-0 bg-transparent text-slate-100 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300" htmlFor="request-pic">
              PIC / Penanggung Jawab <span className="text-orange-400">*</span>
            </Label>
            <Select value={picId} onValueChange={setPicId}>
              <SelectTrigger id="request-pic" className="w-full border-slate-700 bg-slate-800 text-slate-100">
                <SelectValue placeholder="Pilih penanggung jawab" />
              </SelectTrigger>
              <SelectContent>
                {assignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    <span className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarImage
                          src={assignee.profilePhotoUrl ?? undefined}
                          alt=""
                        />
                        <AvatarFallback className="bg-slate-700 text-[10px] text-slate-100">
                          {assignee.name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {assignee.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-1">
            <Label className="text-slate-300" htmlFor="request-description">
              Deskripsi / Catatan Tambahan{" "}
              <span className="text-orange-400">*</span>
            </Label>
            <Textarea
              id="request-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={3000}
              required
              placeholder="Deskripsi, catatan spesifikasi, urgensi, atau tujuan pengeluaran"
              className="min-h-28 resize-y border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">
              Unggah Bukti / Dokumen{" "}
              <span className="text-orange-400">*</span>
            </Label>
            {cloudinaryCloudName && cloudinaryApiKey ? (
              <CldUploadWidget
                config={{
                  cloud: {
                    cloudName: cloudinaryCloudName,
                    apiKey: cloudinaryApiKey,
                  },
                }}
                signatureEndpoint="/api/cloudinary/request-document-signature"
                options={{
                  folder: REQUEST_DOCUMENT_CLOUDINARY_FOLDER,
                  resourceType: "auto",
                  sources: ["local", "camera"],
                  multiple: true,
                  maxFiles: 5,
                  maxFileSize: 10 * 1024 * 1024,
                  clientAllowedFormats: [
                    "pdf",
                    "jpg",
                    "jpeg",
                    "png",
                    "webp",
                    "doc",
                    "docx",
                    "xls",
                    "xlsx",
                  ],
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
                    const info = result.info;
                    const name =
                      "original_filename" in info &&
                      typeof info.original_filename === "string"
                        ? info.original_filename
                        : "Dokumen pendukung";
                    setDocuments((current) =>
                      current.some((document) => document.url === info.secure_url)
                        ? current
                        : [...current, { url: info.secure_url, name }],
                    );
                    setUploadError("");
                  }
                }}
                onError={(error) => {
                  console.error("Request supporting document upload failed:", error);
                  setUploadError(
                    "Dokumen gagal diunggah. Silakan coba kembali.",
                  );
                }}
              >
                {({ open }) => (
                  <button
                    type="button"
                    onClick={() => open()}
                    className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-600 bg-slate-800/60 px-4 py-3 text-center text-sm text-slate-400 transition hover:border-orange-400/70 hover:bg-slate-800 hover:text-slate-200"
                  >
                    <span className="flex gap-3 text-slate-300">
                      <Paperclip className="size-5" aria-hidden="true" />
                      <Upload className="size-5" aria-hidden="true" />
                    </span>
                    <span>Unggah dokumen pendukung / estimasi vendor</span>
                    <span className="text-xs">PDF, JPG, PNG, DOCX, XLSX · maks. 10 MB/file</span>
                  </button>
                )}
              </CldUploadWidget>
            ) : (
              <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive" role="alert">
                Upload dokumen tidak tersedia. Periksa konfigurasi Cloudinary.
              </p>
            )}
            {documents.length > 0 ? (
              <ul className="space-y-1">
                {documents.map((document) => (
                  <li
                    key={document.url}
                    className="flex items-center justify-between gap-2 rounded border border-slate-700 px-2 py-1.5 text-xs text-slate-300"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="size-4 shrink-0 text-orange-300" aria-hidden="true" />
                      <span className="truncate">{document.name}</span>
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0 text-slate-400 hover:text-red-300"
                      aria-label={`Hapus ${document.name}`}
                      onClick={() =>
                        setDocuments((current) =>
                          current.filter((entry) => entry.url !== document.url),
                        )
                      }
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            {uploadError ? (
              <p className="text-sm text-destructive" role="alert">
                {uploadError}
              </p>
            ) : null}
          </div>
        </div>
        {error ? (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
      </form>
    </GlobalModal>
  );
}
