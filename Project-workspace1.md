1. Alur Penunjukan PIC & Trigger Status Proyek (RUNNING)
   Proyek tidak bisa langsung berjalan (RUNNING) begitu dibuat. Proyek baru berstatus PENDING_SETUP dan baru akan ter-trigger otomatis menjadi RUNNING jika 2 syarat terpenuhi:

┌─────────────────────────────────────────────────────────────────────────────────┐
│ ALUR PRASYARAT PROYEK BERJALAN │
└────────────────────────────────────────┬────────────────────────────────────────┘
│
┌────────────────────────────────┴────────────────────────────────┐
▼ ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│ 1. PENUNJUKAN PIC LAPANGAN │ │ 2. APPROVAL UPAH TUKANG │
├──────────────────────────────┤ ├──────────────────────────────┤
│ • Pilih User Role │ │ • PIC Input Usulan Titik │
│ `TIM_LAPANGAN` / │ + │ & Value Upah │
│ `KOORDINATOR_LAPANGAN` │ │ • Direktur Approve Upah │
│ • Assign via Modal Popup │ │ (`isWageApproved = true`) │
└──────────────┬───────────────┘ └──────────────┬───────────────┘
│ │
└─────────────────────────┬────────────────────────────────┘
│
▼
┌──────────────────────────────────────────┐
│ AUTOMATIC TRIGGER: STATUS = RUNNING │
├──────────────────────────────────────────┤
│ Proyek aktif & Tim Lapangan dapat │
│ mulai mengisi Laporan Harian & Progres │
└──────────────────────────────────────────┘

// System Check Trigger Status Proyek
export async function checkProjectActivation(projectId: string) {
const project = await prisma.project.findUnique({
where: { id: projectId },
include: { workPoints: true }
});

if (!project) return;

const hasPIC = !!project.picId; // Syarat 1: PIC Lapangan sudah ditunjuk
const hasApprovedWage = project.workPoints.some(wp => wp.isWageApproved); // Syarat 2: Minimal 1 Upah Titik di-approve Direktur

if (hasPIC && hasApprovedWage && project.status === "PENDING_SETUP") {
await prisma.project.update({
where: { id: projectId },
data: { status: "RUNNING" }
});

    // Kirim notifikasi ke PIC Lapangan bahwa proyek resmi dimulai
    await sendNotification({
      userId: project.picId!,
      title: "Proyek Aktif!",
      message: `Proyek ${project.name} telah resmi berjalan. Silakan mulai input laporan harian.`,
      actionUrl: `/apps/projects?projectId=${project.id}`
    });

}
}

2. Penyederhanaan Laporan Harian & Alur Upah Tukang
   Laporan harian difokuskan murni pada Progres Fisik & Tenaga Kerja, tanpa memasukkan K3 maupun Peralatan (peralatan sudah ditangani di Logistik).
   A. Struktur Laporan Harian (Cleaned-Up):
   📅 Tanggal Laporan
   🌤️ Kondisi Cuaca (Cerah / Hujan Gerimis / Hujan Lebat / Mendung)
   👷 Jumlah Pekerja Hadir (misal: 12 Orang)📝 Uraian Pekerjaan Harian (Ringkasan aktivitas fisik hari ini)📸 Foto Bukti Progres (Maksimal 5 Foto Privat: JPG/PNG/WEBP $\le$ 5MB)
   B. Alur Pembayaran Upah Tukang (Payroll Drawdown):
   1. Pengajuan Titik Kerja & Upah: PIC usulkan titik kerja (WorkPoint) dan nilai total upah borongan/harian.
   2. Persetujuan Direktur: Direktur menyetujui nilai upah $\rightarrow$ isWageApproved = true.
   3. Pencairan Bertahap (Termyn Upah): Seiring progres fisik bertambah pada laporan harian, Keuangan/PIC dapat mencatat pencairan gaji tukang sesuai persentase pencapaian melalui modul Timeline Gaji Tukang.
      📊 3. Tampilan Sub-Tabs Baru di Project Workstation Modal
      Di dalam modal/sheet detail proyek, kini terdapat 6 Sub-Tab utama:
      Sub-TabFungsi Utama & Visualisasi📋 Pagu & RealisasiMembandingkan Pagu Anggaran vs Realisasi Pengeluaran PO & Upah.👷 Titik & UpahPengusulan titik kerja, penyesuaian nilai upah, & audit log revisi upah.
      📸 Laporan HarianInput cuaca, jumlah pekerja, uraian fisik, dan unggah foto progres.
      📐 Gambar KerjaViewer gambar teknik/CAD/PDF dari Drafter.
      📈 Kurva S (S-Curve)[BARU] Grafik Kurva S membandingkan Rencana Progres (%) vs Realisasi Fisik Kumulatif (%).
      📅 Timeline Pekerjaan[BARU] Visualisasi Gantt Chart / Timeline jadwal pengerjaan per titik/tugas.💰 Timeline Gaji Tukang[BARU] Jadwal & Histori Pencairan Gaji Tukang berdasarkan progres pencapaian.🗄️
