# 📘 ALUR KERJA, NAVIGASI & ARSITEKTUR SISTEM ERP

**PT / CV Skala Prioritas Engineering — Takengon, Aceh Tengah**

---

## 1. Identitas Perusahaan & Branding

- **Nama Perusahaan:** PT / CV Skala Prioritas Engineering
- **Alamat Kantor:** Jl. Mawar No. 48 Perumnas Desa Kute Lot Takengon
- **Warna Utama Brand:**
  - **Navy Blue:** `#102A4D` (Header, border utama, tabel header)
  - **Orange:** `#E67E22` (Aksen, sub-header, slogan, penanda status)
- **Slogan Resmi:** _"ADAPT, IMPROVISE AND FINISH"_

---

## 2. Arsitektur Navigasi: Single-Page Hub & Slide-Over Sheet

Untuk mengeliminasi masalah "bolak-balik antar halaman" (_page-hopping_), aplikasi ini menggunakan **Arsitektur Berbasis Command Hub & Slide-Over Sheet (Drawer)**. Pengguna mengelola seluruh proses bisnis melalui **1 Layar Utama per Peran** tanpa perlu berpindah URL.

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ D DASHBOARD UTAMA │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
│
┌───────────────────────────────┼───────────────────────────────┐
▼ ▼ ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│ EXECUTIVE HUB (DIR) │ │ LOGISTICS HUB │ │ FINANCE HUB │
├───────────────────────┤ ├───────────────────────┤ ├───────────────────────┤
│ • One-Click Approvals │ │ • Process Requests │ │ • Budget Check │
│ • PO + QR Signature │ │ • Stock vs Buy (PO) │ │ • Check PO │
│ • Wage Approval │ │ • Issue DO & Mover │ │ • Upload Pay Proof │
└──────────┬────────────┘ └──────────┬────────────┘ └──────────┬────────────┘
│ │ │
└───────────────────────────────┼───────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────┐
│ SLIDE-OVER SHEET (PANEL SAMPLING) │
├──────────────────────────────────────────────────┤
│ • Detail Item & Riwayat Status │
│ • Form Input (Tanpa Pindah Halaman) │
│ • Quick Preview PDF & QR Code │
└──────────────────────────────────────────────────┘

---

## 3. Matriks Peran (RBAC) & Modul Bidang Konstruksi

| Peran (`Role`)                        | Command Hub Utama      | Hak Akses & Tanggung Jawab Operasional Konstruksi                                                            |
| :------------------------------------ | :--------------------- | :----------------------------------------------------------------------------------------------------------- |
| **`ADMIN`**                           | `/apps/users` & System | Kelola akun, hak akses, audit log, impor data proyek/pagu, dan sistem setting.                               |
| **`DIRECTUR`** / **`WAKIL_DIRECTUR`** | `/apps/approvals`      | **Persetujuan Akhir PO** (+ QR Sign), Persetujuan Upah, Persetujuan SPK Subkon, Addendum/CCO, & BAST.        |
| **`DRAFTER`**                         | `/apps/blueprints`     | Upload & revisi Gambar Kerja (Shop Drawing, As-Built Drawing, IFC), kelola versi & lembar revisi.            |
| **`KEUANGAN`**                        | `/apps/finance`        | Verifikasi anggaran PO (_Checked By_), persetujuan dana tiket, pembayaran Termyn Subkon, upload bukti bayar. |
| **`KOORDINATOR_LOGISTIK`**            | `/apps/logistics`      | Kelola tiket material, pemenuhan dari stok gudang (auto DO), terbit PO Vendor, & log BBM/Alat Berat.         |
| **`MOVER`** _(Driver)_                | `/apps/deliveries`     | Pengiriman material, Surat Jalan (DO) cetak/digital, & foto bukti penyerahan lapangan.                       |
| **`KOORDINATOR_LAPANGAN`**            | `/apps/projects`       | Review pengajuan material, verifikasi progres titik kerja, monitor alat berat, & validasi Laporan K3/Cuaca.  |
| **`TIM_LAPANGAN`** _(PIC)_            | `/apps/projects`       | Pengajuan material, usulan titik kerja & negosiasi upah, unggah foto progres privat, & isi Laporan Harian.   |

---

## 4. Struktur Rute & Layar Lengkap ERP Konstruksi

Seluruh modul ERP dikelompokkan ke dalam **7 Rute Utama** untuk meminimalkan _page switching_:

1. **`/apps/approvals` (Executive Command Hub):**
   - Tab 1: _Approval PO_ (Preview PO + Tombol Approve QR Signature).
   - Tab 2: _Approval Tiket Material & Dana_.
   - Tab 3: _Approval Upah Titik Pekerjaan_.
   - Tab 4: _Approval SPK Subkon, Addendum (CCO) & BAST_.
2. **`/apps/projects` (Project & Field Workstation):**
   - Tab 1: _Daftar Proyek & Realisasi Anggaran (Pagu vs Realisasi)_.
   - Tab 2: _Titik Pekerjaan & Negosiasi Upah Tukang_.
   - Tab 3: _Gambar Kerja Proyek (Blueprint Viewer)_.
   - Tab 4: _Laporan Harian, K3/Safety & Log Cuaca_.
