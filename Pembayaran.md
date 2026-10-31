Tolong perbaiki arsitektur Modul Logistik dan Skema Pembayaran Keuangan kita agar lebih rapi dan konsisten (mengatasi duplikasi UI dan absennya fitur DP).

### 1. Refactor UI Halaman Logistik (`/apps/logistics`)
Ada redundansi UI: Tombol "Pembelian Langsung" dan Dropdown "Pembelian Tanpa PO" tumpang tindih. Tolong satukan:
- Hapus tombol "Pembelian Langsung" yang terpisah.
- Hapus dropdown "Pembelian".
- Ganti dengan SATU tombol solid: `<Button> + Tambah Pembelian </Button>`.
- Saat diklik, buka `<CreatePurchaseModal>`.
- Di dalam modal tersebut, sediakan 2 Opsi Tipe Pembelian (Radio Group):
  1. `PURCHASE_ORDER`: "Pembelian via PO (Proyek / Vendor Besar)" -> Melanjutkan ke form pembuatan draft PO.
  2. `DIRECT_PURCHASE`: "Pembelian Langsung (Tanpa PO)" -> Melanjutkan ke form input barang & nominal harga yang langsung diajukan persetujuannya ke Direktur.

### 2. Standardisasi Database Skema Multi-Pembayaran (Prisma)
Pastikan SEMUA jenis pengeluaran (PO maupun Direct Purchase) menggunakan relasi pembayaran *One-to-Many* agar bisa mendukung skema DP/Cicilan/Lunas.

```prisma
enum PaymentType {
  DOWN_PAYMENT     // DP
  PROGRESS_PAYMENT // Termin
  FULL_PAYMENT     // Lunas / Pelunasan
}

enum PurchaseType {
  PO                 // Pakai Dokumen Resmi
  DIRECT_PURCHASE    // Tanpa Dokumen PO
}

// SATUKAN ENTITAS PEMBELIAN KE DALAM 1 TABEL (ATAU LINK KEDUA MODEL KE TABEL PAYMENT)
model PurchaseTransaction {
  id                  String        @id @default(cuid())
  type                PurchaseType
  purchaseNumber      String        @unique // Nomor PO (SPE-xxx/PO/yy) atau Nomor Ref Pembelian Langsung
  vendorName          String
  grandTotal          Float         // Total Nilai Tagihan
  
  // WAJIB: Persetujuan Direktur sebelum Keuangan bisa transfer uang sepeserpun
  isApprovedByDirector Boolean      @default(false)
  
  // Relasi Histori Pembayaran (DP, Termin, Lunas)
  payments            Payment[]
  
  status              POStatus      @default(DRAFT)
  createdAt           DateTime      @default(now())
}

model Payment {
  id                  String              @id @default(cuid())
  purchaseId          String
  purchase            PurchaseTransaction @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  
  paymentType         PaymentType   
  amountPaid          Float         // Nominal (Rp)
  transferDestination String        // Info Bank & Rekening
  proofOfTransferUrl  String?       // Struk
  paidAt              DateTime      @default(now())
}