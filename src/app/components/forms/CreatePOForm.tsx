"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPurchaseOrder,
  type OrderActionResult,
} from "@/app/actions/orders";
import {
  createLogisticsPurchaseOrderForTicket,
  saveLogisticsStockItem,
  type TicketActionResult,
} from "@/app/actions/tickets";
import CreateVendorInline, {
  type PurchaseVendorOption,
} from "@/app/components/forms/CreateVendorInline";
import { POPaymentMethod } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import { GlobalModal } from "@/components/ui/global-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CreatePOItem = {
  ticketItemId?: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice?: string | number | null;
};

type FormItem = {
  ticketItemId?: string;
  stockItemId: string;
  itemName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

type CreatePOStockItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  unitPrice: string;
};

const normalizeCatalogValue = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");

export default function CreatePOForm({
  vendors,
  stockItems,
  ticketId,
  ticketItems,
  projectSiteName,
  onCancel,
  onCreated,
}: {
  vendors: PurchaseVendorOption[];
  stockItems: CreatePOStockItem[];
  ticketId?: string;
  ticketItems?: CreatePOItem[];
  projectSiteName?: string;
  onCancel?: () => void;
  onCreated?: (publicCode: string, message: string) => void;
}) {
  const router = useRouter();
  const [vendorId, setVendorId] = useState("");
  const [availableVendors, setAvailableVendors] = useState(vendors);
  const [catalogItems, setCatalogItems] = useState(stockItems);
  const [items, setItems] = useState<FormItem[]>(() =>
    ticketItems?.length
      ? ticketItems.map((item) => {
          const matches = stockItems.filter(
            (stockItem) =>
              normalizeCatalogValue(stockItem.name) ===
                normalizeCatalogValue(item.itemName) &&
              normalizeCatalogValue(stockItem.unit) ===
                normalizeCatalogValue(item.unit),
          );
          const stockItem = matches.length === 1 ? matches[0] : undefined;
          return {
            ticketItemId: item.ticketItemId,
            stockItemId: stockItem?.id ?? "",
            itemName: item.itemName,
            quantity: String(item.quantity),
            unit: item.unit,
            unitPrice:
              item.unitPrice == null
                ? stockItem?.unitPrice ?? ""
                : String(item.unitPrice),
          };
        })
      : [{ stockItemId: "", itemName: "", quantity: "", unit: "", unitPrice: "" }],
  );
  const [includeTax, setIncludeTax] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSavingNewItem, startSavingNewItem] = useTransition();
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("pcs");
  const [newItemError, setNewItemError] = useState("");
  const [newItemTargetIndex, setNewItemTargetIndex] = useState<number | null>(
    null,
  );
  const selectedVendor = availableVendors.find(
    (vendor) => vendor.id === vendorId,
  );
  const hasBankDetails = Boolean(
    selectedVendor?.bankName &&
      selectedVendor.bankAccount &&
      selectedVendor.bankHolder,
  );
  const paymentMethod = hasBankDetails
    ? POPaymentMethod.TRANSFER
    : POPaymentMethod.CASH;
  const siteName = ticketId
    ? projectSiteName || "Proyek dari tiket"
    : "Gudang (tanpa proyek)";

  const updateItem = (index: number, patch: Partial<FormItem>) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const openNewItemDialog = () => {
    const emptyIndex = items.findIndex((item) => !item.stockItemId);
    const targetIndex = ticketId
      ? emptyIndex
      : emptyIndex >= 0
        ? emptyIndex
        : null;
    setNewItemTargetIndex(targetIndex);
    setNewItemName(
      targetIndex === null ? "" : items[targetIndex]?.itemName ?? "",
    );
    setNewItemUnit(
      targetIndex === null ? "pcs" : items[targetIndex]?.unit || "pcs",
    );
    setNewItemError("");
    setNewItemDialogOpen(true);
  };

  const addCatalogItem = () => {
    const name = newItemName.trim();
    const unit = newItemUnit.trim();
    if (!name || !unit) {
      setNewItemError("Nama barang dan satuan wajib diisi.");
      return;
    }

    setNewItemError("");
    startSavingNewItem(async () => {
      try {
        const result = await saveLogisticsStockItem({
          name,
          unit,
          stockQuantity: "0",
          minimumStock: "0",
          unitPrice: "0",
        });
        if (!result.success || !result.stockItem) {
          setNewItemError(result.message);
          return;
        }

        const stockItem = result.stockItem;
        setCatalogItems((current) =>
          current.some((item) => item.id === stockItem.id)
            ? current
            : [...current, stockItem],
        );
        setItems((current) => {
          const targetIndex =
            newItemTargetIndex === null
              ? current.findIndex((item) => !item.stockItemId)
              : newItemTargetIndex;
          const newFormItem: FormItem = {
            ticketItemId: current[targetIndex]?.ticketItemId,
            stockItemId: stockItem.id,
            itemName: ticketId
              ? current[targetIndex]?.itemName ?? stockItem.name
              : stockItem.name,
            quantity: ticketId
              ? current[targetIndex]?.quantity ?? ""
              : "",
            unit: ticketId
              ? current[targetIndex]?.unit ?? stockItem.unit
              : stockItem.unit,
            unitPrice:
              current[targetIndex]?.unitPrice || stockItem.unitPrice || "",
          };

          if (targetIndex >= 0) {
            return current.map((item, index) =>
              index === targetIndex ? newFormItem : item,
            );
          }
          return [...current, newFormItem];
        });
        setNewItemDialogOpen(false);
      } catch (error) {
        console.error("PO stock catalog item creation failed:", error);
        setNewItemError("Barang gagal ditambahkan ke katalog. Coba kembali.");
      }
    });
  };

  const submit = () => {
    const parsedItems = items.map((item) => ({
      ticketItemId: item.ticketItemId,
      stockItemId: item.stockItemId,
      itemName: item.itemName.trim(),
      quantity: Number(item.quantity),
      unit: item.unit.trim(),
      unitPrice: Number(item.unitPrice),
    }));
    if (!selectedVendor) {
      setMessage("Pilih vendor dari katalog sebelum membuat PO.");
      return;
    }
    if (
      parsedItems.length === 0 ||
      parsedItems.some(
        (item) =>
          !item.itemName ||
          !item.stockItemId ||
          !item.unit ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0 ||
          !Number.isFinite(item.unitPrice) ||
          item.unitPrice <= 0,
      )
    ) {
      setMessage(
        "Pilih barang dari katalog, lalu lengkapi jumlah dan harga satuan.",
      );
      return;
    }

    setMessage("");
    startTransition(async () => {
      try {
        const result: OrderActionResult | TicketActionResult = ticketId
          ? await createLogisticsPurchaseOrderForTicket(
              ticketId,
              selectedVendor.name,
              parsedItems,
              {
                vendorId: selectedVendor.id,
                method: paymentMethod,
                bankName: selectedVendor.bankName ?? undefined,
                accountNumber: selectedVendor.bankAccount ?? undefined,
                accountName: selectedVendor.bankHolder ?? undefined,
                includeTax,
              },
            )
          : await createPurchaseOrder({
              vendorId: selectedVendor.id,
              vendorName: selectedVendor.name,
              paymentMethod,
              paymentBankName: selectedVendor.bankName ?? undefined,
              paymentAccountNumber: selectedVendor.bankAccount ?? undefined,
              paymentAccountName: selectedVendor.bankHolder ?? undefined,
              includeTax,
              items: parsedItems,
            });
        setMessage(result.message);
        if (result.success && result.publicCode) {
          onCreated?.(result.publicCode, result.message);
          if (!onCreated) {
            router.push(`/d/${result.publicCode}`);
          }
          router.refresh();
        }
      } catch (error) {
        console.error("Purchase Order submission failed:", error);
        setMessage("PO gagal dibuat. Periksa data lalu coba kembali.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Proyek / Site Project</Label>
          <p className="text-sm font-medium">{siteName}</p>
        </div>
        <div className="space-y-1">
          <Label>Metode pembayaran</Label>
          <p>
            <Badge variant="outline">
              {paymentMethod === POPaymentMethod.TRANSFER ? "Transfer" : "Cash"}
            </Badge>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="create-po-vendor">Vendor</Label>
          <CreateVendorInline
            onCreated={(vendor) => {
              setAvailableVendors((current) =>
                current.some((item) => item.id === vendor.id)
                  ? current
                  : [...current, vendor].sort((a, b) =>
                      a.name.localeCompare(b.name, "id"),
                    ),
              );
              setVendorId(vendor.id);
            }}
          />
        </div>
        <Select
          value={vendorId}
          onValueChange={setVendorId}
          disabled={isPending}
        >
          <SelectTrigger id="create-po-vendor">
            <SelectValue placeholder="Pilih vendor" />
          </SelectTrigger>
          <SelectContent>
            {availableVendors.map((vendor) => (
              <SelectItem key={vendor.id} value={vendor.id}>
                {vendor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {availableVendors.length === 0 && (
          <p className="text-sm text-muted-foreground" role="status">
            Belum ada vendor. Tambahkan vendor untuk melanjutkan pengajuan PO.
          </p>
        )}
      </div>

      {selectedVendor && (
        <div className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-3">
          <p>
            <span className="text-muted-foreground">Bank tujuan:</span>{" "}
            {hasBankDetails ? selectedVendor.bankName : "Tidak digunakan (Cash)"}
          </p>
          <p>
            <span className="text-muted-foreground">No. rekening:</span>{" "}
            {hasBankDetails ? selectedVendor.bankAccount : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Pemilik rekening:</span>{" "}
            {hasBankDetails ? selectedVendor.bankHolder : "—"}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Barang dan harga PO</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              isPending ||
              isSavingNewItem ||
              (Boolean(ticketId) && !items.some((item) => !item.stockItemId))
            }
            onClick={openNewItemDialog}
          >
            Tambah Jenis Barang
          </Button>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barang / SKU</TableHead>
                <TableHead className="w-28">Jumlah</TableHead>
                <TableHead className="w-28">Satuan</TableHead>
                <TableHead className="w-40">Harga satuan (Rp)</TableHead>
                {!ticketId && <TableHead className="w-20">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select
                      value={item.stockItemId}
                      onValueChange={(stockItemId) => {
                        const selectedItem = catalogItems.find(
                          (catalogItem) => catalogItem.id === stockItemId,
                        );
                        if (!selectedItem) return;
                        updateItem(index, {
                          stockItemId,
                          itemName: ticketId ? item.itemName : selectedItem.name,
                          unit: ticketId ? item.unit : selectedItem.unit,
                          unitPrice: ticketId
                            ? item.unitPrice || selectedItem.unitPrice || ""
                            : selectedItem.unitPrice || "",
                        });
                      }}
                      disabled={isPending || isSavingNewItem}
                    >
                      <SelectTrigger
                        aria-label={`Barang katalog ${index + 1}`}
                        className="min-w-48"
                      >
                        <SelectValue placeholder="Pilih barang dan SKU" />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogItems.map((stockItem) => (
                          <SelectItem key={stockItem.id} value={stockItem.id}>
                            {stockItem.name} · {stockItem.sku} ({stockItem.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {ticketId && !item.stockItemId && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Barang belum terdaftar. Tambahkan jenis barang agar bisa
                        melanjutkan PO.
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={`Jumlah barang ${index + 1}`}
                      type="number"
                      min="0.001"
                      step="any"
                      value={item.quantity}
                      disabled={isPending || Boolean(ticketId)}
                      onChange={(event) =>
                        updateItem(index, { quantity: event.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{item.unit || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={`Harga satuan barang ${index + 1}`}
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.unitPrice}
                      disabled={isPending}
                      onChange={(event) =>
                        updateItem(index, { unitPrice: event.target.value })
                      }
                    />
                  </TableCell>
                  {!ticketId && (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isPending || items.length === 1}
                        onClick={() =>
                          setItems((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        Hapus
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-md border p-3">
        <Label htmlFor="create-po-include-tax">Kenakan PPN 11%</Label>
        <Switch
          id="create-po-include-tax"
          checked={includeTax}
          onCheckedChange={setIncludeTax}
          disabled={isPending}
        />
      </div>

      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Batal
          </Button>
        )}
        <Button
          type="button"
          onClick={submit}
          disabled={isPending || availableVendors.length === 0}
        >
          {isPending ? "Membuat PO..." : "Buat Purchase Order"}
        </Button>
      </div>
      <GlobalModal
        isOpen={newItemDialogOpen}
        onClose={() => setNewItemDialogOpen(false)}
        title="Tambah Jenis Barang"
        description="Barang akan disimpan di katalog dengan stok awal nol. SKU dibuat otomatis; jika nama dan satuannya sudah ada, data katalog yang lama akan digunakan."
      >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-po-new-item-name">Nama barang</Label>
              <Input
                id="create-po-new-item-name"
                value={newItemName}
                onChange={(event) => setNewItemName(event.target.value)}
                maxLength={120}
                disabled={isSavingNewItem}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-po-new-item-unit">Satuan</Label>
              <Input
                id="create-po-new-item-unit"
                value={newItemUnit}
                onChange={(event) => setNewItemUnit(event.target.value)}
                maxLength={32}
                disabled={isSavingNewItem}
              />
            </div>
            {newItemError && (
              <p className="text-sm text-destructive" role="alert">
                {newItemError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewItemDialogOpen(false)}
              disabled={isSavingNewItem}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={addCatalogItem}
              disabled={isSavingNewItem}
            >
              Simpan Barang
            </Button>
          </DialogFooter>
      </GlobalModal>
    </div>
  );
}
