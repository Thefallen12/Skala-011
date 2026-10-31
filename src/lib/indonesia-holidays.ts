const indonesiaHolidayNames = new Map<string, string>([
  ["2026-01-16", "Isra Mikraj Nabi Muhammad SAW"],
  ["2026-02-17", "Tahun Baru Imlek"],
  ["2026-03-19", "Hari Suci Nyepi"],
  ["2026-03-20", "Hari Raya Idul Fitri"],
  ["2026-03-21", "Hari Raya Idul Fitri"],
  ["2026-04-03", "Wafat Yesus Kristus"],
  ["2026-04-05", "Hari Paskah"],
  ["2026-05-01", "Hari Buruh Internasional"],
  ["2026-05-14", "Kenaikan Yesus Kristus"],
  ["2026-05-27", "Hari Raya Idul Adha"],
  ["2026-05-31", "Hari Raya Waisak"],
  ["2026-06-01", "Hari Lahir Pancasila"],
  ["2026-06-16", "Tahun Baru Islam"],
  ["2026-08-17", "Hari Kemerdekaan Republik Indonesia"],
  ["2026-08-25", "Maulid Nabi Muhammad SAW"],
  ["2026-12-25", "Hari Raya Natal"],
]);

export function getIndonesiaHolidayName(dateKey: string): string | undefined {
  return indonesiaHolidayNames.get(dateKey);
}
