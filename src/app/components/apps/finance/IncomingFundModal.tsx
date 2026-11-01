"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CldUploadWidget } from "next-cloudinary";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  recordIncomingFund,
  transferBetweenFinanceAccounts,
} from "@/app/actions/finance-cashflow";
import type {
  FinanceTransferInput,
  IncomingFundInput,
} from "@/app/actions/finance-cashflow";
import { FINANCE_CASHFLOW_CLOUDINARY_FOLDER } from "@/lib/finance-cashflow-config";
import { Button } from "@/components/ui/button";
import { GlobalModal } from "@/components/ui/global-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Upload, Wallet } from "lucide-react";

export type FinanceAccountOption = {
  id: string;
  accountName: string;
  accountNumber: string | null;
  holderName: string;
  balance: number;
};

export type FinanceProjectOption = {
  id: string;
  name: string;
};

type FundFormValues = {
  amount: number;
  sourceDesc: string;
  accountId: string;
  paymentMethod: "TRANSFER" | "CASH" | "DEPOSIT";
  senderName: string;
  proofUrl: string;
  projectId: string;
  sourceAccountId: string;
  destinationAccountId: string;
};

const fundFormSchema = z.object({
  amount: z.number().positive("Nominal harus lebih besar dari nol."),
  sourceDesc: z.string().trim().min(3).max(300),
  accountId: z.string(),
  paymentMethod: z.enum(["TRANSFER", "CASH", "DEPOSIT"]),
  senderName: z.string().max(160),
  proofUrl: z.string().min(1, "Bukti penerimaan wajib diunggah."),
  projectId: z.string(),
  sourceAccountId: z.string(),
  destinationAccountId: z.string(),
});

const proofLabels = {
  TRANSFER: "Unggah Bukti Transfer",
  CASH: "Unggah Foto Kwitansi Tanda Terima",
  DEPOSIT: "Unggah Slip Setoran Bank",
} as const;