3. **`/apps/logistics` (Logistics & Material Hub):**
   - Tab 1: _Tiket Material Masuk_ (Jalur Stok vs Jalur PO Vendor).
   - Tab 2: _Manajemen Stok Gudang & Katalog Barang_.
   - Tab 3: _Dokumen PO & Surat Jalan (DO)_.
   - Tab 4: _Log Alat Berat, Mobilisasi & Konsumsi BBM_.
4. **`/apps/finance` (Finance & Commercial Hub):**
   - Tab 1: _Pemeriksaan PO (Checked By)_.
   - Tab 2: _Pembayaran Vendor & Upload Bukti Transfer_.
   - Tab 3: _Pengajuan Termyn Subkon & Retensi (5%)_.
   - Tab 4: _Laporan Realisasi & Deviasi Anggaran Proyek_.
5. **`/apps/blueprints` (Drafter Workspace):**
   - Pengelolaan dokumen teknis gambar kerja, penomoran revisi (`REV-00`, `REV-01`), status persetujuan (`FOR_APPROVAL`, `APPROVED_FOR_CONSTRUCTION`, `AS_BUILT`).
6. **`/apps/users` (User & Role Management):**
   - Direktori pengguna, impor/ekspor CSV, aktivasi/deaktivasi akun, reset password.
7. **`/apps/habits` (Schedule, Timesheet & Roadmap):**
   - Kalender kerja harian/mingguan/bulanan, jam kerja tim, _due-date project_, dan agenda rapat.
8. **`/d/[code]` (Unified Document Viewer):**
   - Halaman cetak & viewer publik/internal untuk PO, DO, SPK, dan BAST dengan Floating Action Bar.

---

## 5. Blueprint Alur Kerja Operasional (End-to-End Workflow)

### 5.1 Alur Logistik & Pembelian Material (PO & DO)

[TIM LAPANGAN] ──> Buat Tiket Request Material
│
▼
[KOORDINATOR LAPANGAN] ──> Verifikasi Kebutuhan Proyek
│
▼
[KEUANGAN] ──> Cek Ketersediaan Anggaran
│
▼
[KOORDINATOR LOGISTIK]
├─► (Jalur A: Stok Gudang Ada) ──> Auto DO ──> Teruskan ke MOVER ──> [TERIMA DI LAPANGAN]
│
└─► (Jalur B: Beli Vendor) ──> Draf PO ──> Checked by KEUANGAN
│
▼
[DIRECTUR / WAKIL DIR]
Approve & Generate QR Sign
│
▼
[LOGISTIK & MOVER] ──> Terbit DO ──> [TERIMA DI LAPANGAN]

### 5.2 Alur Titik Pekerjaan & Negosiasi Upah Tukang

1. **Pengajuan (PIC Team Lapangan):** Memilih titik/lokasi proyek, mengusulkan uraian tugas, dan memasukkan nilai total upah hasil negosiasi di lapangan.
2. **Persetujuan (Direktur / Admin):** Memeriksa kelayakan nilai upah dan mengeklik **"Setujui Upah"** di Executive Hub.
3. **Pembaruan Progres (PIC):** Mengirim progres kumulatif (%), catatan harian, dan maksimal 5 foto bukti kerja (Format JPG/PNG/WEBP $\le 5$ MB).
4. **Verifikasi Foto:** Foto disimpan di direktori privat `.private-data/` dan diverifikasi signature file di server.

### 5.3 Alur Gambar Kerja / Technical Drawing (Drafter)

1. **Upload Gambar (Drafter):** Mengunggah gambar CAD/PDF ke proyek terkait dengan nomor lembar dan kategori (_Shop Drawing_ / _Detail Architectural_ / _Structural_).
2. **Review (Koordinator Lapangan / Direktur):** Meninjau gambar kerja.
3. **Approval IFC:** Jika sesuai, status diubah menjadi `APPROVED_FOR_CONSTRUCTION` (IFC). Tim lapangan dapat langsung membuka gambar melalui _Slide-Over Sheet_ di lokasi proyek via tablet/HP.
4. **As-Built Drawing:** Setelah pekerjaan selesai, Drafter mengunggah versi `AS_BUILT` untuk dokumen penyerahan (BAST).

### 5.4 Alur Subkontraktor, SPK, Termyn & Retensi

1. **Penerbitan SPK (Direktur):** Membuat Surat Perintah Kerja (SPK) untuk pekerjaan spesialis (misal: Pekerjaan Baja / Elektrikal) dengan nilai kontrak dan syarat retensi (default 5%).
2. **Pengajuan Termyn (Subkon / Logistik):** Saat fisik mencapai persentase tertentu (misal: 30%, 60%, 100%), diajukan klaim Termyn.
3. **Pemeriksaan Lapangan & Keuangan:** Koordinator Lapangan memvalidasi fisik $\rightarrow$ Keuangan memotong retensi 5% $\rightarrow$ Direktur menyetujui $\rightarrow$ Keuangan mentransfer dana.

