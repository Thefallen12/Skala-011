"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createDirectStockPurchase,
  saveLogisticsStockItem,
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

type PurchaseStockItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  unitPrice: string;
};

type PurchaseTicket = {
  id: string;
  ticketNumber: string;
  title: string;
};

type PurchaseLine = {
  key: number;
  stockItemId: string;
  quantity: string;
  unitPrice: string;
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function DirectStockPurchaseForm({
  stockItems,
  vendors,
  tickets = [],
  onCancel,
  onCreated,
}: {
  stockItems: PurchaseStockItem[];
  vendors: PurchaseVendorOption[];
  tickets?: PurchaseTicket[];
  onCancel?: () => void;
  onCreated?: (message: string) => void;
}) {
  const router = useRouter();
  const nextRowKey = useRef(1);
  const [items, setItems] = useState<PurchaseLine[]>([
    { key: 0, stockItemId: "", quantity: "", unitPrice: "" },
  ]);
  const [catalogItems, setCatalogItems] = useState(stockItems);
  const [vendorId, setVendorId] = useState("");
  const [availableVendors, setAvailableVendors] = useState(vendors);
  const [ticketId, setTicketId] = useState("");
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("pcs");
  const [newItemMessage, setNewItemMessage] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [includeTax, setIncludeTax] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSavingNewItem, startSavingNewItem] = useTransition();

  const vendor = availableVendors.find(
    (candidate) => candidate.id === vendorId,
  );
  const hasBankDetails = Boolean(
    vendor?.bankName && vendor.bankAccount && vendor.bankHolder,
  );
  const paymentMethod = hasBankDetails
    ? POPaymentMethod.TRANSFER
    : POPaymentMethod.CASH;
  const subtotal = items.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0),
    0,
  );
  const total = includeTax ? subtotal * 1.11 : subtotal;

  const updateLine = (key: number, patch: Partial<PurchaseLine>) => {
    setItems((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };

  const addCatalogItem = () => {
    const name = newItemName.trim();
    const unit = newItemUnit.trim();
    if (!name || !unit) {
      setNewItemMessage("Nama barang dan satuan wajib diisi.");
      return;
    }

    setNewItemMessage("");
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
          setNewItemMessage(result.message);
          return;
        }

        const stockItem = result.stockItem;
        setCatalogItems((current) =>
          current.some((item) => item.id === stockItem.id)
            ? current
            : [...current, stockItem].sort((a, b) =>
                a.name.localeCompare(b.name, "id"),
              ),
        );
        setItems((current) => {
          const emptyLine = current.find((line) => !line.stockItemId);
          if (emptyLine) {
            return current.map((line) =>
              line.key === emptyLine.key
                ? { ...line, stockItemId: stockItem.id, unitPrice: stockItem.unitPrice }
                : line,
            );
          }
          return [
            ...current,
            {
              key: nextRowKey.current++,
              stockItemId: stockItem.id,
              quantity: "",
              unitPrice: stockItem.unitPrice,
            },
          ];
        });
        setNewItemDialogOpen(false);
      } catch (error) {
        console.error("Direct purchase stock catalog item creation failed:", error);
        setNewItemMessage("Jenis barang gagal disimpan. Silakan coba kembali.");
      }
    });
  };

  const submit = () => {
    if (!vendor) {
      setMessage("Pilih vendor dari katalog sebelum mencatat pembelian.");
      return;
    }
    if (
      items.some(
        (line) =>
          !line.stockItemId ||
          !Number.isFinite(Number(line.quantity)) ||
          Number(line.quantity) <= 0 ||
          !Number.isFinite(Number(line.unitPrice)) ||
          Number(line.unitPrice) <= 0,
      )
    ) {
      setMessage("Pilih barang, lalu isi jumlah dan harga satuan dengan benar.");
      return;
    }

    setMessage("");
    startTransition(async () => {
      try {
        const result = await createDirectStockPurchase({
          vendorId: vendor.id,
          ...(ticketId ? { ticketId } : {}),
          items: items.map(({ stockItemId, quantity, unitPrice }) => ({
            stockItemId,
            quantity,
            unitPrice,
          })),
          reference,
          notes,
          includeTax,
        });
        setMessage(result.message);
        if (!result.success) return;
        onCreated?.(result.message);
        if (!onCreated) router.refresh();
      } catch (error) {
        console.error("Direct stock purchase submission failed:", error);
        setMessage("Pembelian gagal dicatat. Periksa data lalu coba kembali.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Metode pembayaran</Label>
          <Badge variant="outline">
            {paymentMethod === POPaymentMethod.TRANSFER ? "Transfer" : "Cash"}
          </Badge>
        </div>
        <div className="space-y-1">
          <Label>Status stok</Label>
          <p className="text-sm">Stok bertambah setelah barang diterima.</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="direct-stock-vendor">Vendor</Label>
          <CreateVendorInline
            onCreated={(createdVendor) => {
              setAvailableVendors((current) =>
                current.some((item) => item.id === createdVendor.id)
                  ? current
                  : [...current, createdVendor].sort((a, b) =>
                      a.name.localeCompare(b.name, "id"),
                    ),
              );
              setVendorId(createdVendor.id);
            }}
          />
        </div>
        <Select
          value={vendorId}
          onValueChange={setVendorId}
          disabled={isPending}
        >
          <SelectTrigger id="direct-stock-vendor">
            <SelectValue placeholder="Pilih vendor" />
          </SelectTrigger>
          <SelectContent>
            {availableVendors.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {availableVendors.length === 0 && (
          <p className="text-sm text-muted-foreground" role="status">
            Belum ada vendor. Tambahkan vendor untuk melanjutkan pembelian.
          </p>
        )}
      </div>

      {vendor && (
        <div className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-3">
          <p>
            <span className="text-muted-foreground">Bank tujuan:</span>{" "}
            {hasBankDetails ? vendor.bankName : "Tidak digunakan (Cash)"}
          </p>
          <p>
            <span className="text-muted-foreground">No. rekening:</span>{" "}
            {hasBankDetails ? vendor.bankAccount : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Pemilik rekening:</span>{" "}
            {hasBankDetails ? vendor.bankHolder : "—"}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="direct-stock-ticket">
          Tautkan ke Tiket / Permintaan (opsional)
        </Label>
        <Select
          value={ticketId || "none"}
          onValueChange={(value) => setTicketId(value === "none" ? "" : value)}
          disabled={isPending}
        >
          <SelectTrigger id="direct-stock-ticket">
            <SelectValue placeholder="Tidak ditautkan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Tidak ditautkan</SelectItem>
            {tickets.map((ticket) => (
              <SelectItem key={ticket.id} value={ticket.id}>
                {ticket.ticketNumber} · {ticket.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Pembelian akan tampil pada detail permintaan yang dipilih. Data lama
          tetap tidak tertaut.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Barang dan harga</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setNewItemName("");
              setNewItemUnit("pcs");
              setNewItemMessage("");
              setNewItemDialogOpen(true);
            }}
            disabled={
              isPending || isSavingNewItem || items.length >= 50
            }
          >
            Tambah Jenis Barang
          </Button>
        </div>
        {catalogItems.length === 0 && (
          <p className="text-sm text-muted-foreground" role="status">
            Katalog barang masih kosong. Tambahkan jenis barang untuk mengisi
            pembelian.
          </p>
        )}
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barang / SKU</TableHead>
                <TableHead className="w-28">Jumlah</TableHead>
                <TableHead className="w-40">Harga satuan (Rp)</TableHead>
                <TableHead className="w-20">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((line, index) => (
                <TableRow key={line.key}>
                  <TableCell>
                    <Select
                      value={line.stockItemId || undefined}
                      onValueChange={(stockItemId) => {
                        const stockItem = stockItems.find(
                          (candidate) => candidate.id === stockItemId,
                        );
                        if (!stockItem) return;
                        updateLine(line.key, {
                          stockItemId,
                          unitPrice: stockItem.unitPrice,
                        });
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger
                        className="min-w-48"
                        aria-label={`Barang pembelian ${index + 1}`}
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
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={`Jumlah barang ${index + 1}`}
                      type="number"
                      min="0.001"
                      step="any"
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.key, { quantity: event.target.value })
                      }
                      disabled={isPending}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={`Harga satuan barang ${index + 1}`}
                      type="number"
                      min="0.01"
                      step="any"
                      inputMode="decimal"
                      value={line.unitPrice}
                      onChange={(event) =>
                        updateLine(line.key, { unitPrice: event.target.value })
                      }
                      disabled={isPending}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending || items.length === 1}
                      onClick={() =>
                        setItems((current) =>
                          current.filter((item) => item.key !== line.key),
                        )
                      }
                    >
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="direct-stock-reference">Referensi nota</Label>
          <Input
            id="direct-stock-reference"
            maxLength={120}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="direct-stock-notes">Catatan</Label>
          <Input
            id="direct-stock-notes"
            maxLength={2000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-md border p-3">
        <Label htmlFor="direct-stock-include-tax">Kenakan PPN 11%</Label>
        <Switch
          id="direct-stock-include-tax"
          checked={includeTax}
          onCheckedChange={setIncludeTax}
          disabled={isPending}
        />
      </div>
      <p className="text-right text-sm font-semibold">
        Total estimasi: {currency.format(total)}
      </p>

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
          disabled={
            isPending ||
            isSavingNewItem ||
            !availableVendors.length ||
            !catalogItems.length
          }
        >
          {isPending ? "Mencatat..." : "Catat Pembelian"}
        </Button>
      </div>
      <GlobalModal
        isOpen={newItemDialogOpen}
        onClose={() => setNewItemDialogOpen(false)}
        title="Tambah Jenis Barang"
        description="Barang akan masuk katalog dengan stok awal nol dan otomatis dipilih untuk pembelian ini."
      >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="direct-stock-new-item-name">Nama barang</Label>
              <Input
                id="direct-stock-new-item-name"
                value={newItemName}
                onChange={(event) => setNewItemName(event.target.value)}
                maxLength={120}
                disabled={isSavingNewItem}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direct-stock-new-item-unit">Satuan</Label>
              <Input
                id="direct-stock-new-item-unit"
                value={newItemUnit}
                onChange={(event) => setNewItemUnit(event.target.value)}
                maxLength={32}
                disabled={isSavingNewItem}
              />
            </div>
            {newItemMessage && (
              <p className="text-sm text-destructive" role="alert">
                {newItemMessage}
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
              {isSavingNewItem ? "Menyimpan..." : "Simpan Barang"}
            </Button>
          </DialogFooter>
      </GlobalModal>
    </div>
  );
}
