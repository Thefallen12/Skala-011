"use client";

import { Plus, Trash2 } from "lucide-react";
import type { VendorInvoiceInput } from "@/lib/invoice-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type InvoiceDraft = Omit<VendorInvoiceInput, "documentUrl">;

export default function InvoiceDetailsFields({
  value,
  onChange,
  idPrefix,
}: {
  value: InvoiceDraft;
  onChange: (value: InvoiceDraft) => void;
  idPrefix: string;
}) {
  const updateItem = (
    index: number,
    field: keyof InvoiceDraft["items"][number],
    nextValue: string | number,
  ) => {
    onChange({
      ...value,
      items: value.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: nextValue } : item,
      ),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-invoice-number`}>Nomor Invoice</Label>
          <Input
            id={`${idPrefix}-invoice-number`}
            value={value.invoiceNumber}
            maxLength={100}
            onChange={(event) =>
              onChange({ ...value, invoiceNumber: event.target.value })
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-period-date`}>Tanggal / Periode</Label>
          <Input
            id={`${idPrefix}-period-date`}
            value={value.periodOrDate ?? ""}
            maxLength={120}
            onChange={(event) =>
              onChange({ ...value, periodOrDate: event.target.value })
            }
            placeholder="Contoh: 2 November 2026"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-payment-method`}>Metode Pembayaran</Label>
          <Input
            id={`${idPrefix}-payment-method`}
            value={value.paymentMethod ?? ""}
            maxLength={80}
            onChange={(event) =>
              onChange({ ...value, paymentMethod: event.target.value })
            }
            placeholder="Transfer / Cash"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-bank-account`}>No. Rekening / Bank</Label>
          <Input
            id={`${idPrefix}-bank-account`}
            value={value.bankAccount ?? ""}
            maxLength={180}
            onChange={(event) =>
              onChange({ ...value, bankAccount: event.target.value })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Rincian Invoice</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                ...value,
                items: [
                  ...value.items,
                  {
                    itemCode: "",
                    description: "",
                    quantity: 1,
                    unit: "pcs",
                    unitPrice: 0,
                  },
                ],
              })
            }
          >
            <Plus className="mr-1 size-4" aria-hidden="true" />
            Tambah Item
          </Button>
        </div>
        <div className="space-y-3">
          {value.items.map((item, index) => (
            <div
              className="grid gap-2 rounded-md border p-3 sm:grid-cols-6"
              key={`${idPrefix}-item-${index}`}
            >
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-code-${index}`}>Kode Barang</Label>
                <Input
                  id={`${idPrefix}-code-${index}`}
                  value={item.itemCode ?? ""}
                  maxLength={100}
                  onChange={(event) =>
                    updateItem(index, "itemCode", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor={`${idPrefix}-description-${index}`}>Deskripsi</Label>
                <Input
                  id={`${idPrefix}-description-${index}`}
                  value={item.description}
                  maxLength={500}
                  onChange={(event) =>
                    updateItem(index, "description", event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-qty-${index}`}>Qty</Label>
                <Input
                  id={`${idPrefix}-qty-${index}`}
                  type="number"
                  min="0.001"
                  step="any"
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(index, "quantity", Number(event.target.value))
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-unit-${index}`}>Satuan</Label>
                <Input
                  id={`${idPrefix}-unit-${index}`}
                  value={item.unit}
                  maxLength={40}
                  onChange={(event) =>
                    updateItem(index, "unit", event.target.value)
                  }
                  required
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor={`${idPrefix}-price-${index}`}>Harga Satuan</Label>
                  <Input
                    id={`${idPrefix}-price-${index}`}
                    type="number"
                    min="0"
                    step="any"
                    value={item.unitPrice}
                    onChange={(event) =>
                      updateItem(index, "unitPrice", Number(event.target.value))
                    }
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus item invoice ${index + 1}`}
                  disabled={value.items.length <= 1}
                  onClick={() =>
                    onChange({
                      ...value,
                      items: value.items.filter((_, itemIndex) => itemIndex !== index),
                    })
                  }
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Subtotal</Label>
          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              maximumFractionDigits: 0,
            }).format(
              value.items.reduce(
                (sum, item) => sum + item.quantity * item.unitPrice,
                0,
              ),
            )}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-tax`}>Pajak / PPN</Label>
          <Input
            id={`${idPrefix}-tax`}
            type="number"
            min="0"
            step="any"
            value={value.tax ?? 0}
            onChange={(event) =>
              onChange({ ...value, tax: Number(event.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-deduction`}>Potongan / Kasbon</Label>
          <Input
            id={`${idPrefix}-deduction`}
            type="number"
            min="0"
            step="any"
            value={value.deduction ?? 0}
            onChange={(event) =>
              onChange({ ...value, deduction: Number(event.target.value) })
            }
          />
        </div>
      </div>
    </div>
  );
}
