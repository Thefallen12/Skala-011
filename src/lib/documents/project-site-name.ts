export function projectSiteName(
  kelompokTani?: string | null,
  village?: string | null,
): string {
  const groupName = kelompokTani?.trim();
  const location = village?.trim();

  if (!groupName) return location || "Gudang (tanpa proyek)";
  if (!location || groupName.toLocaleLowerCase("id-ID") === location.toLocaleLowerCase("id-ID")) {
    return groupName;
  }

  return `${groupName} (${location})`;
}
