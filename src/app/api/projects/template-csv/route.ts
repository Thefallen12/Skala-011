const headers = [
  "Kode Proyek",
  "Nama Proyek",
  "Pagu Anggaran",
  "Realisasi",
  "Jenis Pekerjaan",
  "Desa",
  "Kecamatan",
  "Kabupaten",
  "Status",
];

export async function GET() {
  return new Response(`\uFEFF${headers.join(",")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="template-import-proyek.csv"',
      "Cache-Control": "no-store",
    },
  });
}
