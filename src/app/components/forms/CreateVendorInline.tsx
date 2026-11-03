"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { createVendor } from "@/app/actions/vendors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { GlobalModal } from "@/components/ui/global-modal";
import {
  VendorBankAccountsEditor,
  type EditableVendorBankAccount,
} from "@/app/components/forms/VendorBankAccountsEditor";
import {
  getVendorBankAccounts,
  type VendorBankAccountOption,
} from "@/lib/vendor-bank-accounts";

export type PurchaseVendorOption = {
  id: string;
  name: string;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  bankAccounts?: VendorBankAccountOption[];
};

export default function CreateVendorInline({
  onCreated,
}: {
  onCreated: (vendor: PurchaseVendorOption) => void;
}) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [accounts, setAccounts] = useState<EditableVendorBankAccount[]>([]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage("");
    startTransition(async () => {
      try {
        const result = await createVendor({
          name: String(formData.get("name") ?? ""),
          category: String(formData.get("category") ?? ""),
          bankAccounts: accounts.map(({ label, bankName, bankAccount, bankHolder, isPrimary }) => ({
            label,
            bankName,
            bankAccount,
            bankHolder,
            isPrimary,
          })),
        });
        if (!result.success || !result.vendor) {
          setMessage(result.message);
          return;
        }

        onCreated({
          ...result.vendor,
          bankAccounts: getVendorBankAccounts(result.vendor),
        });
        setOpen(false);
      } catch (error) {
        console.error("Inline vendor creation failed:", error);
        setMessage("Vendor gagal disimpan. Silakan coba kembali.");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setMessage("");
          setAccounts([]);
          setOpen(true);
        }}
      >
        Tambah Vendor
      </Button>
      <GlobalModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Tambah Vendor"
        description="Vendor yang disimpan dapat langsung dipilih untuk pengajuan pembelian."
        className="sm:max-w-2xl"
      >
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-name`}>Nama vendor</Label>
              <Input
                id={`${formId}-name`}
                name="name"
                required
                minLength={2}
                maxLength={180}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-category`}>Kategori</Label>
              <Input
                id={`${formId}-category`}
                name="category"
                required
                minLength={2}
                maxLength={100}
                placeholder="Contoh: Material bangunan"
                disabled={isPending}
              />
            </div>
            <VendorBankAccountsEditor
              accounts={accounts}
              onChange={setAccounts}
              disabled={isPending}
              idPrefix={formId}
            />
            {message && (
              <p className="text-sm text-destructive" role="alert">
                {message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Vendor"}
              </Button>
            </DialogFooter>
          </form>
      </GlobalModal>
    </>
  );
}
