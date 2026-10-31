# Laporan Pekerjaan dan Panduan Skema

Pembaruan terakhir: 31 Oktober 2026.

Dokumen ini merangkum perubahan aplikasi yang dikerjakan pada rangkaian tugas
terakhir dan memberi peta singkat untuk merawat skema Prisma. Catatan rinci
pekerjaan terdahulu juga tersedia di [PROJECT-STATUS.md](./PROJECT-STATUS.md)
dan [Pembaruan.md](./Pembaruan.md).

## Pekerjaan yang telah diselesaikan

### Logistik, stok, PO, dan DO

- Alur pemenuhan tiket membedakan pemenuhan dari stok gudang dan pengadaan
  melalui vendor. Saldo diperiksa kembali saat transaksi membuat DO; jika
  stok tidak cukup, item dapat dialihkan ke jalur pengadaan.
- Penyesuaian jumlah barang pada DO menyelaraskan saldo stok berdasarkan
  selisih jumlah sebelumnya dan jumlah terbaru serta mencatat pergerakan stok.
- PO dan pembelian langsung mendukung katalog vendor/barang, pemeriksaan
  Finance, persetujuan eksekutif, penerimaan barang, bukti transfer, dan
  riwayat pembayaran bertahap melalui `PaymentTransaction`.
- Dokumen PO/DO memiliki nomor dan kode publik, preview/cetak/PDF, dan
  verifikasi QR untuk PO. Preview PO mengambil data vendor dan hasil
  pemeriksaan Finance.
- Preview Logistik kini memakai PO/DO resmi yang terkait dengan alur
  persetujuan eksekutif: PO hanya tampil setelah disetujui; DO memuat jejak
  persetujuan tiket atau PO tertaut beserta QR verifikasi PO bila tersedia.
- Pembuatan DO memerlukan tiket yang disetujui eksekutif. PO yang ditautkan
  harus berstatus disetujui dan berasal dari tiket yang sama. Penerbitan
  dokumen operasional PO/DO juga mengikuti status persetujuan tersebut.

### Workspace MOVER

- `/apps/logistics` menampilkan workspace khusus MOVER: hanya DO internal yang
  ditugaskan dan pencatatan alat berat/BBM.
- MOVER dapat memulai pengiriman dan menyelesaikannya dengan foto bukti.
  Server Actions memeriksa akun penugasannya, status DO, serta menyinkronkan
  status tiket di dalam transaksi Prisma.
- Akses MOVER ke Finance, Approvals, PO, stok, dan tiket dibatasi pada route
  serta UI terkait. Penyelesaian lama melalui alur tiket saja ditolak agar
  bukti serah terima mengikuti DO.
- Bukti serah terima disimpan pada DO dan tiket terkait; kolom
  `DeliveryOrder.deliveryReceiptUrl` sudah diterapkan ke database.

### Executive Approval Hub

- Halaman `/apps/approvals` disatukan menjadi tiga tab inbox: **Persetujuan
  PO**, **Dana Beli Langsung & Tiket**, dan **Usulan Upah & Subkon**.
- Baris inbox membuka Sheet detail. Approval PO menghasilkan QR dan preview
  dokumen bertanda tangan; aksi sukses menutup Sheet dan memperbarui data.
- Persetujuan PO menyegarkan Logistik dan Dokumen Terbit. Daftar PO mencatat
  nama/tanggal pejabat yang menyetujui, sedangkan daftar DO menunjukkan apakah
  sumber persetujuannya adalah tiket material atau PO.
- Antrian mencakup PO yang sudah diperiksa Finance, tiket dan pembelian
  langsung yang menunggu, usulan upah baru, termin yang sudah diperiksa
  Finance, serta SPK, CCO, dan BAST.
- Aksi tiket, pembelian langsung, upah, dan termin mendukung Direktur maupun
  Wakil Direktur sesuai alur masing-masing. Persetujuan termin memberi
  notifikasi kepada Finance.
- Usulan upah titik kini mencatat volume, satuan, harga satuan, dan total.
  Server memvalidasi konsistensi `volume × harga satuan = total`; kolom baru
  nullable agar record lama tetap terbaca.

### Login dan email transaksional

- Login menggunakan verifikasi dua langkah wajib melalui OTP email; password
  diverifikasi sebelum kode dikirim, dan NextAuth hanya membuat sesi setelah OTP
  sekali pakai lolos pemeriksaan.
- OTP berlaku lima menit, disimpan sebagai HMAC, memiliki batas percobaan dan
  pembatasan kirim ulang.
- Pengiriman OTP menggunakan Groundmail Node SDK dengan kunci server-side
  terbatas ke scope `emails:send` dan domain pengirim yang telah diverifikasi.
  Retry hanya untuk status yang dapat dicoba ulang dan mempertahankan
  `Idempotency-Key` yang sama.
