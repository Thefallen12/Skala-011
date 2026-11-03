const integerFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

const smallNumberWords = (value: number): string => {
  const words = [
    "nol",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
    "sepuluh",
    "sebelas",
  ];

  if (value < 12) return words[value];
  if (value < 20) return `${smallNumberWords(value - 10)} belas`;
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const remainder = value % 10;
    return `${smallNumberWords(tens)} puluh${remainder ? ` ${smallNumberWords(remainder)}` : ""}`;
  }
  if (value < 200) {
    const remainder = value - 100;
    return `seratus${remainder ? ` ${smallNumberWords(remainder)}` : ""}`;
  }

  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  return `${smallNumberWords(hundreds)} ratus${remainder ? ` ${smallNumberWords(remainder)}` : ""}`;
};

const integerToIndonesianWords = (value: number): string => {
  if (value < 1_000) return smallNumberWords(value);

  const scales = [
    [1_000_000_000_000_000, "kuadriliun"],
    [1_000_000_000_000, "triliun"],
    [1_000_000_000, "miliar"],
    [1_000_000, "juta"],
    [1_000, "ribu"],
  ] as const;

  for (const [scale, label] of scales) {
    if (value < scale) continue;

    const quotient = Math.floor(value / scale);
    const remainder = value % scale;
    const prefix =
      label === "ribu" && quotient === 1
        ? "seribu"
        : `${integerToIndonesianWords(quotient)} ${label}`;

    return remainder
      ? `${prefix} ${integerToIndonesianWords(remainder)}`
      : prefix;
  }

  return "";
};

export function formatRupiahInput(value: string): string {
  const sanitized = value.replace(/[^\d,]/g, "");
  const commaIndex = sanitized.indexOf(",");
  const integerPart =
    commaIndex === -1 ? sanitized : sanitized.slice(0, commaIndex);
  const fractionPart =
    commaIndex === -1
      ? null
      : sanitized.slice(commaIndex + 1).replace(/,/g, "").slice(0, 2);
  const groupedInteger = integerPart
    ? integerFormatter.format(Number(integerPart))
    : "";

  return fractionPart === null
    ? groupedInteger
    : `${groupedInteger},${fractionPart}`;
}

export function formatRupiahNumber(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(amount);
}

export function parseRupiahInput(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

export function terbilangRupiah(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "";

  const [wholePart, fractionPart] = amount.toFixed(2).split(".");
  const whole = Number(wholePart);
  const fraction = Number(fractionPart);
  const words = `${integerToIndonesianWords(whole)} rupiah`;

  return fraction ? `${words} koma ${smallNumberWords(fraction)}` : words;
}
