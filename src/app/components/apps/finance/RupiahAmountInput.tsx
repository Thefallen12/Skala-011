"use client";

import { Input } from "@/components/ui/input";
import {
  formatRupiahInput,
  parseRupiahInput,
  terbilangRupiah,
} from "@/lib/indonesian-currency";

export default function RupiahAmountInput({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
}: {
  id: string;
  value: string;
  onChange: (formattedValue: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const amount = parseRupiahInput(value);

  return (
    <div className="space-y-2">
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
        >
          Rp
        </span>
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          className="pl-10"
          value={value}
          onChange={(event) =>
            onChange(formatRupiahInput(event.target.value))
          }
          disabled={disabled}
          required={required}
          aria-describedby={`${id}-terbilang`}
        />
      </div>
      <p
        id={`${id}-terbilang`}
        className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
        aria-live="polite"
      >
        <span className="font-medium text-foreground">Terbilang: </span>
        {amount > 0
          ? terbilangRupiah(amount)
          : "Terbilang akan muncul setelah nominal diisi."}
      </p>
    </div>
  );
}