- Sandbox Groundmail dan pengiriman uji SDK ke inbox pemilik berhasil. Domain
  `mail.skala-prioritas.com` berstatus verified; pengiriman produksi ke alamat
  selain akun pemilik mengikuti batas paket Groundmail dan memerlukan
  konfigurasi billing di dashboard.

### Pekerjaan terdahulu yang tercatat

Dokumentasi proyek sebelumnya juga mencatat pekerjaan pada autentikasi/role,
modul proyek dan laporan lapangan, blueprint, equipment/HM/BBM, kontrak dan
termin subkon, notifikasi, pembayaran Finance, layout dokumen, serta kalender
dan workspace kebiasaan. Rincian implementasi dan validasi per pekerjaan
dipertahankan pada [PROJECT-STATUS.md](./PROJECT-STATUS.md).

## Peta skema Prisma

Skema utama berada di [prisma/schema.prisma](./prisma/schema.prisma). Bagian
skema disusun agar tipe, enum, dan model domain lebih mudah ditemukan:

1. **Generator dan datasource** — konfigurasi Prisma Client dan PostgreSQL.
2. **Enum domain** — status proyek, kalender/tugas, tiket, logistik/pembayaran,
   dokumen, serta role. Seluruh enum diletakkan sebelum model.
3. **Identity dan notifikasi** — `User`, `Notification`, serta relasi
   pengguna.
4. **Kalender, permintaan lama, dan produktivitas** — `CalendarEvent`,
   `MaterialRequest`, habit, work task, dan timesheet.
5. **Proyek dan operasi lapangan** — `Project`, `DailyReport`, titik kerja,
   progres, foto, dan blueprint.
6. **Persediaan dan pembelian** — `StockItem`, mutasi/penerimaan, vendor, PO,
   pembelian langsung, pembayaran, dan DO.
7. **Tenaga kerja, alat, dan subkon** — audit upah, pencairan upah, alat
   berat, kontrak dan termin subkon.
8. **Persetujuan proyek dan ticket fulfillment** — addendum, BAST, penomoran
   dokumen, tiket, item, dan audit.
9. **Dokumen digital** — template dokumen operasional, dokumen terbit, dan
   relasi PO/DO terkait.

### Hubungan data inti

- `Project` memiliki laporan harian, titik pekerjaan, tiket, blueprint,
  log alat, subkon, dan dokumen proyek.
- `Ticket` memiliki `TicketItem[]` dan dapat terhubung ke `PurchaseOrder[]`,
  `DeliveryOrder[]`, `PaymentTransaction[]`, serta `TicketAuditLog[]`.
- `PurchaseOrder`, `DirectStockPurchase`, dan `Ticket` masing-masing dapat
  memiliki riwayat `PaymentTransaction[]`; status pelunasan dihitung dari
  pembayaran yang berhasil, bukan dari satu pembayaran tunggal.
- `DeliveryOrder` memiliki `DOItem[]` dan menyimpan metode, status,
  penugasan/driver, penerimaan, serta foto bukti yang relevan.
- `ProjectWorkPoint` menyimpan usulan total dan rincian borongan opsional;
  `WageAuditLog` mencatat persetujuan atau koreksi nilai.
- `SubkonContract` memiliki `SubkonTermyn[]` dengan alur verifikasi lapangan,
  review Finance, persetujuan eksekutif, lalu pembayaran.

## Catatan pemeliharaan

- Pertahankan nilai enum dan pemetaan database seperti `UserRole @map(...)`;
  perubahan nama atau penghapusan dapat memutus kompatibilitas data yang
  sudah tersimpan.
- Kolom usulan volume/harga satuan dan bukti serah terima bersifat nullable
  untuk menjaga record lama tetap valid.
- Perubahan skema terbaru sudah diformat, divalidasi, digenerate, dan
  disinkronkan menggunakan `prisma db push`. Database yang dipakai ditentukan
  oleh `DATABASE_URL`; tinjau perubahan sebelum menjalankan perintah itu pada
  lingkungan lain.
- Repository ini tidak memiliki riwayat migration Prisma yang lengkap.
  Jangan menjalankan `prisma migrate dev` pada database yang sudah berisi data
  sebelum migration historis dipulihkan dan rencana migration ditinjau.

## Verifikasi terakhir

- `npx prisma format`, `npx prisma validate`, dan `npx prisma generate`
  berhasil.
- `npx tsc --noEmit` dan ESLint terarah untuk file yang diubah berhasil.
- `npm run build` berhasil. Build masih memberi peringatan Turbopack tentang
  tracing akses filesystem dinamis pada `src/lib/private-photos.ts`; peringatan
  tersebut tidak berasal dari perubahan hub approval atau skema upah.
- Halaman Approval Hub berhasil dimuat pada dev server yang memakai Prisma
  Client terbaru. Preview lama di port lain dapat tetap menampilkan build
  sebelumnya.
