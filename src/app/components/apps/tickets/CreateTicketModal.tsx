"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfDay } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  TicketCategoryHint,
  TicketFieldCategory,
  TicketPriority,
  TicketRequestCategory,
  TicketType,
  UserRole,
} from "@/generated/prisma/enums";
import type { TicketProjectOption } from "@/app/(DashboardLayout)/types/ticket";
import { createTicket } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { GlobalModal } from "@/components/ui/global-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const requestCategories = Object.values(TicketRequestCategory);
const fieldCategories = Object.values(TicketFieldCategory);
const itemCategoryHints = Object.values(TicketCategoryHint);
const priorities = ["NON_URGENT", "URGENT", "EMERGENCY"] as const;

const requestCategoryLabels: Record<TicketRequestCategory, string> = {
  OPS: "Operasional (OPS)",
  MATERIAL: "Belanja Material",
  WAREHOUSE: "Permintaan Material dari Gudang",
  OFFICE: "Belanja Kantor",
  FIELD: "Belanja Kebutuhan Tim Lapangan",
};

const fieldCategoryLabels: Record<TicketFieldCategory, string> = {
  HAULING: "Biaya Langsir",
  LABOR: "Upah Tukang",
  DIRECT_STORE: "Belanja Langsung Ketoko",
};

const ticketFormSchema = z
  .object({
    projectId: z.string(),
    moverAssigneeId: z.string().optional(),
    requestCategory: z.enum(requestCategories),
    fieldCategory: z.enum(fieldCategories).optional(),
    priority: z.enum(priorities),
    neededDate: z.date().optional(),
    items: z
      .array(
        z.object({
          stockItemId: z.string().optional(),
          itemName: z.string().optional(),
          unit: z.string().optional(),
          quantity: z.number().optional(),
          estimatedCost: z.number().optional(),
          categoryHint: z.enum(itemCategoryHints),
          expectedDeliveryDate: z.string().optional(),
        }),
      )
      .max(100, "Maksimal 100 item."),
    recipientName: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    requestedAmount: z
      .number()
      .finite()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
  })
  .superRefine((values, context) => {
    const projectLinkedRequest =
      values.requestCategory === TicketRequestCategory.MATERIAL ||
      values.requestCategory === TicketRequestCategory.WAREHOUSE ||
      values.requestCategory === TicketRequestCategory.FIELD;
    if (projectLinkedRequest && !values.projectId) {
      context.addIssue({
        code: "custom",
        path: ["projectId"],
        message: "Pilih proyek agar biaya dan pengiriman material dapat dilacak.",
      });
    }
    const hasPerItemDeliveryDates =
      values.requestCategory === TicketRequestCategory.MATERIAL ||
      values.requestCategory === TicketRequestCategory.WAREHOUSE;
    if (
      !hasPerItemDeliveryDates &&
      (!values.neededDate || Number.isNaN(values.neededDate.getTime()))
    ) {
      context.addIssue({
        code: "custom",
        path: ["neededDate"],
        message: "Tanggal perlu dibayarkan/disediakan wajib dipilih.",
      });
    }
    if (hasPerItemDeliveryDates) {
      values.items.forEach((item, index) => {
        if (
          item.categoryHint === TicketCategoryHint.WAREHOUSE &&
          !item.stockItemId
        ) {
          context.addIssue({
            code: "custom",
            path: ["items", index, "stockItemId"],
            message:
              "Pilih material dari stok gudang atau ubah sumber barang ke Pembelian Baru.",
          });
        }
        if (
          item.categoryHint === TicketCategoryHint.WAREHOUSE &&
          (!item.expectedDeliveryDate ||
            Number.isNaN(
              new Date(`${item.expectedDeliveryDate}T12:00:00`).getTime(),
            ))
        ) {
          context.addIssue({
            code: "custom",
            path: ["items", index, "expectedDeliveryDate"],
            message: "Tanggal diperlukan wajib diisi untuk barang gudang.",
          });
        }
      });
    }
    if (values.requestCategory === "FIELD" && !values.fieldCategory) {
      context.addIssue({
        code: "custom",
        path: ["fieldCategory"],
        message: "Pilih jenis kebutuhan lapangan.",
      });
    }
    const requiresRecipientPayment =
      values.requestCategory === TicketRequestCategory.FIELD &&
      values.fieldCategory !== undefined &&
      values.fieldCategory !== TicketFieldCategory.DIRECT_STORE;
    if (requiresRecipientPayment) {
      if (!values.recipientName?.trim() || values.recipientName.trim().length > 120) {
        context.addIssue({
          code: "custom",
          path: ["recipientName"],
          message: "Nama penerima wajib diisi (maksimal 120 karakter).",
        });
      }
      if (!values.bankName?.trim() || values.bankName.trim().length > 80) {
        context.addIssue({
          code: "custom",
          path: ["bankName"],
          message: "Nama bank wajib diisi (maksimal 80 karakter).",
        });
      }
      if (!values.accountNumber || !/^[0-9]{6,30}$/.test(values.accountNumber.trim())) {
        context.addIssue({
          code: "custom",
          path: ["accountNumber"],
          message: "Nomor rekening harus berisi 6 sampai 30 angka.",
        });
      }
      if (values.requestedAmount === undefined) {
        context.addIssue({
          code: "custom",
          path: ["requestedAmount"],
          message: "Biaya harus lebih besar dari 0.",
        });
      }
    } else {
      if (values.items.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["items"],
          message: "Tambahkan setidaknya satu rincian item.",
        });
      }
      values.items.forEach((item, index) => {
        if (!item.itemName?.trim() || item.itemName.trim().length > 160) {
          context.addIssue({
            code: "custom",
            path: ["items", index, "itemName"],
            message: "Nama item wajib diisi (maksimal 160 karakter).",
          });
        }
        if (!item.unit?.trim() || item.unit.trim().length > 32) {
          context.addIssue({
            code: "custom",
            path: ["items", index, "unit"],
            message: "Pilih satuan yang valid.",
          });
        }
        if (
          item.quantity === undefined ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0
        ) {
          context.addIssue({
            code: "custom",
            path: ["items", index, "quantity"],
            message: "Qty harus berupa angka lebih besar dari 0.",
          });
        }
        if (
          item.estimatedCost !== undefined &&
          (!Number.isFinite(item.estimatedCost) || item.estimatedCost < 0)
        ) {
          context.addIssue({
            code: "custom",
            path: ["items", index, "estimatedCost"],
            message: "Harga satuan tidak boleh negatif.",
          });
        }
      });
    }
  });