### 5.5 Alur Alat Berat, Mobilisasi & Log BBM

1. **Pencatatan Alat (Logistik):** Mencatat unit alat berat (Excavator, Dump Truck, Concrete Mixer) di lokasi proyek.
2. **Log Harian (Operator / Field):** Mengisi _Hours Meter_ (HM Awal & HM Akhir), jumlah jam kerja efektif, serta konsumsi BBM (Liter) harian.
3. **Monitoring Biaya Operasional:** Keuangan dan Direktur dapat memantau efisiensi alat per jam dan biaya BBM per proyek.

### 5.6 Alur CCO (Addendum Kontrak) & BAST (PHO/FHO)

1. **Contract Change Order (CCO / Addendum):** Jika terjadi perubahan volume/desain di lapangan:
   - Field Coord membuat draf CCO (Tambah/Kurang Volume & Perpanjangan Waktu).
   - Direktur menyetujui CCO $\rightarrow$ Pagu & Waktu Target Proyek terbarui otomatis.
2. **Berita Acara Serah Terima (BAST):**
   - **BAST-1 (PHO - Provisional Hand Over):** Diterbitkan saat fisik 100%. Masa pemeliharaan dimulai.
   - **BAST-2 (FHO - Final Hand Over):** Diterbitkan setelah masa pemeliharaan selesai dan sela retensi 5% dicairkan.

---

## 6. Template Cetak A4 & Public QR Code Verification

Dokumen resmi perusahaan (**PO, DO, SPK, BAST**) dirancang persis dengan standar layout cetak A4:

### A. Komponen Visual Dokumen PO & DO

- **Kop Surat (Kiri):** Logo SP Engineering, _"SKALA PRIORITAS ENGINEERING"_, Alamat Jl. Mawar No. 48 Takengon.
- **Header Title (Kanan):** Judul dokumen (`PURCHASE ORDER` / `DELIVERY ORDER`), Garis Dekorasi Dua Warna (Navy `#102A4D` & Orange `#E67E22`), serta Box Nomor Dokumen.
- **Format Penomoran Berurutan:** `SPE-<nomor>/PO/<tahun>` dan `SPE-<nomor>/DO/<tahun>`.
- **Footer Slogan:** Garis Oranye dengan slogan _"ADAPT, IMPROVISE AND FINISH"_.
- **Digital Signatures (3 Kolom):**
  - PO: _Dibuat Oleh_ (Logistik) | _Diperiksa Oleh_ (Keuangan) | _Disetujui Oleh_ (Direktur + **QR Code Signature**).
  - DO: _Dibuat Oleh_ (Logistik) | _Dibawa Oleh_ (Driver/Mover) | _Diterima Oleh_ (Penerima/Vendor).

### B. Mekanisme QR Code Verifikasi Publik

- Setiap QR Code pada dokumen mengarah ke URL Publik: `https://domain.com/verify/po/[publicCode]`.
- Saat di-scan dengan kamera HP, halaman verifikasi menampilkan:
  - Status keaslian dokumen (_Verified Official Document_).
  - Nama Direktur/Wakil Direktur yang menandatangani secara digital & stempel waktu approval.
  - Ringkasan barang/nilai untuk mencegah pemalsuan dokumen cetak.

---

## 7. Keamanan URL (URL Obfuscation)

- **Skema Routing:** Menggunakan rute tunggal terenkapsulasi `/d/[publicCode]`.
- **Generator Kode Acak:** Menggunakan NanoID / Crypto Random Hash 8–10 karakter (Contoh: `/d/pX92mK8L` untuk PO, `/d/dX71nV3Q` untuk DO, `/d/sK82mP1N` untuk SPK).
- **Manfaat:** Mencegah kebocoran ID database asli, mencegah serangan _enumeration URL_, serta memudahkan akses cepat melalui QR Code.

---

## 8. Skema Database Prisma Lengkap (`schema.prisma`)

Skema Prisma terpadu yang mencakup seluruh modul operasional konstruksi, logistik, proyek, alat berat, dan manajemen pengguna:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ================= ENUMS =================

enum Role {
  ADMIN
  DIRECTUR
  WAKIL_DIRECTUR
  DRAFTER
  KEUANGAN
  KOORDINATOR_LOGISTIK
  MOVER
  KOORDINATOR_LAPANGAN
  TIM_LAPANGAN
}

enum POStatus {
  DRAFT
  PENDING_CHECK
  APPROVED
  REJECTED
  CANCELLED
}

enum DOStatus {
  PENDING
  IN_TRANSIT
  DELIVERED
  RETURNED
}