const currency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function IncomingFundModal({
  open,
  onClose,
  mode,
  accounts,
  projects,
  cloudinaryCloudName,
  cloudinaryApiKey,
}: {
  open: boolean;
  onClose: () => void;
  mode: "incoming" | "transfer";
  accounts: FinanceAccountOption[];
  projects: FinanceProjectOption[];
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const form = useForm<FundFormValues>({
    resolver: zodResolver(fundFormSchema),
    defaultValues: {
      amount: 0,
      sourceDesc: "",
      accountId: accounts[0]?.id ?? "",
      paymentMethod: "TRANSFER",
      senderName: "",
      proofUrl: "",
      projectId: "",
      sourceAccountId: accounts[0]?.id ?? "",
      destinationAccountId: accounts[1]?.id ?? "",
    },
  });
  const paymentMethod = useWatch({
    control: form.control,
    name: "paymentMethod",
  });
  const proofUrl = useWatch({ control: form.control, name: "proofUrl" });

  useEffect(() => {
    if (!open) return;
    form.reset({
      amount: 0,
      sourceDesc: "",
      accountId: accounts[0]?.id ?? "",
      paymentMethod: "TRANSFER",
      senderName: "",
      proofUrl: "",
      projectId: "",
      sourceAccountId: accounts[0]?.id ?? "",
      destinationAccountId: accounts[1]?.id ?? "",
    });
  }, [accounts, form, mode, open]);

  const handleClose = () => {
    setMessage("");
    setIsError(false);
    onClose();
  };

  const submit = form.handleSubmit(async (values) => {
    if (!proofUrl) {
      form.setError("proofUrl", {
        type: "required",
        message: "Unggah bukti penerimaan terlebih dahulu.",
      });
      return;
    }
    if (mode === "incoming") {
      if (!values.accountId) {
        form.setError("accountId", {
          type: "required",
          message: "Pilih buku bank/kas.",
        });
        return;
      }
      if (values.paymentMethod === "TRANSFER" && !values.senderName.trim()) {
        form.setError("senderName", {
          type: "required",
          message: "Nama pengirim wajib diisi untuk penerimaan transfer.",
        });
        return;
      }
    } else if (
      !values.sourceAccountId ||
      !values.destinationAccountId ||
      values.sourceAccountId === values.destinationAccountId
    ) {
      form.setError("destinationAccountId", {
        type: "validate",
        message: "Pilih akun tujuan yang berbeda dengan akun sumber.",
      });
      return;
    }

    setIsPending(true);
    setMessage("");
    try {
      const result =
        mode === "incoming"
          ? await recordIncomingFund({
              amount: values.amount,
              sourceDesc: values.sourceDesc,
              accountId: values.accountId,
              paymentMethod: values.paymentMethod,
              senderName: values.senderName,
              proofUrl: values.proofUrl,
              projectId: values.projectId || undefined,
            } satisfies IncomingFundInput)
          : await transferBetweenFinanceAccounts({
              amount: values.amount,
              sourceAccountId: values.sourceAccountId,
              destinationAccountId: values.destinationAccountId,
              sourceDesc: values.sourceDesc,
              proofUrl: values.proofUrl,
            } satisfies FinanceTransferInput);
      setMessage(result.message);
      setIsError(!result.success);
      if (result.success) {
        handleClose();
        router.refresh();
      }
    } catch (error) {
      console.error("Cashflow form submission failed:", error);
      setMessage("Transaksi gagal dicatat. Silakan coba kembali.");
      setIsError(true);
    } finally {
      setIsPending(false);
    }
  });

  const modalTitle =
    mode === "incoming" ? "Catat Dana Masuk" : "Transfer Antar Kas";
  const formId = `finance-cashflow-${mode}-form`;

  return (
    <GlobalModal
      isOpen={open}
      onClose={handleClose}
      title={modalTitle}
      icon={<Wallet aria-hidden="true" className="size-5" />}
      description={
        mode === "incoming"
          ? "Catat sumber, metode penerimaan, akun penyimpanan, dan bukti dana masuk."
          : "Pindahkan saldo antar buku secara tercatat dan atomik."
      }
      className="sm:max-w-2xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose}>
            Batal
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={
              isPending || accounts.length === 0 ||
              (mode === "transfer" && accounts.length < 2)
            }
          >
            {isPending ? "Menyimpan..." : "Simpan Transaksi"}
          </Button>
        </>
      }
    >
      {accounts.length === 0 ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Buat akun bank/kas terlebih dahulu sebelum mencatat transaksi.
        </p>
      ) : (
        <form id={formId} className="space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-amount`}>Nominal (Rp)</Label>
            <Input
              id={`${formId}-amount`}
              type="number"
              min="0.01"
              step="0.01"
              {...form.register("amount", { valueAsNumber: true })}
              aria-invalid={Boolean(form.formState.errors.amount)}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-description`}>
              Sumber Dana / Keterangan
            </Label>
            <Input
              id={`${formId}-description`}
              maxLength={300}
              placeholder="Contoh: Pembayaran Termin 1 Project A"
              {...form.register("sourceDesc")}
            />
            {form.formState.errors.sourceDesc && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.sourceDesc.message}
              </p>
            )}
          </div>

          {mode === "incoming" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor={`${formId}-account`}>Disimpan Ke</Label>
                <select
                  id={`${formId}-account`}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  {...form.register("accountId")}
                >
                  <option value="">Pilih buku bank/kas</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountName} · {currency(account.balance)}
                    </option>
                  ))}
                </select>
                {form.formState.errors.accountId && (
                  <p className="text-sm text-destructive" role="alert">
                    {form.formState.errors.accountId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Metode Penerimaan</Label>
                <div className="flex flex-wrap gap-4">
                  {[
                    ["TRANSFER", "Transfer"],
                    ["CASH", "Tunai"],
                    ["DEPOSIT", "Setor Tunai"],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        value={value}
                        {...form.register("paymentMethod")}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              {paymentMethod === "TRANSFER" && (
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-sender`}>
                    Nama Pengirim / Bank Pengirim
                  </Label>
                  <Input
                    id={`${formId}-sender`}
                    maxLength={160}
                    {...form.register("senderName")}
                  />
                  {form.formState.errors.senderName && (
                    <p className="text-sm text-destructive" role="alert">
                      {form.formState.errors.senderName.message}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor={`${formId}-project`}>
                  Proyek terkait (opsional)
                </Label>
                <select
                  id={`${formId}-project`}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  {...form.register("projectId")}
                >
                  <option value="">Tanpa proyek</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${formId}-source-account`}>Akun Sumber</Label>
                <select
                  id={`${formId}-source-account`}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  {...form.register("sourceAccountId")}
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountName} · {currency(account.balance)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${formId}-destination-account`}>
                  Akun Tujuan
                </Label>
                <select
                  id={`${formId}-destination-account`}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  {...form.register("destinationAccountId")}
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountName} · {currency(account.balance)}
                    </option>
                  ))}
                </select>
                {form.formState.errors.destinationAccountId && (
                  <p className="text-sm text-destructive" role="alert">
                    Pilih akun tujuan yang berbeda.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-slate-700 p-4">
            <Label>{mode === "incoming" ? proofLabels[paymentMethod] : "Unggah Bukti Transfer Antar Akun"}</Label>
            {cloudinaryCloudName && cloudinaryApiKey ? (
              <CldUploadWidget
                config={{
                  cloud: {
                    cloudName: cloudinaryCloudName,
                    apiKey: cloudinaryApiKey,
                  },
                }}
                signatureEndpoint="/api/cloudinary/finance-cashflow-signature"
                options={{
                  folder: FINANCE_CASHFLOW_CLOUDINARY_FOLDER,
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
                    form.setValue("proofUrl", result.info.secure_url, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    form.clearErrors("proofUrl");
                  }
                }}
                onError={(error) => {
                  console.error("Cashflow proof upload failed:", error);
                  form.setError("proofUrl", {
                    type: "upload",
                    message: "Bukti gagal diunggah. Silakan coba kembali.",
                  });
                }}
              >
                {({ open: openUpload }) => (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openUpload()}
                    disabled={isPending}
                  >
                    <Upload className="mr-2 size-4" aria-hidden="true" />
                    {proofUrl ? "Ganti Bukti" : proofLabels[paymentMethod]}
                  </Button>
                )}
              </CldUploadWidget>
            ) : (
              <p className="text-sm text-destructive" role="alert">
                Upload bukti tidak tersedia. Periksa konfigurasi Cloudinary.
              </p>
            )}
            {proofUrl && (
              <a
                className="inline-flex items-center gap-1 text-sm text-primary underline"
                href={proofUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-3" aria-hidden="true" />
                Lihat bukti terunggah
              </a>
            )}
            {form.formState.errors.proofUrl && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.proofUrl.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG, atau WEBP; maksimal 5 MB.
            </p>
          </div>
          {message && (
            <p
              className={`text-sm ${isError ? "text-destructive" : "text-emerald-500"}`}
              role={isError ? "alert" : "status"}
            >
              {message}
            </p>
          )}
        </form>
      )}
    </GlobalModal>
  );
}
