"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CreatePOForm from "@/app/components/forms/CreatePOForm";
import DirectStockPurchaseForm from "@/app/components/forms/DirectStockPurchaseForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";

type PurchaseModalType = "PURCHASE_ORDER" | "DIRECT_PURCHASE";

type PurchaseStockItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  stockQuantity: string;
  minimumStock: string;
  unitPrice: string;
  createdAt: string;
};

type PurchaseVendor = {
  id: string;
  name: string;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
};

type PurchaseTicket = {
  id: string;
  ticketNumber: string;
  title: string;
};

export default function CreatePurchaseModal({
  open,
  onOpenChange,
  vendors,
  stockItems,
  tickets = [],
  initialType = "DIRECT_PURCHASE",
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: PurchaseVendor[];
  stockItems: PurchaseStockItem[];
  tickets?: PurchaseTicket[];
  initialType?: PurchaseModalType;
  onCreated: (message: string) => void;
}) {
  const router = useRouter();
  const [purchaseType, setPurchaseType] =
    useState<PurchaseModalType>(initialType);

  const changeOpen = (nextOpen: boolean) => {
    if (nextOpen) setPurchaseType(initialType);
    onOpenChange(nextOpen);
  };

  const handleCreated = (message: string) => {
    onCreated(message);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Tambah Pembelian</DialogTitle>
          <DialogDescription>
            Pilih skema pembelian. Pembelian langsung wajib mendapat persetujuan
            Direktur sebelum masuk antrean pembayaran.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup
          value={purchaseType}
          onValueChange={(value) =>
            setPurchaseType(
              value === "PURCHASE_ORDER" ? "PURCHASE_ORDER" : "DIRECT_PURCHASE",
            )
          }
          className="grid gap-3 sm:grid-cols-2"
        >
          <label
            htmlFor="purchase-type-po"
            className="flex cursor-pointer items-start gap-3 rounded-lg border p-4"
          >
            <RadioGroupItem value="PURCHASE_ORDER" id="purchase-type-po" />
            <span>
              <span className="block font-medium">
                Pembelian via PO (Proyek / Vendor Besar)
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Lanjutkan ke form pembuatan draft Purchase Order.
              </span>
            </span>
          </label>
          <label
            htmlFor="purchase-type-direct"
            className="flex cursor-pointer items-start gap-3 rounded-lg border p-4"
          >
            <RadioGroupItem value="DIRECT_PURCHASE" id="purchase-type-direct" />
            <span>
              <span className="block font-medium">
                Pembelian Langsung (Tanpa PO)
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Isi barang dan harga untuk diajukan kepada Direktur.
              </span>
            </span>
          </label>
        </RadioGroup>
        {purchaseType === "PURCHASE_ORDER" ? (
          <CreatePOForm
            key="warehouse-restock"
            vendors={vendors}
            stockItems={stockItems}
            onCancel={() => changeOpen(false)}
            onCreated={(_, message) => handleCreated(message)}
          />
        ) : (
          <DirectStockPurchaseForm
            key={open ? "direct-purchase-open" : "direct-purchase-closed"}
            stockItems={stockItems}
            vendors={vendors}
            tickets={tickets}
            onCancel={() => changeOpen(false)}
            onCreated={handleCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