enum TicketCategory {
  PURCHASE
  WAREHOUSE
  SERVICE
  OTHER
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

enum SPKStatus {
  DRAFT
  ACTIVE
  COMPLETED
  TERMINATED
}

enum BASTType {
  PHO // Provisional Hand Over (Serah Terima Pertama)
  FHO // Final Hand Over (Serah Terima Akhir)
}

// ================= MODELS =================

model User {
  id               String            @id @default(cuid())
  name             String
  email            String            @unique
  password         String
  role             Role              @default(TIM_LAPANGAN)
  phone            String?
  isActive         Boolean           @default(true)
  lastLoginAt      DateTime?
  picProjects      Project[]         @relation("ProjectPIC")
  workPointPICs    WorkPoint[]       @relation("WorkPointPIC")
  createdTickets   Ticket[]          @relation("TicketRequester")
  blueprints       Blueprint[]       @relation("BlueprintDrafter")
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
}

model Project {
  id               String            @id @default(cuid())
  code             String            @unique
  name             String
  paguBudget       Float             @default(0)
  realizedBudget   Float             @default(0)
  landArea         Float?            // Luas lahan (m2)
  workType         String?           // Jenis pekerjaan
  village          String            // Desa
  subdistrict      String            // Kecamatan
  district         String            @default("Aceh Tengah")
  status           String            @default("RUNNING") // RUNNING, COMPLETED, DELAYED
  picId            String?
  pic              User?             @relation("ProjectPIC", fields: [picId], references: [id])
  workPoints       WorkPoint[]
  dailyReports     DailyReport[]
  blueprints       Blueprint[]
  subkonContracts  SubkonContract[]
  equipmentLogs    EquipmentLog[]
  bastDocuments    BASTDocument[]
  addendums        ProjectAddendum[]
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
}

model WorkPoint {
  id               String             @id @default(cuid())
  projectId        String
  project          Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  taskName         String             // Nama titik / jenis tugas
  locationDetails  String?            // Lokasi spesifik titik
  proposedWage     Float              // Usulan total upah
  agreedWage       Float?             // Total upah disetujui Direktur
  isWageApproved   Boolean            @default(false)
  picId            String?
  pic              User?              @relation("WorkPointPIC", fields: [picId], references: [id])
  progressLogs     WorkPointProgress[]
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
}

model WorkPointProgress {
  id               String             @id @default(cuid())
  workPointId      String
  workPoint        WorkPoint          @relation(fields: [workPointId], references: [id], onDelete: Cascade)
  progressPercent  Float              // Progres kumulatif (%)
  notes            String?
  photos           WorkPointPhoto[]
  date             DateTime           @default(now())
  createdAt        DateTime           @default(now())
}

model WorkPointPhoto {
  id                  String            @id @default(cuid())
  workPointProgressId String
  workPointProgress   WorkPointProgress @relation(fields: [workPointProgressId], references: [id], onDelete: Cascade)
  fileName            String
  fileSize            Int
  mimeType            String
  createdAt           DateTime          @default(now())
}

model DailyReport {
  id               String               @id @default(cuid())
  projectId        String
  project          Project              @relation(fields: [projectId], references: [id], onDelete: Cascade)
  date             DateTime
  weather          String?              // Cerah, Hujan, Mendung
  workerCount      Int?                 // Jumlah pekerja hadir
  workSummary      String               // Catatan pekerjaan harian
  k3SafetyLog      String?              // Catatan K3 & Keselamatan
  progressPhotos   ProjectProgressPhoto[]
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt
}

model ProjectProgressPhoto {
  id            String      @id @default(cuid())
  dailyReportId String
  dailyReport   DailyReport @relation(fields: [dailyReportId], references: [id], onDelete: Cascade)
  fileName      String
  fileSize      Int
  mimeType      String
  createdAt     DateTime    @default(now())
}

model Blueprint {
  id            String            @id @default(cuid())
  publicCode    String            @unique
  projectId     String
  project       Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  drawingNumber String            // Nomor Gambar (contoh: "AR-01-REV01")
  title         String            // Judul Gambar
  category      BlueprintCategory @default(SHOP_DRAWING)
  revision      String            @default("REV-00")
  fileUrl       String
  status        BlueprintStatus   @default(DRAFT)
  drafterId     String
  drafter       User              @relation("BlueprintDrafter", fields: [drafterId], references: [id])
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
}

model PurchaseOrder {
  id                   String        @id @default(cuid())
  publicCode           String        @unique // URL Samaran
  poNumber             String        @unique // Format: "SPE-001/PO/2026"
  vendorName           String
  vendorAddress        String?
  vendorContact        String?
  vendorPhone          String?
  poDate               DateTime
  deliveryDate         DateTime?
  shipTo               String?
  paymentTerms         String?
  siteProject          String?
  subTotal             Float         @default(0)
  ppn11                Float         @default(0)
  grandTotal           Float         @default(0)
  status               POStatus      @default(DRAFT)
  preparedBy           String?       // Staf Logistik
  checkedBy            String?       // Manager Keuangan
  approvedBy           String?       // Direktur / Wakil Direktur
  directorQrCodeBase64 String?       // Asset QR Code Signature
  items                POItem[]
  tickets              Ticket[]
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt
}

model POItem {
  id          String        @id @default(cuid())
  poId        String
  po          PurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)
  itemCode    String?
  description String
  qty         Float
  unit        String
  unitPrice   Float
  totalAmount Float
}