type TicketFormValues = z.infer<typeof ticketFormSchema>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function CreateTicketModal({
  projects,
  stockItems = [],
  requesterRole,
  movers = [],
  triggerLabel = "Tambah Tiket Baru",
  initialWageRequest,
}: {
  projects: TicketProjectOption[];
  stockItems?: Array<{
    id: string;
    name: string;
    unit: string;
    stockQuantity: string;
  }>;
  requesterRole?: UserRole;
  movers?: Array<{ id: string; name: string }>;
  triggerLabel?: string;
  initialWageRequest?: {
    projectId: string;
    projectTitle: string;
    workPointTitle: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [priceEditIndex, setPriceEditIndex] = useState<number | null>(null);
  const [priceEditValue, setPriceEditValue] = useState("");
  const [requestedAmountEdit, setRequestedAmountEdit] = useState<string | null>(
    null,
  );
  const router = useRouter();
  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      projectId: initialWageRequest?.projectId ?? "",
      moverAssigneeId: "",
      requestCategory: initialWageRequest
        ? TicketRequestCategory.FIELD
        : TicketRequestCategory.MATERIAL,
      fieldCategory: initialWageRequest
        ? TicketFieldCategory.LABOR
        : undefined,
      priority: "NON_URGENT",
      neededDate: undefined,
      items: [{
        itemName: "",
        unit: "pcs",
        quantity: 1,
        estimatedCost: undefined,
        categoryHint: TicketCategoryHint.WAREHOUSE,
        expectedDeliveryDate: "",
      }],
      recipientName: "",
      bankName: "",
      accountNumber: "",
      requestedAmount: undefined,
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const requestCategory = useWatch({
    control: form.control,
    name: "requestCategory",
  });
  const fieldCategory = useWatch({
    control: form.control,
    name: "fieldCategory",
  });
  const watchedRequestedAmount = useWatch({
    control: form.control,
    name: "requestedAmount",
  });
  const showMoverSelection =
    requesterRole === UserRole.FIELD_TEAM &&
    (requestCategory === TicketRequestCategory.MATERIAL ||
      requestCategory === TicketRequestCategory.WAREHOUSE);
  const requiresRecipientPayment =
    requestCategory === TicketRequestCategory.FIELD &&
    fieldCategory !== undefined &&
    fieldCategory !== TicketFieldCategory.DIRECT_STORE;
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const usesItemDeliveryDates =
    requestCategory === TicketRequestCategory.MATERIAL ||
    requestCategory === TicketRequestCategory.WAREHOUSE;
  const totalAmount = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (total, item) =>
          total +
            Math.round(
              (Number.isFinite(item.quantity) ? item.quantity ?? 0 : 0) *
                (Number.isFinite(item.estimatedCost)
                  ? item.estimatedCost ?? 0
                  : 0) *
                100,
            ) /
              100,
          0,
        ),
    [watchedItems],
  );

  const submit = form.handleSubmit(async (values) => {
    setError("");
    if (!usesItemDeliveryDates && !values.neededDate) {
      setError("Pilih tanggal perlu dibayarkan/disediakan terlebih dahulu.");
      return;
    }
    if (
      showMoverSelection &&
      (!values.moverAssigneeId ||
        !movers.some((mover) => mover.id === values.moverAssigneeId))
    ) {
      setError("Pilih Mover untuk permintaan material Tim Lapangan.");
      return;
    }
    const categoryLabel = requestCategoryLabels[values.requestCategory];
    const subCategoryLabel = values.fieldCategory
      ? fieldCategoryLabels[values.fieldCategory]
      : undefined;
    const firstItemName = values.items[0]?.itemName?.trim() ?? "";
    const title = requiresRecipientPayment
      ? `${subCategoryLabel}: ${values.recipientName?.trim()}`.slice(0, 160)
      : `${categoryLabel}: ${firstItemName}`.slice(0, 160);
    const description = [
      `Jenis permintaan: ${categoryLabel}`,
      subCategoryLabel ? `Sub-menu lapangan: ${subCategoryLabel}` : null,
      initialWageRequest
        ? `Proyek: ${initialWageRequest.projectTitle}\nTitik kerja: ${initialWageRequest.workPointTitle}`
        : null,
      values.neededDate
        ? `Tanggal perlu dibayarkan/disediakan: ${format(values.neededDate, "yyyy-MM-dd")}`
        : null,
      ...values.items.flatMap((item) =>
        item.categoryHint === TicketCategoryHint.WAREHOUSE &&
        item.expectedDeliveryDate
          ? [
              `Tanggal diperlukan ${item.itemName?.trim() || "barang"}: ${item.expectedDeliveryDate}`,
            ]
          : [],
      ),
    ]
      .filter(Boolean)
      .join("\n");

    // Material and direct-to-store requests are routed to Logistics by the workflow action.
    const ticketType =
      values.requestCategory === "OPS"
        ? TicketType.OPERATIONAL
        : values.requestCategory === "MATERIAL" ||
              values.requestCategory === TicketRequestCategory.WAREHOUSE ||
              (values.requestCategory === "FIELD" &&
              values.fieldCategory === "DIRECT_STORE")
          ? TicketType.MATERIAL
          : TicketType.COST;
    const priority =
      values.priority === "EMERGENCY"
        ? TicketPriority.URGENT
        : values.priority === "URGENT"
          ? TicketPriority.HIGH
          : TicketPriority.LOW;

    try {
      const result = await createTicket({
        title,
        description,
        type: ticketType,
        requestCategory: values.requestCategory,
        fieldCategory: values.fieldCategory,
        priority,
        projectId: values.projectId || undefined,
        moverAssigneeId: showMoverSelection
          ? values.moverAssigneeId
          : undefined,
        recipientName: requiresRecipientPayment
          ? values.recipientName
          : undefined,
        bankName: requiresRecipientPayment ? values.bankName : undefined,
        accountNumber: requiresRecipientPayment
          ? values.accountNumber
          : undefined,
        requestedAmount: requiresRecipientPayment
          ? values.requestedAmount
          : undefined,
        items: requiresRecipientPayment
          ? []
          : values.items.map((item) => ({
              ...(item.stockItemId
                ? { stockItemId: item.stockItemId }
                : {}),
              itemName: item.itemName ?? "",
              quantity: item.quantity ?? 0,
              unit: item.unit ?? "",
              estimatedCost: item.estimatedCost,
              categoryHint: item.categoryHint,
              expectedDeliveryDate:
                item.categoryHint === TicketCategoryHint.WAREHOUSE
                  ? item.expectedDeliveryDate
                  : undefined,
          })),
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setOpen(false);
      form.reset();
      setRequestedAmountEdit(null);
      router.refresh();
    } catch (submitError) {
      console.error("Ticket form submission failed:", submitError);
      setError("Tiket gagal disimpan. Periksa koneksi lalu coba kembali.");
    }
  }, (invalidFields) => {
    const messages = [
      invalidFields.neededDate?.message,
      invalidFields.projectId?.message,
      invalidFields.requestCategory?.message,
      invalidFields.fieldCategory?.message,
      invalidFields.recipientName?.message,
      invalidFields.bankName?.message,
      invalidFields.accountNumber?.message,
      invalidFields.requestedAmount?.message,
      invalidFields.items?.root?.message,
      invalidFields.items?.message,
      ...(Array.isArray(invalidFields.items)
        ? invalidFields.items.flatMap((item) => [
            item?.itemName?.message,
            item?.unit?.message,
            item?.quantity?.message,
            item?.estimatedCost?.message,
            item?.expectedDeliveryDate?.message,
          ])
        : []),
    ].filter((message): message is string => Boolean(message));
    setError(
      messages.length > 0
        ? `Tiket belum dikirim: ${messages.join(" ")}`
        : "Tiket belum dikirim. Periksa data wajib yang ditandai, lalu coba lagi.",
    );
  });

  return (
    <>
        <Button
          type="button"
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          <Plus aria-hidden="true" />
          {triggerLabel}
        </Button>
      <GlobalModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Tambah tiket ERP"
        description="Isi proyek, jenis permintaan, data penerima atau rincian item, prioritas, dan tanggal kebutuhan."
        className="max-w-4xl"
      >
        {error && (
          <p
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ticket-project">Pilih Proyek</Label>
              <Controller
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger
                      id="ticket-project"
                      className="w-full"
                      aria-invalid={!!form.formState.errors.projectId}
                    >
                      <SelectValue placeholder="Pilih proyek" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {requestCategory === TicketRequestCategory.MATERIAL ||
                        requestCategory === TicketRequestCategory.WAREHOUSE ||
                        requestCategory === TicketRequestCategory.FIELD
                          ? "Pilih proyek"
                          : "Tidak terkait proyek"}
                      </SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.kelompokTani} - {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.projectId && (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.projectId.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-request-category">Jenis Permintaan</Label>
              <Controller
                control={form.control}
                name="requestCategory"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value !== "FIELD") {
                        form.setValue("fieldCategory", undefined);
                        form.clearErrors("fieldCategory");
                      }
                      if (value === TicketRequestCategory.WAREHOUSE) {
                        form.setValue(
                          "items",
                          [{
                            stockItemId: "",
                            itemName: "",
                            unit: "",
                            quantity: 1,
                            estimatedCost: undefined,
                            categoryHint: TicketCategoryHint.WAREHOUSE,
                            expectedDeliveryDate: "",
                          }],
                          { shouldValidate: true },
                        );
                      }
                    }}
                  >
                    <SelectTrigger
                      id="ticket-request-category"
                      className="w-full"
                      aria-invalid={!!form.formState.errors.requestCategory}
                    >
                      <SelectValue placeholder="Pilih jenis permintaan" />
                    </SelectTrigger>
                    <SelectContent>
                      {requestCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {requestCategoryLabels[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.requestCategory && (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.requestCategory.message}
                </p>
              )}
            </div>

            {requestCategory === "FIELD" && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ticket-field-category">Kebutuhan Lapangan</Label>
                <Controller
                  control={form.control}
                  name="fieldCategory"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? undefined : value)
                      }
                    >
                      <SelectTrigger
                        id="ticket-field-category"
                        className="w-full md:max-w-[calc(50%-0.5rem)]"
                        aria-invalid={!!form.formState.errors.fieldCategory}
                      >
                        <SelectValue placeholder="Pilih kebutuhan lapangan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          Pilih kebutuhan lapangan
                        </SelectItem>
                        {fieldCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {fieldCategoryLabels[category]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.fieldCategory && (
                  <p className="text-sm text-destructive" role="alert">
                    {form.formState.errors.fieldCategory.message}
                  </p>
                )}
              </div>
            )}

            {showMoverSelection && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ticket-mover-assignee">
                  Mover untuk pengiriman
                </Label>
                <Controller
                  control={form.control}
                  name="moverAssigneeId"
                  render={({ field }) => (
                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? "" : value)
                      }
                    >
                      <SelectTrigger
                        id="ticket-mover-assignee"
                        className="w-full md:max-w-[calc(50%-0.5rem)]"
                      >
                        <SelectValue placeholder="Pilih Mover" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Pilih Mover</SelectItem>
                        {movers.map((mover) => (
                          <SelectItem key={mover.id} value={mover.id}>
                            {mover.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {movers.length === 0 && (
                  <p className="text-sm text-destructive" role="alert">
                    Belum ada Mover aktif. Hubungi Administrator.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Pilihan Mover hanya untuk permintaan material yang dibuat Tim
                  Lapangan.
                </p>
              </div>
            )}
          </div>

          <section className="space-y-3">
            {requiresRecipientPayment ? (
              <div className="space-y-4 rounded-md border p-4">
                <div>
                  <h3 className="font-semibold">Data Penerima Pembayaran</h3>
                  <p className="text-sm text-muted-foreground">
                    Permintaan biaya lapangan tidak memerlukan rincian material.
                    Keuangan akan menggunakan data ini sebagai tujuan transfer.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ticket-recipient">Nama Penerima</Label>
                    <Input
                      id="ticket-recipient"
                      autoComplete="name"
                      placeholder="Nama pemilik rekening"
                      aria-invalid={!!form.formState.errors.recipientName}
                      {...form.register("recipientName")}
                    />
                    {form.formState.errors.recipientName && (
                      <p className="text-sm text-destructive" role="alert">
                        {form.formState.errors.recipientName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticket-bank">Nama Bank</Label>
                    <Input
                      id="ticket-bank"
                      placeholder="Contoh: BRI"
                      aria-invalid={!!form.formState.errors.bankName}
                      {...form.register("bankName")}
                    />
                    {form.formState.errors.bankName && (
                      <p className="text-sm text-destructive" role="alert">
                        {form.formState.errors.bankName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticket-account-number">Nomor Rekening</Label>
                    <Input
                      id="ticket-account-number"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Nomor rekening penerima"
                      aria-invalid={!!form.formState.errors.accountNumber}
                      {...form.register("accountNumber")}
                    />
                    {form.formState.errors.accountNumber && (
                      <p className="text-sm text-destructive" role="alert">
                        {form.formState.errors.accountNumber.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticket-requested-amount">Biaya</Label>
                    <div className="flex h-10 items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/50">
                      <span className="pl-3 text-sm text-muted-foreground">
                        Rp
                      </span>
                      <Input
                        id="ticket-requested-amount"
                        type="text"
                        inputMode="numeric"
                        className="h-full border-0 shadow-none focus-visible:ring-0"
                        placeholder="0"
                        aria-invalid={!!form.formState.errors.requestedAmount}
                        value={
                          requestedAmountEdit ??
                          (watchedRequestedAmount === undefined
                            ? ""
                            : new Intl.NumberFormat("id-ID", {
                                maximumFractionDigits: 0,
                              }).format(watchedRequestedAmount))
                        }
                        onFocus={() =>
                          setRequestedAmountEdit(
                            form.getValues("requestedAmount")?.toString() ?? "",
                          )
                        }
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, "");
                          setRequestedAmountEdit(digits);
                          form.setValue(
                            "requestedAmount",
                            digits ? Number(digits) : undefined,
                            { shouldDirty: true, shouldValidate: true },
                          );
                        }}
                        onBlur={() => {
                          setRequestedAmountEdit(null);
                          void form.trigger("requestedAmount");
                        }}
                      />
                    </div>
                    {form.formState.errors.requestedAmount && (
                      <p className="text-sm text-destructive" role="alert">
                        {form.formState.errors.requestedAmount.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Rincian Item</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    itemName: "",
                    unit: "pcs",
                    quantity: 1,
                    estimatedCost: undefined,
                    categoryHint: TicketCategoryHint.WAREHOUSE,
                    expectedDeliveryDate: "",
                  })
                }
                disabled={fields.length >= 100}
              >
                <Plus aria-hidden="true" />
                Tambah Item
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid items-start gap-3 rounded-md border p-3 md:grid-cols-2 xl:grid-cols-4"
                >
                  {usesItemDeliveryDates && (
                    <div className="space-y-2">
                      <Label htmlFor={`ticket-source-${index}`}>
                        Sumber Barang
                      </Label>
                      <Controller
                        control={form.control}
                        name={`items.${index}.categoryHint`}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(value: TicketCategoryHint) => {
                              field.onChange(value);
                              form.setValue(`items.${index}.expectedDeliveryDate`, "");
                              form.setValue(`items.${index}.stockItemId`, "");
                              form.setValue(`items.${index}.itemName`, "");
                              form.setValue(`items.${index}.unit`, "");
                              form.setValue(`items.${index}.estimatedCost`, undefined);
                              form.clearErrors([
                                `items.${index}.stockItemId`,
                                `items.${index}.itemName`,
                                `items.${index}.unit`,
                                `items.${index}.expectedDeliveryDate`,
                              ]);
                            }}
                          >
                            <SelectTrigger
                              id={`ticket-source-${index}`}
                              className="w-full"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={TicketCategoryHint.WAREHOUSE}>
                                Gudang (Stok)
                              </SelectItem>
                              <SelectItem value={TicketCategoryHint.PURCHASE}>
                                Pembelian Baru
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}
                  {usesItemDeliveryDates &&
                  watchedItems?.[index]?.categoryHint ===
                    TicketCategoryHint.WAREHOUSE ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor={`ticket-stock-item-${index}`}>
                          Barang dari stok gudang
                        </Label>
                        <Controller
                          control={form.control}
                          name={`items.${index}.stockItemId`}
                          render={({ field: stockField }) => (
                            <Select
                              value={stockField.value || "none"}
                              onValueChange={(value) => {
                                const stockItem = stockItems.find(
                                  (item) => item.id === value,
                                );
                                stockField.onChange(
                                  value === "none" ? "" : value,
                                );
                                form.setValue(
                                  `items.${index}.itemName`,
                                  stockItem?.name ?? "",
                                );
                                form.setValue(
                                  `items.${index}.unit`,
                                  stockItem?.unit ?? "",
                                );
                                form.setValue(
                                  `items.${index}.estimatedCost`,
                                  undefined,
                                );
                              }}
                            >
                              <SelectTrigger
                                id={`ticket-stock-item-${index}`}
                                className="w-full"
                                aria-invalid={
                                  !!form.formState.errors.items?.[index]?.stockItemId
                                }
                              >
                                <SelectValue placeholder="Pilih material gudang" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  Pilih material gudang
                                </SelectItem>
                                {stockItems.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name} · {item.unit} · tersedia{" "}
                                    {item.stockQuantity}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {form.formState.errors.items?.[index]?.stockItemId && (
                          <p
                            className="text-sm text-destructive"
                            role="alert"
                            id={`ticket-stock-item-error-${index}`}
                          >
                            {form.formState.errors.items[index]?.stockItemId?.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`ticket-unit-${index}`}>Satuan</Label>
                        <Controller
                          control={form.control}
                          name={`items.${index}.unit`}
                          render={({ field }) => (
                            <Input
                              id={`ticket-unit-${index}`}
                              value={field.value ?? ""}
                              readOnly
                            />
                          )}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor={`ticket-item-${index}`}>
                          Nama Material/Item
                        </Label>
                        <Input
                          id={`ticket-item-${index}`}
                          placeholder="Nama item"
                          aria-invalid={!!form.formState.errors.items?.[index]?.itemName}
                          {...form.register(`items.${index}.itemName`)}
                        />
                        {form.formState.errors.items?.[index]?.itemName && (
                          <p className="text-sm text-destructive" role="alert">
                            {form.formState.errors.items[index]?.itemName?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`ticket-unit-${index}`}>Satuan</Label>
                        <Input
                          id={`ticket-unit-${index}`}
                          placeholder="Masukkan satuan (contoh: ikat)"
                          maxLength={32}
                          aria-invalid={!!form.formState.errors.items?.[index]?.unit}
                          {...form.register(`items.${index}.unit`)}
                        />
                        {form.formState.errors.items?.[index]?.unit && (
                          <p className="text-sm text-destructive" role="alert">
                            {form.formState.errors.items[index]?.unit?.message}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor={`ticket-quantity-${index}`}>Qty</Label>
                    <Input
                      id={`ticket-quantity-${index}`}
                      type="number"
                      min="0.001"
                      step="any"
                      aria-invalid={
                        !!form.formState.errors.items?.[index]?.quantity
                      }
                      {...form.register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                    />
                    {form.formState.errors.items?.[index]?.quantity && (
                      <p className="text-sm text-destructive" role="alert">
                        {form.formState.errors.items[index]?.quantity?.message}
                      </p>
                    )}
                  </div>

                  {usesItemDeliveryDates &&
                    watchedItems?.[index]?.categoryHint ===
                      TicketCategoryHint.WAREHOUSE && (
                      <div className="space-y-2">
                        <Label htmlFor={`ticket-delivery-date-${index}`}>
                          Tanggal Diperlukan
                        </Label>
                        <Input
                          id={`ticket-delivery-date-${index}`}
                          type="date"
                          required
                          value={watchedItems[index]?.expectedDeliveryDate ?? ""}
                          min={format(new Date(), "yyyy-MM-dd")}
                          onChange={(event) =>
                            form.setValue(
                              `items.${index}.expectedDeliveryDate`,
                              event.target.value,
                              { shouldDirty: true, shouldValidate: true },
                            )
                          }
                          aria-invalid={
                            !!form.formState.errors.items?.[index]
                              ?.expectedDeliveryDate
                          }
                        />
                        {form.formState.errors.items?.[index]
                          ?.expectedDeliveryDate && (
                          <p className="text-sm text-destructive" role="alert">
                            {
                              form.formState.errors.items[index]
                                ?.expectedDeliveryDate?.message
                            }
                          </p>
                        )}
                      </div>
                    )}

                  {(requestCategory !== TicketRequestCategory.WAREHOUSE ||
                    watchedItems?.[index]?.categoryHint ===
                      TicketCategoryHint.PURCHASE) && (
                  <div className="space-y-2">
                    <Label htmlFor={`ticket-price-${index}`}>Harga Satuan</Label>
                    <Controller
                      control={form.control}
                      name={`items.${index}.estimatedCost`}
                      render={({ field: priceField }) => (
                        <div className="flex h-10 items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/50">
                          <span className="pl-3 text-sm text-muted-foreground">
                            Rp
                          </span>
                          <Input
                            id={`ticket-price-${index}`}
                            type="text"
                            inputMode="numeric"
                            className="h-full border-0 shadow-none focus-visible:ring-0"
                            placeholder="0"
                            value={
                              priceEditIndex === index
                                ? priceEditValue
                                : priceField.value === undefined
                                  ? ""
                                  : new Intl.NumberFormat("id-ID", {
                                      maximumFractionDigits: 0,
                                    }).format(priceField.value)
                            }
                            onFocus={() => {
                              setPriceEditIndex(index);
                              setPriceEditValue(
                                priceField.value === undefined
                                  ? ""
                                  : String(priceField.value),
                              );
                            }}
                            onChange={(event) => {
                              const digits = event.target.value.replace(/\D/g, "");
                              setPriceEditValue(digits);
                              priceField.onChange(
                                digits === "" ? undefined : Number(digits),
                              );
                            }}
                            onBlur={() => {
                              priceField.onBlur();
                              setPriceEditIndex(null);
                              setPriceEditValue("");
                            }}
                            aria-invalid={
                              !!form.formState.errors.items?.[index]
                                ?.estimatedCost
                            }
                          />
                        </div>
                      )}
                    />
                    {form.formState.errors.items?.[index]?.estimatedCost && (
                      <p className="text-sm text-destructive" role="alert">
                        {
                          form.formState.errors.items[index]?.estimatedCost
                            ?.message
                        }
                      </p>
                    )}
                  </div>
                  )}

                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="justify-self-end"
                      aria-label={`Hapus item ${index + 1}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {(form.formState.errors.items?.root?.message ||
              form.formState.errors.items?.message) && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.items.root?.message ||
                  form.formState.errors.items.message}
              </p>
            )}

            {(requestCategory !== TicketRequestCategory.WAREHOUSE ||
              watchedItems?.some(
                (item) => item.categoryHint === TicketCategoryHint.PURCHASE,
              )) && (
              <p className="text-right font-semibold">
                Total estimasi: {formatCurrency(totalAmount)}
              </p>
            )}
              </>
            )}
          </section>

          <div className="space-y-2">
            <Label>Tingkat Prioritas</Label>
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid gap-3 sm:grid-cols-3"
                  aria-label="Tingkat Prioritas"
                >
                  <Label
                    htmlFor="priority-non-urgent"
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm",
                      field.value === "NON_URGENT" &&
                        "border-green-600 text-green-700 dark:text-green-400",
                    )}
                  >
                    <RadioGroupItem
                      id="priority-non-urgent"
                      value="NON_URGENT"
                    />
                    Non-Urgent
                  </Label>
                  <Label
                    htmlFor="priority-urgent"
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm",
                      field.value === "URGENT" &&
                        "border-amber-500 text-amber-700 dark:text-amber-400",
                    )}
                  >
                    <RadioGroupItem id="priority-urgent" value="URGENT" />
                    Urgent
                  </Label>
                  <Label
                    htmlFor="priority-emergency"
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm",
                      field.value === "EMERGENCY" &&
                        "border-destructive text-destructive",
                    )}
                  >
                    <RadioGroupItem
                      id="priority-emergency"
                      value="EMERGENCY"
                    />
                    Emergency
                  </Label>
                </RadioGroup>
              )}
            />
          </div>

          {!usesItemDeliveryDates && (
            <div className="space-y-2">
              <Label>Tanggal Perlu Dibayarkan/Disediakan</Label>
              <Controller
                control={form.control}
                name="neededDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal md:max-w-[calc(50%-0.5rem)]",
                          !field.value && "text-muted-foreground",
                        )}
                        aria-invalid={!!form.formState.errors.neededDate}
                      >
                        <CalendarDays aria-hidden="true" />
                        {field.value
                          ? format(field.value, "d MMMM yyyy", { locale: id })
                          : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={{ before: startOfDay(new Date()) }}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {form.formState.errors.neededDate && (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.neededDate.message}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={form.formState.isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              aria-busy={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Mengirim..." : "Simpan draft"}
            </Button>
          </div>
        </form>
      </GlobalModal>
    </>
  );
}
