import ExcelJS from "exceljs";

const headers = [
  "Kode Proyek",
  "Nama Proyek",
  "Pagu Anggaran",
  "Jenis Pekerjaan",
  "Desa",
  "Kecamatan",
  "Kabupaten",
  "Status",
];

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Proyek");
  worksheet.addRow(headers);
  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.max(header.length + 4, 18),
  }));
  const file = await workbook.xlsx.writeBuffer();

  return new Response(file as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-proyek.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