3. Pembaruan Skema Database Prisma (schema.prisma)Berikut adalah penyesuaian skema Prisma (menghapus K3/Peralatan dari DailyReport dan menambahkan model Kurva S & Pencairan Upah):

// Status Proyek Baru
enum ProjectStatus {
PENDING_SETUP // Belum ada PIC atau Upah belum disetujui
RUNNING // Aktif berjalan
PAUSED // Ditunda
COMPLETED // Selesai (100% & BAST)
}

// Model Proyek yang Diperbarui
model Project {
id String @id @default(cuid())
code String @unique
name String
paguBudget Float @default(0)
realizedBudget Float @default(0)
startDate DateTime?
targetEndDate DateTime?
status ProjectStatus @default(PENDING_SETUP)

// Penunjukan PIC Lapangan
picId String?
pic User? @relation("ProjectPIC", fields: [picId], references: [id])

workPoints WorkPoint[]
dailyReports DailyReport[]
blueprints Blueprint[]
sCurveSchedules SCurveSchedule[] // Data Rencana Kurva S
wagePayments WagePayment[] // Histori Timeline Gaji

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

// DailyReport Tanpa K3 & Peralatan
model DailyReport {
id String @id @default(cuid())
projectId String
project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
date DateTime
weather String // Cerah, Hujan, Mendung
workerCount Int // Jumlah pekerja hadir
workSummary String // Catatan pekerjaan harian
progressPhotos ProjectProgressPhoto[]
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

// Model Data Rencana vs Realisasi Kurva S
model SCurveSchedule {
id String @id @default(cuid())
projectId String
project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
weekNumber Int // Minggu ke-1, ke-2, dst.
date DateTime // Tanggal akhir minggu
plannedPercent Float // Target Rencana Kumulatif (%)
actualPercent Float @default(0) // Realisasi Kumulatif (%)
createdAt DateTime @default(now())
}

// Model Timeline & Histori Pencairan Gaji Tukang
model WagePayment {
id String @id @default(cuid())
projectId String
project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
workPointId String?
workPoint WorkPoint? @relation(fields: [workPointId], references: [id], onDelete: SetNull)
paymentDate DateTime // Tanggal pencairan gaji
amountPaid Float // Jumlah dana dicairkan (Rp)
progressAtPaid Float // Progres fisik saat dicairkan (%)
mandorName String? // Nama Kepala Tukang / Mandor Penerima
receiptUrl String? // Foto/File Bukti Kwitansi
notes String?
createdAt DateTime @default(now())
}

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ MAIN PAGE: PROJECT DIRECTORY & MANAGEMENT │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ + Tambah Proyek ] [ 📥 Import CSV ] [ 📤 Export CSV ] [ 📄 Template CSV ] │
│ │
│ TABEL MASTER PROYEK: │
│ • Kode & Nama Proyek • Lokasi (Desa/Kec) • Pagu (Rp) • Realisasi (Rp) │
│ • PIC Lapangan (Select) • Status Badge (PENDING_SETUP / RUNNING) • Aksi (Delete/Edit) │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
│ (Klik Baris / Nama Proyek)
▼
┌──────────────────────────────────────────────────┐
│ SLIDE-OVER SHEET: PROJECT WORKSTATION │
├──────────────────────────────────────────────────┤
│ SUB-TABS: │
│ 📊 1. Pagu & Realisasi │
│ 👷 2. Titik & Upah (Trigger Activation) │
│ 📸 3. Laporan Harian (Bersih: Tanpa K3/Alat) │
│ 📐 4. Gambar Kerja (Blueprint Viewer) │
│ 📈 5. Kurva S (Rencana vs Realisasi) │
│ 📅 6. Timeline Pekerjaan & Gaji Tukang │
└──────────────────────────────────────────────────┘

2. Alur Penunjukan PIC & Trigger Otomatis Proyek Berjalan (RUNNING)
   Proyek yang baru dibuat tidak langsung berjalan, melainkan berstatus PENDING_SETUP. Proyek otomatis ter-trigger menjadi RUNNING saat 2 syarat ini terpenuhi:

Penunjukan PIC Lapangan: Admin / Direktur menunjuk PIC (TIM_LAPANGAN / KOORDINATOR_LAPANGAN) dari dropdown tabel atau modal proyek.

Approval Upah Titik Pertama: PIC mengusulkan titik pekerjaan (WorkPoint) dan nilainya di-approve oleh Direktur (isWageApproved = true).

// Server Action Trigger Activation
export async function checkAndActivateProject(projectId: string) {
const project = await prisma.project.findUnique({
where: { id: projectId },
include: { workPoints: true }
});

if (!project) return;

const hasPIC = !!project.picId;
const hasApprovedWage = project.workPoints.some(wp => wp.isWageApproved);

if (hasPIC && hasApprovedWage && project.status === "PENDING_SETUP") {
await prisma.project.update({
where: { id: projectId },
data: { status: "RUNNING" }
});

    // Send Notification to Assigned PIC
    await sendNotification({
      userId: project.picId!,
      title: "Proyek Resmi Berjalan!",
      message: `Proyek ${project.name} telah aktif. Anda dapat mulai menginput laporan harian & progres.`,
      actionUrl: `/apps/projects?openProject=${project.id}&tab=harian`,
      type: "SUCCESS"
    });

}
}

Perincian 6 Sub-Tab Dalam Slide-Over Workstation
Saat salah satu baris proyek diklik, Slide-Over Sheet (lebar $800\text{px}$) akan terbuka dari samping kanan dengan 6 Sub-Tab terintegrasi:
📋 Pagu & Realisasi:Ringkasan Finansial:
Total Pagu Budget vs Total Realisasi Pengeluaran (PO + Upah Disetujui).
Progress Bar Anggaran (%) & Sisa Pagu Anggaran (Rp).
👷 Titik & Upah:
Form pengusulan titik kerja baru & nilai negosiasi upah borongan/harian.
Tombol Approval (Khusus Direktur) & Histori Audit Log Revisi Upah (WageAuditLog).
📸 Laporan Harian (Penyederhanaan):
Bebas dari Log K3 dan Log Peralatan.
Form Input: Tanggal, Dropdown Cuaca (Cerah / Hujan / Mendung), Jumlah Pekerja (Orang), Ringkasan Pekerjaan Fisik, dan Upload maks 5 foto progres privat.
📐 Gambar Kerja (Blueprints):
Katalog Gambar CAD/PDF per proyek yang diunggah Drafter.Filter Kategori: Shop Drawing, Architectural, Structural, MEP, As-Built.
Status Approval: FOR_APPROVAL $\rightarrow$ APPROVED_FOR_CONSTRUCTION (IFC).
📈 Kurva S (S-Curve Chart):
Grafik Line Chart (Recharts/Chart.js) membandingkan Target Rencana Kumulatif (%) [Garis Navy #102A4D] vs Realisasi Fisik Kumulatif (%) [Garis Oranye #E67E22] per minggu.
📅 Timeline Pekerjaan & Timeline Gaji Tukang:
Timeline Pekerjaan: Progress Bar horizontal jadwal pelaksanaan per titik kerja.
Timeline Gaji Tukang: Summary Total Upah Disetujui, Total Terbayar, dan Sisa Kewajiban Upah.
Modal "Cairkan Upah": Input pencairan gaji bertahap berdasarkan progres fisik dilengkapi upload foto kwitansi.
Impor, Ekspor & Hapus Proyek (Cascade Clean-up)
Unduh Template Import (EXCEL): Mengunduh file template-import-proyek.EXCEL dengan header:
Kode_Proyek, Nama_Proyek, Pagu_Anggaran, Jenis_Pekerjaan, Desa, Kecamatan, Kabupaten
Import EXCEL: Parsing EXCEL client-side (Papaparse) $\rightarrow$ Server Action importProjects menyimpan data massal dengan status awal PENDING_SETUP.
Export EXCEL: Unduh seluruh data proyek beserta realisasi dan statusnya saat ini.
Hapus Proyek (Soft / Hard Cascade Delete):
Tombol Hapus (Merah) memicu AlertDialog konfirmasi.
Server Action menghapus proyek beserta seluruh data anak terkait (WorkPoint, DailyReport, Blueprint, SCurveSchedule, WagePayment) secara aman menggunakan onDelete: Cascade.

5. Skema Database Prisma Terpadu (schema.prisma)
   datasource db {
   provider = "postgresql"
   url = env("DATABASE_URL")
   }

generator client {
provider = "prisma-client-js"
}

enum ProjectStatus {
PENDING_SETUP // Belum ada PIC atau Upah belum di-approve
RUNNING // Aktif berjalan
PAUSED // Ditunda
COMPLETED // Selesai
}

enum BlueprintCategory {
SHOP_DRAWING
AS_BUILT
ARCHITECTURAL
STRUCTURAL
MEP
}

enum BlueprintStatus {
DRAFT
FOR_APPROVAL
APPROVED_FOR_CONSTRUCTION
REVISED
REJECTED
}

model Project {
id String @id @default(cuid())
code String @unique // Contoh: "PRJ-TAK-001"
name String // Nama Proyek
paguBudget Float @default(0)
realizedBudget Float @default(0)
landArea Float? // Luas Lahan (m2)
workType String? // Jenis Pekerjaan
village String // Desa
subdistrict String // Kecamatan
district String @default("Aceh Tengah")
status ProjectStatus @default(PENDING_SETUP)

// Penunjukan PIC Lapangan
picId String?
pic User? @relation("ProjectPIC", fields: [picId], references: [id])

workPoints WorkPoint[]
dailyReports DailyReport[]
blueprints Blueprint[]
sCurveSchedules SCurveSchedule[] // Data Kurva S
wagePayments WagePayment[] // Histori Pencairan Gaji

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

model WorkPoint {
id String @id @default(cuid())
projectId String
project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
taskName String // Nama titik / tugas
locationDetails String? // Detail lokasi
proposedWage Float // Usulan total upah
agreedWage Float? // Upah disetujui Direktur
isWageApproved Boolean @default(false)

progressLogs WorkPointProgress[]
wageAuditLogs WageAuditLog[]
wagePayments WagePayment[]

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

model WorkPointProgress {
id String @id @default(cuid())
workPointId String
workPoint WorkPoint @relation(fields: [workPointId], references: [id], onDelete: Cascade)
progressPercent Float // Progres kumulatif (%)
notes String?
photos WorkPointPhoto[]
date DateTime @default(now())
}

model WorkPointPhoto {
id String @id @default(cuid())
workPointProgressId String
workPointProgress WorkPointProgress @relation(fields: [workPointProgressId], references: [id], onDelete: Cascade)
fileName String
fileSize Int
mimeType String
createdAt DateTime @default(now())
}

model WageAuditLog {
id String @id @default(cuid())
workPointId String
workPoint WorkPoint @relation(fields: [workPointId], references: [id], onDelete: Cascade)
oldWage Float
newWage Float
changedById String
changedBy User @relation(fields: [changedById], references: [id])
reason String?
createdAt DateTime @default(now())
}

// DailyReport Bersih (Tanpa K3 & Peralatan)
model DailyReport {
id String @id @default(cuid())
projectId String
project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
date DateTime
weather String // Cerah, Hujan, Mendung
workerCount Int // Jumlah pekerja
workSummary String // Catatan fisik harian
progressPhotos ProjectProgressPhoto[]
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

model ProjectProgressPhoto {
id String @id @default(cuid())
dailyReportId String
dailyReport DailyReport @relation(fields: [dailyReportId], references: [id], onDelete: Cascade)
fileName String
fileSize Int
mimeType String
createdAt DateTime @default(now())
}

model Blueprint {
id String @id @default(cuid())
publicCode String @unique
projectId String
project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
drawingNumber String // No Gambar
title String // Judul Gambar
category BlueprintCategory @default(SHOP_DRAWING)
revision String @default("REV-00")
fileUrl String
status BlueprintStatus @default(DRAFT)
drafterId String
drafter User @relation(fields: [drafterId], references: [id])
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

model SCurveSchedule {
id String @id @default(cuid())
projectId String
project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
weekNumber Int // Minggu ke-1, 2, dst.
date DateTime
plannedPercent Float // Target Rencana (%)
actualPercent Float @default(0) // Realisasi (%)
createdAt DateTime @default(now())
}

model WagePayment {
id String @id @default(cuid())
projectId String
project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
workPointId String?
workPoint WorkPoint? @relation(fields: [workPointId], references: [id], onDelete: SetNull)
paymentDate DateTime
amountPaid Float // Nilai cair (Rp)
progressAtPaid Float // Progres saat cair (%)
mandorName String?
receiptUrl String?
notes String?
createdAt DateTime @default(now())
}

# 🛠️ PERBAIKAN ALUR TIKET MATERIAL & PEMENUHAN CAMPURAN (SPLIT FULFILLMENT)

**Modul: Project Workstation & Logistics Hub**

---

## 1. Analisis Masalah & Solusi

**Masalah Saat Ini:**

- Model database `Ticket` lama hanya mengikat 1 tiket ke 1 PO. Jika tim lapangan meminta 5 barang (3 ada di gudang, 2 harus beli), sistem tidak bisa membaginya.
- Tim lapangan dipaksa mengisi "Tanggal Pengiriman" untuk semua barang, padahal untuk barang yang dibeli (PO), tanggal kirim sangat bergantung pada negosiasi Logistik & Vendor.

**Solusi (Arsitektur Baru):**

1. **Pecah Entitas:** Kita menambahkan tabel `TicketItem`. Satu `Ticket` bisa memiliki banyak `TicketItem`.
2. **Split Fulfillment:** Di layar Logistik, Logistik dapat menyeleksi item per item dari sebuah tiket. Item A & B dicentang $\rightarrow$ "Keluarkan dari Gudang (DO)". Item C & D dicentang $\rightarrow$ "Buat PO Pembelian".
3. **Kondisional Tanggal Kirim:** `expectedDeliveryDate` hanya wajib diisi oleh Tim Lapangan jika mereka merequest barang ketersediaan Gudang (sebagai target pemakaian). Untuk barang pembelian (Beli Baru), field tanggal dihilangkan/disembunyikan dari form Tim Lapangan.

---

## 2. Pembaruan Skema Database (`schema.prisma`)

Ganti atau perbarui skema Tiket Anda dengan model berikut. Perhatikan penambahan `TicketItem` dan relasinya.

```prisma
enum TicketStatus {
  PENDING_KOORDINATOR
  PENDING_KEUANGAN
  PENDING_LOGISTIK
  PARTIALLY_FULFILLED // Sebagian barang sudah diproses (DO/PO)
  COMPLETED           // Semua barang sudah diproses
  REJECTED
}

enum FulfillmentStatus {
  PENDING
  PROCESSED_TO_DO // Diproses ambil dari stok gudang
  PROCESSED_TO_PO // Diproses beli ke vendor
  REJECTED
}

model Ticket {
  id           String         @id @default(cuid())
  ticketNumber String         @unique // Format: TKT-YYYYMM-001
  title        String         // Contoh: "Kebutuhan Material Pengecoran"
  projectId    String?
  project      Project?       @relation(fields: [projectId], references: [id])
  requesterId  String
  requester    User           @relation("TicketRequester", fields: [requesterId], references: [id])

  status       TicketStatus   @default(PENDING_KOORDINATOR)
  items        TicketItem[]   // 1 Tiket punya banyak Item

  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model TicketItem {
  id                   String            @id @default(cuid())
  ticketId             String
  ticket               Ticket            @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  itemName             String            // Nama Material
  qty                  Float
  unit                 String
  notes                String?

  // Hint dari Tim Lapangan: Apakah mereka mengira ini ada di gudang atau harus beli?
  categoryHint         TicketCategory    @default(WAREHOUSE)

  // Tanggal ini HANYA wajib diisi jika categoryHint == WAREHOUSE
  expectedDeliveryDate DateTime?

  // Status pemenuhan item ini oleh Logistik
  status               FulfillmentStatus @default(PENDING)

  // Relasi jika item ini akhirnya dibelikan (PO) atau dikirim dari stok (DO)
  poItemId             String?
  doItemId             String?
}


3. Alur Kerja Baru (The New Workflow)
A. Layar Tim Lapangan (Tambah Tiket Form)Tim lapangan mengeklik "Tambah Request Material".
Form menggunakan useFieldArray (React Hook Form) agar bisa menambah banyak barang sekaligus.
Untuk setiap baris barang, terdapat Dropdown "Sumber Barang":Opsi: Gudang (Stok) atau Pembelian Baru.Jika memilih Gudang, field "Tanggal Diperlukan" akan muncul.
Jika memilih Pembelian Baru, field "Tanggal Diperlukan" disembunyikan (Tidak perlu diisi).
Tiket di-submit $\rightarrow$ Status: PENDING_KOORDINATOR.
B. Layar Logistik Hub (Split Pemenuhan)Logistik membuka Tiket yang berstatus PENDING_LOGISTIK.
Di dalam Slide-Over Sheet detail tiket, terdapat tabel daftar TicketItem.
Terdapat Checkbox di sebelah kiri tiap item.Skenario Pemecahan (Split):Logistik mencentang Semen & Pasir $\rightarrow$ Klik tombol "Penuhi dari Gudang (Auto DO)". Kedua item ini berubah status menjadi PROCESSED_TO_DO.Logistik mencentang Paku & Besi Beton $\rightarrow$ Klik tombol "Buatkan PO Pembelian". Sistem membuka form PO yang otomatis terisi Paku & Besi Beton. Setelah PO disubmit, item berubah status menjadi PROCESSED_TO_PO.Jika ada item yang berstatus PENDING, maka status Tiket induk adalah PARTIALLY_FULFILLED. Jika semua item sudah diproses, status Tiket menjadi COMPLETED.
```
