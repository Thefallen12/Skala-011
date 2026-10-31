export const habitTaskColors = [
  { value: "blue", label: "Biru", className: "bg-sky-600" },
  { value: "violet", label: "Ungu", className: "bg-violet-600" },
  { value: "cyan", label: "Cyan", className: "bg-cyan-600" },
  { value: "green", label: "Hijau", className: "bg-emerald-600" },
  { value: "amber", label: "Oranye", className: "bg-amber-500" },
  { value: "red", label: "Merah", className: "bg-rose-600" },
  { value: "pink", label: "Merah muda", className: "bg-pink-600" },
  { value: "slate", label: "Abu-abu", className: "bg-slate-600" },
] as const;

export type HabitTaskColor = (typeof habitTaskColors)[number]["value"];

export function isHabitTaskColor(value: unknown): value is HabitTaskColor {
  return habitTaskColors.some((color) => color.value === value);
}

export function getHabitTaskColorClass(value: string) {
  return (
    habitTaskColors.find((color) => color.value === value)?.className ??
    "bg-sky-600"
  );
}