model DeliveryOrder {
  id                  String   @id @default(cuid())
  publicCode          String   @unique
  doNumber            String   @unique // Format: "SPE-001/DO/2026"
  poContractNumber    String?
  date                DateTime
  projectSiteLocation String?
  vendorDestination   String?
  driverMoverName     String?
  vehiclePlateNumber  String?
  logisticsStaffName  String?
  driverName          String?
  receiverVendorName  String?
  status              DOStatus @default(PENDING)
  items               DOItem[]
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model DOItem {
  id          String        @id @default(cuid())
  doId        String
  do          DeliveryOrder @relation(fields: [doId], references: [id], onDelete: Cascade)
  itemCode    String?
  description String
  qty         Float
  unit        String
  remarks     String?
}

model Ticket {
  id           String         @id @default(cuid())
  ticketNumber String         @unique
  category     TicketCategory @default(PURCHASE)
  title        String
  description  String?
  requesterId  String
  requester    User           @relation("TicketRequester", fields: [requesterId], references: [id])
  poId         String?
  po           PurchaseOrder? @relation(fields: [poId], references: [id])
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model SubkonContract {
  id             String         @id @default(cuid())
  publicCode     String         @unique
  contractNumber String         @unique // Nomor SPK
  projectId      String
  project        Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  subkonName     String         // Nama Perusahaan Subkon / Mandor
  workScope      String         // Lingkup Pekerjaan
  contractValue  Float          // Nilai Total SPK
  retentionPct   Float          @default(5.0) // Potongan Retensi (%)
  status         SPKStatus      @default(ACTIVE)
  termyns        SubkonTermyn[]
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}

model SubkonTermyn {
  id               String         @id @default(cuid())
  subkonContractId String
  subkonContract   SubkonContract @relation(fields: [subkonContractId], references: [id], onDelete: Cascade)
  termynNumber     Int            // Termyn ke-1, 2, dst.
  claimedPercent   Float          // Progres Fisik yang Diklaim (%)
  grossAmount      Float          // Nilai Klaim Kotor
  retentionAmount  Float          // Potongan Retensi (5%)
  netAmount        Float          // Nilai Bersih Dibayarkan
  isPaid           Boolean        @default(false)
  paymentProofUrl  String?
  createdAt        DateTime       @default(now())
}

model EquipmentLog {
  id            String   @id @default(cuid())
  projectId     String
  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  equipmentName String   // Nama Alat Berat (Excavator, Truck, dll)
  operatorName  String?
  date          DateTime
  hmStart       Float    // Hours Meter Awal
  hmEnd         Float    // Hours Meter Akhir
  effectiveHours Float   // Jam Kerja Efektif
  fuelLiter     Float    // Konsumsi BBM (Liter)
  notes         String?
  createdAt     DateTime @default(now())
}

model ProjectAddendum {
  id             String   @id @default(cuid())
  projectId      String
  project        Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  addendumNumber String   // Nomor CCO / Addendum
  budgetChange   Float    // Tambah/Kurang Biaya (+/- Rp)
  timeExtension  Int      // Tambah Hari Kerja (Hari)
  reason         String   // Alasan Perubahan Spesifikasi / Volume
  isApproved     Boolean  @default(false)
  createdAt      DateTime @default(now())
}

model BASTDocument {
  id         String   @id @default(cuid())
  publicCode String   @unique
  bastNumber String   @unique // Nomor BAST
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  type       BASTType @default(PHO)
  date       DateTime
  notes      String?
  isApproved Boolean  @default(false)
  createdAt  DateTime @default(now())
}

```

// ================= ENUMS TAMBAHAN =================

enum MovementType {
IN // Barang Masuk (Pembelian/Restock)
OUT // Barang Keluar (Dikirim ke Proyek/Lokasi)
ADJUSTMENT // Penyesuaian Stok (Opname/Rusak)
}

enum EquipmentStatus {
READY // Siap Digunakan
IN_USE // Sedang Beroperasi di Proyek
MAINTENANCE // Dalam Perbaikan / Service
BROKEN // Rusak Berat
}

enum TaskPriority {
LOW
MEDIUM
HIGH
URGENT
}

enum TaskStatus {
TODO
IN_PROGRESS
REVIEW
COMPLETED
}

// ================= MODELS TAMBAHAN =================

// 1. KATALOG & STOK GUDANG UMUM
model StockItem {
id String @id @default(cuid())
itemCode String @unique // Kode Barang (Contoh: "MAT-SMN-01")
name String // Nama Barang / Material
category String // Kategori (Semen, Besi, Cat, Peralatan, dll)
unit String // Satuan (Sak, M3, Ton, Pcs, Btg)
currentStock Float @default(0) // Stok Aktual di Gudang
minStock Float @default(10) // Ambang Batas Minimal Stok
priceEstimate Float @default(0) // Estimasi Harga Satuan Terakhir
movements StockMovement[]
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

// 2. PERGERAKAN STOK GUDANG (IN/OUT/ADJUSTMENT)
model StockMovement {
id String @id @default(cuid())
stockItemId String
stockItem StockItem @relation(fields: [stockItemId], references: [id], onDelete: Cascade)
type MovementType
qty Float
referenceNo String? // Nomor Referensi (No DO / No PO / No Opname)
projectId String? // Opsional: Ditautkan ke proyek jika barang dikirim ke site
project Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
notes String? // Catatan pergerakan
createdById String
createdBy User @relation(fields: [createdById], references: [id])
createdAt DateTime @default(now())
}

// 3. KATALOG VENDOR & SUPPLIER
model Vendor {
id String @id @default(cuid())
code String @unique // Contoh: "VND-TAK-001"
name String // Nama PT / CV / Toko
category String // Kategori Supplier (Bahan Bangunan, Alat Berat, Sewa Kendaraan)
address String?
phone String?
email String?
bankName String? // Nama Bank Pembayaran
bankAccount String? // No Rekening
bankHolder String? // Atas Nama Rekening
rating Float @default(5.0) // Penilaian Performa Vendor (1-5)
isApproved Boolean @default(true)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

// 4. AUDIT LOG RIWAYAT REVISI UPAH TUKANG
model WageAuditLog {
id String @id @default(cuid())
workPointId String
workPoint WorkPoint @relation(fields: [workPointId], references: [id], onDelete: Cascade)
oldWage Float // Nilai Upah Sebelum Perubahan
newWage Float // Nilai Upah Setelah Perubahan
changedById String
changedBy User @relation(fields: [changedById], references: [id])
reason String? // Alasan perubahan/penyesuaian upah
createdAt DateTime @default(now())
}

// 5. MASTER INVENTARIS ALAT BERAT & PERATURAN SERVIS
model EquipmentMaster {
id String @id @default(cuid())
code String @unique // Contoh: "ALT-EXC-01"
name String // Nama Alat (Excavator Komatsu PC200, Dump Truck, dll)
brand String? // Merk / Brand
licensePlate String? // No Plat / No Seri Machine
hourlyRate Float @default(0) // Biaya Sewa/Operasional per Jam
status EquipmentStatus @default(READY)
currentHM Float @default(0) // Total Hours Meter Saat Ini
logs EquipmentLog[]
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

// 6. HABIT, TASK TRACKING & SCHEDULING
model Habit {
id String @id @default(cuid())
userId String
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
title String // Kebiasaan Harian (misal: "Cek Lapangan Pagi", "Update Stock")
frequency String @default("DAILY") // DAILY, WEEKDAY, WEEKEND
completions HabitCompletion[]
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

model HabitCompletion {
id String @id @default(cuid())
habitId String
habit Habit @relation(fields: [habitId], references: [id], onDelete: Cascade)
date DateTime // Tanggal Ditandai Selesai
createdAt DateTime @default(now())

@@unique([habitId, date])
}

model WorkTask {
id String @id @default(cuid())
projectId String?
project Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
title String
description String?
status TaskStatus @default(TODO)
priority TaskPriority @default(MEDIUM)
color String @default("#102A4D") // Warna kustom bar pada timeline
startDate DateTime?
dueDate DateTime?
members WorkTaskMember[]
createdById String
createdBy User @relation("TaskCreator", fields: [createdById], references: [id])
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

model WorkTaskMember {
id String @id @default(cuid())
workTaskId String
workTask WorkTask @relation(fields: [workTaskId], references: [id], onDelete: Cascade)
userId String
user User @relation(fields: [userId], references: [id], onDelete: Cascade)

@@unique([workTaskId, userId])
}

model CalendarEvent {
id String @id @default(cuid())
title String
description String?
category String @default("PROJECT") // PROJECT, PERSONAL, MEETING
allDay Boolean @default(false)
startDate DateTime
endDate DateTime
location String?
meetingUrl String? // Link Zoom/Google Meet
format String @default("HYBRID") // VIRTUAL, HYBRID, PHYSICAL
participants CalendarEventParticipant[]
reminders CalendarEventReminder[]
createdById String
createdBy User @relation("EventCreator", fields: [createdById], references: [id])
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

model CalendarEventParticipant {
id String @id @default(cuid())
calendarEventId String
calendarEvent CalendarEvent @relation(fields: [calendarEventId], references: [id], onDelete: Cascade)
userId String
user User @relation(fields: [userId], references: [id], onDelete: Cascade)

@@unique([calendarEventId, userId])
}

model CalendarEventReminder {
id String @id @default(cuid())
calendarEventId String
calendarEvent CalendarEvent @relation(fields: [calendarEventId], references: [id], onDelete: Cascade)
userId String
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
reminderMinutes Int @default(15) // Waktu pengingat sebelum event (menit)

@@unique([calendarEventId, userId])
}

model TimesheetEntry {
id String @id @default(cuid())
userId String
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
projectId String?
project Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
date DateTime
hoursSpent Float // Jam kerja (Maksimal 24 jam/hari)
taskDescription String // Uraian aktivitas harian
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

2. DETAIL ALUR KERJA OPERASIONAL TAMBAHAN
   Arsitektur seluruh modul di bawah tetap mengusung pola Unified Command Hub & Slide-Over Sheet (Tanpa Pindah Halaman).

┌──────────────────────────────────────────────────────────────────────────────────┐
│ UNIFIED COMMAND HUB WORKFLOW │
└────────────────────────────────────────┬─────────────────────────────────────────┘
│
┌───────────────────────────────────┼───────────────────────────────────┐
▼ ▼ ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│ STOK GUDANG & VENDOR │ │ UPAH & AUDIT LAPANGAN │ │ HABIT, TASK & TIMESHEET │
├─────────────────────────┤ ├─────────────────────────┤ ├─────────────────────────┤
│ • Auto-Stock Deduction │ │ • Negosiasi Upah PIC │ │ • Drag-and-Drop Task │
│ • Stock Movement Log │ │ • Approval Direktur │ │ • Kalender & E-vite │
│ • Rating & Master Vendor│ │ • Audit Log Histori │ │ • Timesheet Jam Kerja │
└────────────┬────────────┘ └────────────┬────────────┘ └────────────┬────────────┘
│ │ │
└───────────────────────────┼───────────────────────────┘
│
▼
┌──────────────────────────────────────────┐
│ SLIDE-OVER SHEET (PANEL SAMPLING) │
├──────────────────────────────────────────┤
│ • Form Input Quick-Submit │
│ • Histori Transaksi Real-Time │
│ • Auto Validation & Security Verification│
└──────────────────────────────────────────┘

2.1 Alur Pengelolaan Stok Gudang & Katalog Vendor (/apps/logistics)
A. Pemenuhan Barang dari Stok Gudang
Penerimaan Tiket: Logistik menerima tiket material ber-kategori WAREHOUSE dari Tim Lapangan.Pengecekan Stok Otomatis: Sistem mencocokkan barang dengan StockItem.currentStock.
Eksekusi Satu Klik (In-Sheet Action): - Logistik mengeklik "Penuhi dari Stok Gudang" pada Slide-Over Sheet. - Sistem menerbitkan Delivery Order (DO) dengan nomor resmi SPE-xxx/DO/YYYY. - Sistem secara otomatis mencatat StockMovement (Tipe: OUT) dan mengurangkan currentStock. - Mekanisme Anti-Duplikasi: Sistem memeriksa Ticket.poId atau penguncian DO. Jika tiket sudah memiliki DO, tombol pemenuhan dinonaktifkan sehingga stok tidak terpotong dua kali.
B. Restock & Barang Masuk (PO Pembelian) 1. Penerimaan PO: Saat PO Pembelian barang disetujui Direktur dan barang sampai di gudang umum. 2. Input Barang Masuk: Logistik memilih item di Katalog Gudang $\rightarrow$ Klik "Tambah Stok Masuk". 3. Pencatatan Log: Sistem menambah currentStock dan mencatat StockMovement (Tipe: IN) ber-referensi nomor PO.
2.2 Alur Negosiasi Upah & Audit Log Upah Tukang (/apps/projects) 1. Pengusulan Upah (PIC Lapangan): - PIC memilih titik pekerjaan (WorkPoint) pada proyek. - Mengisikan deskripsi tugas dan Nilai Usulan Total Upah (Rp) hasil negosiasi dengan kelompok tukang. - Status awal: isWageApproved = false. 2. Persetujuan / Koreksi (Direktur / Admin): - Direktur membuka /apps/approvals (Tab Approval Upah). - Direktur dapat menyetujui langsung (agreedWage = proposedWage) atau mengoreksi nilai disetujui (agreedWage = nilai_baru). - Setelah disetujui, isWageApproved menjadi true. 3. Pencatatan Audit Log Otomatis (WageAuditLog): - Setiap kali Admin atau Direktur mengubah nilai upah yang sudah disetujui, sistem mewajibkan pengisian Alasan Perubahan. - Sistem secara otomatis menyimpan rekaman di WageAuditLog (Mencatat oldWage, newWage, changedBy, dan reason) sehingga riwayat penyesuaian upah dapat ditelusuri secara transparan.
2.3 Alur Penggunaan Alat Berat & BBM (/apps/logistics) 1. Registrasi Master Alat: Logistik menginput unit alat berat (EquipmentMaster) beserta nomor seri/plat dan estimasi biaya operasional per jam. 2. Log Operasional Harian (Operator / Field): - Diisi langsung melalui Sheet proyek harian. - Input: HM Awal, HM Akhir, Jam Kerja Efektif, dan Konsumsi BBM (Liter). 3. Kalkulasi Otomatis: - Total Jam Operasional = HM Akhir - HM Awal. - Sistem secara otomatis memperbarui currentHM pada unit alat berat. - Menghitung rasio konsumsi BBM per jam kerja efektif untuk analisis efisiensi biaya proyek.
2.4 Alur Habit, Task Tracking, Schedule & Timesheet (/apps/habits)
A. Project Task Timeline & Drag-and-Drop 1. Input Tugas: - Lead proyek menambahkan tugas (WorkTask) dengan menentukan durasi (startDate hingga dueDate), prioritas, dan warna bar visual. - Penugasan Anggota: Menautkan satu atau banyak pengguna (WorkTaskMember). - Interaksi Timeline: Pengguna yang berhak dapat menggeser bar tugas untuk memindahkan tanggal/jam kerja. Perubahan tersimpan via Server Action.
B. Schedule, Meetings & E-vite 1. Pembuatan Jadwal (CalendarEvent): Mendukung format Virtual, Hybrid, atau Physical dengan tautan Zoom/Meet dan lokasi fisik. 2. Fitur Send E-vite: - Klik "Send E-vite" membuka draf undangan pada aplikasi email bawaan pengguna yang sudah terisi daftar email peserta (CalendarEventParticipant). 3. Notify Me Preference: Pengguna dapat menyimpan pengingat menit (CalendarEventReminder) sebelum acara dimulai.
C. Timesheet Harian Pekerja (TimesheetEntry) 1. Pencatatan Jam: Setiap staf menginput total jam kerja harian (Maksimal 24 jam/hari) dan deskripsi aktivitas yang dikerjakan per proyek. 2. Filter & Proteksi Akses:Pengguna biasa hanya dapat membaca dan mengelola timesheet miliknya sendiri.Administrator dan Direktur dapat memfilter timesheet berdasarkan anggota, peran, dan periode (7/14/30 hari).

- ALUR KERJA SISTEM NOTIFIKASI BERBASIS PERAN (RBAC)

1. Konsep & Arsitektur UI/UX Notifikasi
   Top Navbar (Lonceng Notifikasi): Terdapat ikon Lonceng di pojok kanan atas dengan badge merah (misal: [ 3 ]) untuk notifikasi global yang belum dibaca (Unread). Klik lonceng akan membuka Dropdown atau Slide-Over Sheet daftar notifikasi.
2. Sidebar Menu Badges:
   Menu di sidebar akan menampilkan angka notifikasi spesifik sesuai Role (Misal: Direktur melihat angka [ 5 ] di menu Executive Hub, Logistik melihat [ 2 ] di menu Logistik Hub).
3. Smart Action Link:
   Saat notifikasi diklik, sistem tidak melakukan full page reload, melainkan langsung membuka tab yang relevan dan memunculkan Slide-Over Sheet untuk item tersebut.

- Matriks Pemicu Notifikasi Berdasarkan Role (RBAC Triggers)

1Setiap ada perubahan status di Server Action, sistem akan meng-generate notifikasi ke spesifik Role.Aksi / Pemicu (Trigger Event)Penerima Notifikasi (Role Target)Isi Notifikasi (Contoh)Tim Lapangan membuat Request MaterialKOORDINATOR_LAPANGAN"Permintaan material baru untuk Proyek X (Besi Beton)."Koord. Lapangan verifikasi RequestKEUANGAN & KOORDINATOR_LOGISTIK"Pengecekan anggaran tiket material Proyek X."Logistik membuat Draf PO ke VendorKEUANGAN"PO Pembelian Semen menunggu verifikasi (Checked By)."Keuangan menandai PO "Checked By"DIRECTUR / WAKIL_DIRECTUR"1 PO baru menunggu persetujuan dan Tanda Tangan QR Anda."Direktur menyetujui PO (Approve)KOORDINATOR_LOGISTIK & KEUANGAN"
PO #SPE-001/PO/2026 disetujui. Siap diproses & dibayar."PIC Lapangan usulkan upah titik baruDIRECTUR"Usulan upah baru Rp 5.000.000 untuk titik pekerjaan Y."Logistik terbitkan Surat Jalan (DO)MOVER & TIM_LAPANGAN"Surat Jalan #SPE-001/DO/2026 sedang dikirim." 3. Skema Database Prisma (schema.prisma)Tambahkan model Notification dan relasinya ke model User.

Skema Database Prisma (schema.prisma)
Tambahkan model Notification dan relasinya ke model User.

// Tambahkan relasi di dalam model User
model User {
// ... (field yang sudah ada)
notifications Notification[] @relation("UserNotifications")
}

// Model Notifikasi Baru
model Notification {
id String @id @default(cuid())
userId String // ID penerima notifikasi spesifik
user User @relation("UserNotifications", fields: [userId], references: [id], onDelete: Cascade)

title String // Judul singkat (Contoh: "Persetujuan PO Baru")
message String // Pesan detail (Contoh: "PO #SPE-123 menunggu persetujuan QR Anda")
type NotificationType @default(INFO)

isRead Boolean @default(false)

// URL atau Action Key untuk membuka Slide-Over Sheet langsung
// Contoh: "/apps/approvals?tab=po&openSheetId=po_12345"
actionUrl String?

createdAt DateTime @default(now())
}

enum NotificationType {
INFO
WARNING
SUCCESS
APPROVAL // Khusus untuk notifikasi yang membutuhkan aksi (Approve/Reject)
}

Mekanisme Polling / Real-Time (Next.js App Router)
Karena kita menggunakan Next.js, pendekatan terbaik dan paling stabil untuk memunculkan notifikasi secara langsung adalah menggunakan SWR (Stale-While-Revalidate) atau React Query untuk melakukan background polling setiap beberapa detik, atau menggunakan Server-Sent Events (SSE).

Cara SWR (Paling Mudah): Di Client Component Navbar/Sidebar, gunakan useSWR('/api/notifications/unread-count', fetcher, { refreshInterval: 10000 }). Navbar akan otomatis me-refresh angka merah (badge) setiap 10 detik tanpa membebani browser.
