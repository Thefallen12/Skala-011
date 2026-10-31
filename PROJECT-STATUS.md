# Status ERP Konstruksi Skala-Prioritas

Dokumen ini mencatat pekerjaan Project yang sudah dilakukan, perintah validasi yang dijalankan, error yang ditemukan, dan tindak lanjut yang masih diperlukan. Tidak ada kredensial atau isi file `.env` yang dicatat di dokumen ini.

## Error yang diperbaiki

Pada 18 Oktober 2026, halaman `/apps/project` gagal saat menjalankan query laporan progres:

```text
PrismaClientValidationError
Unknown field `progressPhotos` for select statement on model `DailyReport`
```

Model `ProjectProgressPhoto` dan relasinya sudah ditambahkan ke skema, dan Prisma Client sudah digenerate. Namun, proses `next dev` yang masih berjalan menggunakan client hasil bundel lama. Dev server lama dihentikan dan dimulai ulang agar memuat Prisma Client terbaru. Sesudah restart, sesi browser yang sudah login berhasil meminta `/apps/project` dengan respons `200`.

## Pekerjaan yang sudah dilakukan

### Data proyek dan dashboard

- Memeriksa workbook `D:\apps\data rehap sedang.xlsx` dan mengimpor 38 proyek yang valid.
- Total pagu proyek yang diimpor: Rp10.179.000.000.
- Mengabaikan baris subtotal dan nilai NIK yang bukan data proyek; data pribadi tidak dimasukkan.
- Menghapus 5 proyek dummy beserta laporan hariannya setelah persetujuan pengguna; 3 tiket tetap dipertahankan.
- Menambahkan luas lahan serta jenis pekerjaan ke data dan form proyek.
- Menambahkan ringkasan dashboard, pencarian/filter, pengelolaan proyek, serta tampilan realisasi anggaran.
- Menyesuaikan kartu ringkasan agar ikon dan nilai terpusat, tanpa mengubah breakpoint kolom sebelumnya.
- Membatasi tabel Project Utama menjadi 10 baris per halaman dengan ringkasan rentang data, nomor halaman, Previous, dan Next; pencarian/filter mengembalikan tabel ke halaman pertama.
- Menampilkan alamat proyek dalam dua baris: desa di baris utama, kecamatan/kabupaten di baris kecil di bawahnya. Teks tidak membungkus kata; alamat lengkap tersedia sebagai tooltip.
- Menambahkan filter kecamatan yang opsinya diambil dari alamat proyek, dapat digunakan bersama pencarian dan filter status.
- Merapikan tata letak toolbar Project Utama dengan grid responsif: satu kolom di ponsel, dua kolom di tablet, dan empat kolom di desktop; semua filter mengisi lebar kolom agar tidak terpotong.
- Menambahkan aksi pencatatan progres kumulatif dan catatan pekerjaan harian.

### Foto bukti progres

- Menambahkan relasi `ProjectProgressPhoto` pada `DailyReport`.
- Menambahkan unggah opsional maksimal 5 foto per laporan, maksimal 5 MB per foto.
- Membatasi format JPG, PNG, dan WEBP serta memeriksa signature file di server.
- Menyimpan file di direktori privat `.private-data/project-progress-photos` secara default; direktori dapat dikonfigurasi dengan `PROJECT_PROGRESS_UPLOAD_DIR`.
- Menambahkan endpoint privat yang membutuhkan autentikasi dan mencocokkan URL foto dengan rekaman database.
- Menambahkan riwayat laporan, pratinjau, dan unduh foto dari menu aksi proyek.
- Memperbesar batas body Server Actions menjadi 27 MB untuk mengakomodasi unggahan sampai 25 MB beserta overhead multipart.
- Menghapus file unggahan baru bila transaksi database gagal sebelum commit.

### PIC lapangan, titik pekerjaan, dan persetujuan upah

- Menambahkan pemilihan PIC proyek dari akun dengan role `FIELD_TEAM`.
- Menampilkan PIC pada tabel proyek dan menyediakan alur khusus melalui menu **Titik pekerjaan & upah**.
- PIC yang ditunjuk dapat mengajukan titik/lokasi tugas beserta total upah hasil negosiasi; tidak menyimpan nama atau data pribadi tukang.
- Direktur menyetujui total upah yang diusulkan. Admin/Direktur dapat memperbarui nilai yang sudah disetujui.
- PIC yang ditunjuk dapat mengirim progres kumulatif per titik, catatan, dan maksimal 5 foto per pembaruan progres.
- Foto titik disimpan privat dan hanya dapat dilihat pengguna yang sudah login melalui endpoint terautentikasi.
- Menambahkan Prisma model untuk titik pekerjaan, histori progres, dan foto progres titik; perubahan skema diterapkan ke PostgreSQL.
- Pada pengecekan data role, saat ini tersedia 1 akun Direktur dan 1 akun Finance, tanpa akun Team Lapangan. Karena itu belum dapat memilih PIC atau melakukan uji end-to-end dengan akun PIC; form Edit proyek memberi pesan agar akun Team Lapangan didaftarkan terlebih dahulu.
- Menghapus tombol template **Deploy to Vercel** yang terlihat pada tangkapan layar di seluruh layout dashboard.

## Perintah yang sudah dijalankan

Perintah-perintah berikut terkait langsung dengan implementasi dan validasi fitur Project/progres:

```powershell
npm run db:import:rehab
npx prisma validate
npx prisma generate
npx prisma db push
npx prisma format
npx tsc --noEmit
npx eslint "src/app/actions/project.ts" "src/app/(DashboardLayout)/apps/project/page.tsx" "src/app/(DashboardLayout)/types/project.ts" "src/app/components/project/ProjectProgressModal.tsx" "src/app/components/project/ProjectProgressHistoryModal.tsx" "src/app/components/project/ProjectMainTable.tsx" "src/app/api/projects/progress-photos/[fileName]/route.ts" "src/lib/project-progress-photos.ts"
npx eslint "src/app/actions/project.ts" "src/app/(DashboardLayout)/apps/project/page.tsx" "src/app/(DashboardLayout)/types/project.ts" "src/app/components/project/ProjectDashboard.tsx" "src/app/components/project/ProjectMainTable.tsx" "src/app/components/project/ProjectFormModal.tsx" "src/app/components/project/ProjectWorkPointsModal.tsx" "src/app/api/projects/work-point-photos/[fileName]/route.ts" "src/lib/project-progress-photos.ts"
npm run build
npm run dev
```

Catatan hasil:

- `prisma validate`, `prisma generate`, `prisma db push`, TypeScript, ESLint, dan production build berhasil.
- `prisma db push` menyinkronkan skema tambahan foto progres ke PostgreSQL.
- Build terakhir selesai tanpa error dan memasukkan route `/api/projects/progress-photos/[fileName]`.
- Sebelum restart, proses dev lama memang menghasilkan error Prisma tersebut. Setelah restart, browser dengan sesi login yang masih aktif meminta `/apps/project` dan Next.js mencatat respons `200`; request tanpa sesi login diarahkan ke login (`307`), sebagaimana diharapkan.
- Prisma Client hasil generate mencantumkan relasi `progressPhotos` pada model `DailyReport`.
- Pemeriksaan endpoint setelah restart: `/auth/login` memberi `200`, `/apps/project` tanpa sesi memberi `307`, dan endpoint foto privat tanpa sesi memberi `401`.
- Skema PIC/titik pekerjaan/upah berhasil diformat, divalidasi, digenerate, disinkronkan dengan `prisma db push`; TypeScript dan ESLint terarah lulus.
- Production build berhasil setelah penambahan alur PIC, titik pekerjaan, dan persetujuan upah serta penghapusan badge template.
- Query Prisma read-only ke project, PIC, titik, total upah, laporan titik, dan foto berhasil dijalankan; tidak ada titik pekerjaan lama (`workPointCount: 0` pada proyek yang diperiksa).
- Uji browser membuka menu **Titik pekerjaan & upah** berhasil dan menampilkan keadaan proyek tanpa PIC/titik; menu Edit proyek juga membuka pemilih PIC. Akun Team Lapangan belum ada untuk dipilih.
- Setelah build, dev server sudah dimulai kembali. Endpoint login menghasilkan `200`, halaman Project tanpa sesi `307`, dan endpoint foto titik tanpa sesi `401`.
- Dev server yang lama sempat mengalami `EPIPE` saat build berjalan; proses tersebut direstart. Setelah reload browser, dashboard Project kembali tampil tanpa error Prisma.

## User Management

Pada 19 Oktober 2026, halaman `/apps/users` ditambahkan mengikuti susunan dashboard pada screenshot User Management:

- Ringkasan total pengguna, akun aktif, akun baru bulan ini, dan persentase pengguna yang login dalam 30 hari.
- Kartu ringkasan dirapikan menjadi grid 2×2 berisi ikon terpusat pada layar kecil dan empat kartu horizontal pada layar lebar.
- Grafik tren registrasi dengan pilihan 7/30/90 hari serta distribusi pengguna berdasarkan role.
- Aktivitas login terakhir, peringatan akun nonaktif/belum pernah login, tindakan cepat, dan direktori yang dapat dicari serta difilter berdasarkan status/role.
- Menu **Actions** pada direktori menyediakan **Edit**, **View Profile**, dan **Delete**. Form tambah/edit mengikuti contoh dengan First Name, Last Name, Email, Role, Status, dan Phone; password sementara tetap diwajibkan saat membuat akun agar akun dapat digunakan untuk login.
- Administrator dan Direktur dapat membuat/mengedit akun, mengimpor CSV, serta mengekspor direktori/laporan. Ekspor kini juga mencakup nomor telepon.
- CSV impor dibatasi 1 MB/100 akun, wajib memiliki kolom `name,email,role,password`, menggunakan role enum aplikasi, dan password di-hash sebelum disimpan. CSV ekspor tidak memuat password.
- Penghapusan meminta konfirmasi, menolak akun sendiri/pengelola aktif terakhir, dan menolak akun yang masih memiliki relasi operasional agar riwayat proyek/tiket tetap utuh; akun terkait dapat dinonaktifkan sebagai gantinya.
- Menambahkan kolom telepon opsional `User.phone`, diterapkan secara aditif ke PostgreSQL dengan `prisma db push`.
- Perubahan role/status hanya dapat dilakukan administrator atau Direktur yang aktif. Akun pengelola yang sedang digunakan tidak dapat dinonaktifkan atau mengganti role; pengelola aktif terakhir juga tidak dapat diturunkan role/dinonaktifkan.
- Menambahkan `User.isActive` dan `User.lastLoginAt` pada Prisma schema. Akun lama mendapatkan status aktif melalui default kolom baru; riwayat login mulai tercatat saat login berikutnya.
- Pemeriksaan status/role pengguna kini dilakukan terhadap database pada `auth()`, sehingga perubahan role berlaku pada permintaan berikutnya dan akun nonaktif ditolak untuk halaman maupun Server Actions yang memakai autentikasi aplikasi.
- Menambahkan link **User Management** pada sidebar dan menu profil untuk role `ADMINISTRATIONS` dan `DIRECTOR`.

Validasi terkait:

```powershell
npx prisma validate
npx prisma generate
npx prisma db push
npx tsc --noEmit
npx eslint src/app/actions/users.ts src/app/auth/register/actions.ts src/app/components/apps/users/UserManagementDashboard.tsx src/app/components/apps/users/UserManagementCharts.tsx "src/app/(DashboardLayout)/apps/users/page.tsx" "src/app/(DashboardLayout)/layout.tsx" "src/app/(DashboardLayout)/layout/sidebar/sidebaritems.ts" auth.ts
npm run build
```

Validasi terakhir: `prisma format`, `prisma validate`, `prisma generate`, `prisma db push`, TypeScript, ESLint terarah, dan production build berhasil. Halaman User Management terverifikasi dimuat pada browser dengan sesi Direktur. Pemeriksaan visual modal Actions/add/edit belum selesai.

## File implementasi utama

- `prisma/schema.prisma` — model `ProjectProgressPhoto` dan relasi ke `DailyReport`.
- `src/app/(DashboardLayout)/apps/users/page.tsx` — route User Management yang memuat data aman pengguna untuk administrator dan Direktur.
- `src/app/components/apps/users/UserManagementDashboard.tsx` — ringkasan, pencarian/filter, impor/ekspor, tindakan akun, dan direktori.
- `src/app/components/apps/users/UserManagementCharts.tsx` — tren registrasi dan distribusi role.
- `src/app/(DashboardLayout)/apps/habits/roadmap/page.tsx` dan `src/app/components/apps/habits/roadmap/RoadmapWorkspace.tsx` — roadmap milestone dan rapat.
- `src/app/(DashboardLayout)/apps/habits/analytics/page.tsx` dan `src/app/components/apps/habits/analytics/WeeklySummary.tsx` — ringkasan mingguan jam/proyek.
- `src/app/components/apps/habits/projects/ProjectWorkspace.tsx` — timeline serta ringkasan deadline proyek.
- `src/lib/indonesia-holidays.ts` — nama dan tanggal hari besar/nasional Indonesia 2026 untuk penanda kalender timeline.
- `src/app/components/apps/habits/schedule/ProjectSchedule.tsx` — agenda, kalender, grafik jam, dan form rapat.
- `src/app/components/apps/habits/timesheet/ProjectTimesheet.tsx` — tabel timesheet ringkas dan filter.
- `src/app/actions/habit-workspace.ts` — validasi, akses, tugas anggota jamak, peserta rapat, link, timesheet, dan preferensi pengingat.
- `src/app/actions/users.ts` — aksi perubahan role/status, edit, hapus dengan perlindungan relasi, dan impor akun dengan otorisasi administrator/Direktur.
- `auth.ts` — validasi status/role terkini, pengecekan login, dan pencatatan login terakhir.
- `src/app/(DashboardLayout)/layout/sidebar/sidebaritems.ts` — link sidebar User Management.

## Habit To-Do

- Halaman `/apps/habits` membuka kalender bulanan yang menggabungkan tanggal proyek, tugas/milestone, dan agenda/rapat dari model Prisma yang sama dengan modul operasional.
- Kalender mendukung tampilan Bulanan, Mingguan, dan Harian; tampilan mingguan/harian memakai sumbu waktu per jam dari pukul 06.00. Klik slot jam kosong membuka form tugas dengan tanggal dan waktu yang sudah dipilih, lalu menyimpan melalui Server Action tugas yang sama seperti halaman Tugas Harian. Agenda pada kalender dapat dibuka tanpa tertimpa kontrol tambah tugas.
- Kisi bulanan memberi latar berbeda untuk tanggal bulan aktif dan tanggal dari bulan tetangga. Hari libur nasional Indonesia 2026 memakai penanda dan teks merah pada kalender mini/bulanan, muncul sebagai agenda sepanjang hari di mode mingguan/harian, dan tersedia sebagai kategori yang dapat difilter. Hari Minggu juga ditandai merah. Kalender mini, tombol Hari ini, navigasi periode, agenda mendatang, ekspor CSV, dan tautan tambah agenda aktif.
- Item tugas mengarah ke Tugas Harian, Product roadmap, dan Project timeline dengan proyek serta tanggal terkait. Item proyek menuju Project timeline; agenda/rapat menuju Jadwal & Rapat. Tidak ada record salinan yang dibuat hanya untuk kalender.
- Pelacak kebiasaan sebelumnya tetap tersedia melalui tab **Kebiasaan**.
- Pelacak kebiasaan berisi navigasi minggu, pemilih tanggal harian, ringkasan target/selesai, progres harian, dan daftar kebiasaan.
- Pengguna dapat menambah kebiasaan dengan jadwal setiap hari, hari kerja, atau akhir pekan; menandai/batalkan selesai per hari; dan menghapus kebiasaan melalui konfirmasi.
- Progres tersimpan per pengguna di PostgreSQL pada `Habit` dan `HabitCompletion`; setiap completion unik per kebiasaan/tanggal. Habit milik akun lain tidak dapat dibaca atau dimutasi melalui Server Actions.
- Menambahkan menu **Habit To-Do** pada sidebar Apps.
- Skema database ditambahkan secara aditif dengan Prisma `db push`; validasi TypeScript/lint/build dilakukan sesudah implementasi.
- Error runtime `prisma.habit.findMany` bernilai `undefined` dan enum `HabitFrequency` tidak ditemukan terjadi karena dev server masih memakai bundel Prisma Client lama setelah client digenerate. Dev server direstart; halaman Habit dengan sesi autentikasi berhasil dimuat (`200`), dan pemanggilan `getHabitCompletions` berhasil (`200`) tanpa error Prisma tersebut.
- Menu Habit kini memisahkan **Habit Harian**, **Project timeline**, **Product roadmap**, **Daily task track**, **Schedule & meetings**, **Timesheet**, dan **Weekly summary** menjadi route tersendiri. Halaman Habit harian tetap utuh.
- **Project timeline** menyajikan ringkasan proyek, navigasi periode Harian/Mingguan/Bulanan, satu tabel **Projects & milestones**, dan hitungan tenggat yang diturunkan dari status serta tanggal proyek. Tabel menampilkan 10 proyek per halaman dengan navigasi halaman seperti tabel Project. Kartu Running, Completed, dan Due soon dihitung dari data proyek yang dimuat; Due soon menghitung tenggat hari ini sampai 30 hari ke depan, dan catatannya menampilkan jumlah proyek terlambat. Mode Harian memakai sumbu jam 00.00–23.00 dengan ruang kolom yang cukup agar label waktu tidak bertumpuk; Mingguan/Bulanan memakai sumbu tanggal. Hari ini disorot dengan warna utama template, satu label “Sekarang”/“Hari ini” diletakkan di atas garis pada header, dan kolom proyek tetap terlihat saat tabel digeser horizontal. Header tanggal/jam menempel saat digulir, dengan offset di bawah navbar agar tidak menimpanya. Hari libur nasional/hari besar Indonesia tahun 2026 diberi sorotan merah di header kalender dan tooltip nama hari; tanggal mode harian juga menampilkan nama hari besar. Tampilan Habit menggunakan kembali warna tema template. Bar tugas ditumpuk sebagai lane pada baris proyek yang sudah ada—tanpa membuat baris proyek/tugas duplikat—dengan warna manual yang tersimpan pada tugas dan dapat diubah dari daftar Tugas Proyek. Klik bar tugas membuka detail status dan jadwal, dengan tautan ke Tugas Harian yang difilter ke proyek serta tanggal tugas. Pengguna yang berhak dapat menggeser bar tugas untuk memindahkan jam pada mode harian atau tanggal pada mode mingguan/bulanan, serta menarik ujungnya untuk menyesuaikan jam/tanggal mulai dan selesai. Jadwal disimpan melalui Server Action dengan validasi rentang dan pemeriksaan akses.
- **Product roadmap** mengelompokkan milestone per proyek dengan ETA, lead, anggota, progres turunan status tugas, dan state; panel samping menampilkan rapat mendatang, tautan Join, dan preferensi Notify me.
- **Tugas proyek** menyediakan tampilan Harian, Mingguan, dan Bulanan dengan navigasi periode, kalender tugas, pencarian/filter anggota/proyek, penugasan lead dan banyak anggota, status, warna bar pilihan manual, serta penghapusan. Pilihan warna disimpan pada `WorkTask.color`, muncul pada kalender/timeline tugas dan Project timeline, dan dapat diubah dari daftar tugas. Tampilan harian mempertahankan timeline per jam; mingguan dan bulanan memperlihatkan tugas pada tanggal terkait, termasuk tugas yang melintasi beberapa hari. Hanya pembuat, lead, atau anggota tugas yang dapat mengubah status, warna, jadwal, atau menghapusnya.
- **Schedule & meetings** memakai tiga panel terpisah untuk agenda bertimeline, kalender bulanan, dan grafik jam kerja per proyek. Form jadwal mendukung kategori acara pribadi/proyek, sepanjang hari, rentang tanggal/waktu, format virtual/hybrid/fisik, tautan, lokasi, peserta, catatan, dan pilihan menit pengingat.
- **Send E-vite** membuat draf undangan pada aplikasi email pengguna untuk tamu terpilih; email tidak dikirim oleh server. Pilihan menit pengingat disimpan bersama jadwal, tetapi pengiriman notifikasi otomatis belum dikonfigurasi.
- Tombol **Notify me** menyimpan/menghapus preferensi pengingat pengguna untuk rapat mendatang. Sistem push/email terjadwal belum terpasang; antarmuka menyatakan bahwa pengingat tersimpan, bukan mengklaim notifikasi sudah dikirim.
- **Timesheet** memiliki filter anggota (dibatasi untuk administrator/Direktur), team/role, periode 7/14/30 hari, dan proyek. Pengguna biasa hanya membaca data timesheet miliknya; semua pengguna tetap mencatat serta menghapus jam milik sendiri. Validasi server membatasi durasi harian maksimal 24 jam.
- **Weekly summary** menampilkan jam harian serta jumlah proyek yang dikerjakan dengan pembanding mingguan dari data timesheet aktual; tidak ada data contoh yang ditambahkan.
- Skema `WorkTaskMember`, `CalendarEventParticipant`, `CalendarEventReminder`, `CalendarEvent.meetingUrl`, `CalendarEvent.location`, `CalendarEvent.format`, `CalendarEvent.allDay`, `CalendarEvent.reminderMinutes`, dan `TimesheetEntry` diterapkan secara aditif melalui Prisma ke PostgreSQL.
- Dynamic import client-only dipakai untuk ApexCharts agar tidak mengakses `window` pada SSR. Form tambah tugas diuji berhasil membuat dan menghapus tugas uji melalui UI; batasan durasi 24 jam dihapus agar tugas lintas hari dapat disimpan. Perubahan kalender melewati Prisma format/validate/generate/db push; type-check dan lint terbaru lulus. Build produksi setelah penambahan tampilan periode, penanda hari ini, dan kolom proyek sticky juga lulus.
- Peringatan gambar/smooth-scroll yang berasal dari layout global tidak terkait modul Habit dan tidak diubah.
- `src/app/actions/project.ts` — validasi akses dan penyimpanan progres/foto.
- `src/lib/project-progress-photos.ts` — validasi signature dan penyimpanan file privat.
- `src/app/api/projects/progress-photos/[fileName]/route.ts` — preview/unduh privat.
- `src/app/api/projects/work-point-photos/[fileName]/route.ts` — preview/unduh foto progres per titik.
- `src/app/components/project/ProjectWorkPointsModal.tsx` — daftar titik, usulan/persetujuan upah, progres, dan foto.
- `src/app/(DashboardLayout)/apps/project/page.tsx` — query riwayat laporan dan URL foto.
- `src/app/(DashboardLayout)/types/project.ts` — tipe data dashboard dan laporan.
- `src/app/components/project/ProjectProgressModal.tsx` — input foto dan pratinjau sebelum simpan.
- `src/app/components/project/ProjectProgressHistoryModal.tsx` — histori, pratinjau, dan unduh foto.
- `src/app/components/project/ProjectMainTable.tsx` — menu untuk membuka histori progres.
- `src/app/components/project/VendorProjectTable.tsx` — daftar vendor dengan tata letak responsif.
- `src/app/(DashboardLayout)/DashboardLayoutClient.tsx` — layout dashboard tanpa tombol template Deploy to Vercel.
- `next.config.mjs` — batas unggah Server Actions.

## Pekerjaan yang masih perlu dilakukan

1. Buka dashboard Project di browser dengan sesi login untuk memeriksa tampilan final dan memastikan tidak ada overlay error.
2. Uji simpan progres tanpa foto, lalu uji unggah dan tampilkan foto JPG/PNG/WEBP.
3. Uji batas validasi: lebih dari 5 foto, file lebih dari 5 MB, format lain, dan file dengan MIME yang tidak cocok dengan signature-nya.
4. Pastikan laporan pada tanggal yang sama menambahkan foto yang sudah ada dan menolak jumlah gabungan di atas 5 foto.
5. Uji pratinjau dan unduh foto, serta pastikan request tanpa login ditolak.
6. Untuk deployment, gunakan penyimpanan persisten bersama seperti object storage atau volume persisten. Filesystem lokal/serverless tidak selalu bertahan setelah restart atau tersedia di setiap instance.
7. Verifikasi batas body request dari reverse proxy/hosting; batas aplikasi 27 MB tidak menaikkan batas proxy secara otomatis.
8. Pertimbangkan pembersihan foto yatim lama apabila proses host berhenti di tengah unggah sebelum transaksi database selesai.
9. Uji alur dengan akun Team Lapangan yang ditunjuk, akun Team Lapangan lain yang tidak ditunjuk, Admin, dan Direktur; pastikan proposal/upah mengikuti aturan akses.
10. Uji tambah titik, persetujuan/updating nilai, dan foto progres per titik di browser dengan sesi autentikasi.
11. Pertimbangkan riwayat audit perubahan nilai upah agar nilai usulan, persetujuan, dan koreksi Admin/Direktur dapat ditelusuri.

## Skenario uji browser

Skenario berikut dapat dijalankan dari `http://localhost:3000/apps/project`; beberapa memerlukan akun Team Lapangan yang ditunjuk.

1. **Memilih PIC**
   - Locator: tombol **Aksi untuk [nama proyek]** → menu **Edit proyek** → combobox **PIC Team Lapangan**.
   - Aksi: pilih user Team Lapangan, simpan proyek, buka kembali Edit proyek.
   - Harapan: nama PIC muncul di kolom **PIC Team Lapangan** dan tetap terpilih setelah reload.
   - Status sekarang: kontrol ada; belum dapat diuji karena database belum memiliki akun `FIELD_TEAM`.
2. **Mengajukan titik dan upah**
   - Locator: tombol aksi proyek → menu **Titik pekerjaan & upah** → field **Titik / jenis tugas**, **Lokasi titik**, **Usulan total upah (Rp)**.
   - Aksi: login sebagai PIC yang ditunjuk; isi tugas/lokasi dan total hasil negosiasi lalu **Kirim usulan titik**.
   - Harapan: titik tampil dengan status **Menunggu persetujuan**, beserta identitas pengusul dan nilai yang diusulkan.
3. **Persetujuan Direktur dan edit Admin**
   - Locator: **Titik pekerjaan & upah** → input total yang disetujui → tombol **Setujui total**.
   - Aksi: login sebagai Direktur dan setujui; lalu login sebagai Admin/Direktur untuk mengubah nilai yang disetujui.
   - Harapan: nilai disetujui berubah, status tetap disetujui, dan nama penyetuju/pengubah tampil.
4. **Mengirim progres dan foto per titik**
   - Locator: tombol **Kirim progres & foto titik** → **Tanggal progres**, **Progres kumulatif (%)**, **Catatan pekerjaan**, **Foto progres titik (opsional)**.
   - Aksi: sebagai PIC, kirim progres tanpa foto dan dengan foto JPG/PNG/WEBP (maksimal 5 foto, 5 MB per foto).
   - Harapan: progres/tanggal/catatan tersimpan di titik yang benar; foto dapat dibuka pada preview dan diunduh melalui endpoint privat.
5. **Validasi akses dan unggahan**
   - Aksi: coba ubah titik sebagai user Team Lapangan yang bukan PIC; akses endpoint foto tanpa login; kirim lebih dari 5 foto, file lebih dari 5 MB, atau format MIME yang tak didukung.
   - Harapan: user yang bukan PIC ditolak; tanpa login endpoint memberi `401`; input foto yang melanggar batas/format ditolak dengan pesan yang jelas.

## Logistik, Tiket Material, PO/DO, dan Dokumen

Pembaruan implementasi per 21 Oktober 2026.

### Yang sudah dikerjakan

- Menambahkan kategori tiket **Permintaan Material dari Gudang**. Pemohon memilih material yang sudah tersedia di katalog stok dan memasukkan jumlah; harga serta total biaya tidak ditampilkan pada form permintaan tersebut.
- Menambahkan validasi server untuk kategori gudang. Nama barang dan satuan diambil dari katalog, bukan dipercaya dari data teks yang dikirim browser.
- Menyederhanakan keputusan Logistik menjadi dua jalur: **penuhi dari stok gudang** atau **beli melalui PO**.
- Jalur stok mencocokkan barang dan satuan katalog serta memastikan stok mencukupi. Pembuatan DO dan pengurangan stok dilakukan dalam transaksi. DO memakai Mover dari tiket.
- Menambahkan pemeriksaan DO berdasarkan tiket sebelum membuat dokumen. Bila DO sudah ada, sistem meneruskan tiket dengan DO tersebut tanpa membuat DO baru atau mengurangi stok kembali. Jalur pembuatan DO dari halaman PO & Surat Jalan juga mengembalikan DO yang sudah ada untuk tiket yang sama.
- Jalur pembelian membuat PO yang ditautkan ke tiket. Logistik memasukkan vendor dan harga aktual; item, kuantitas, dan satuan harus tetap sesuai rincian tiket. Pembuatan PO diperiksa agar tidak ada PO ganda untuk tiket tersebut.
- Menambahkan proses pemeriksaan PO oleh Finance dan persetujuan oleh Direktur/Wakil Direktur. Pengiriman invoice/nota dari Logistik mensyaratkan PO berstatus disetujui.
- Menambahkan pemenuhan invoice dan pembayaran: Logistik mengirim bukti pembelian setelah PO disetujui, lalu Finance menyimpan bukti transfer untuk menyelesaikan tiket.
- Menambahkan relasi opsional tiket dengan PO dan kategori enum `WAREHOUSE` pada skema Prisma. Perubahan tersebut sudah disinkronkan ke database dengan `prisma db push`.
- Menambahkan nomor dokumen berurutan per tahun dengan format `SPE-<nomor>/PO/<tahun>` dan `SPE-<nomor>/DO/<tahun>`.
- Menambahkan `publicCode` acak untuk PO/DO dan rute `/d/[code]` agar dokumen dibuka tanpa menampilkan ID database.
- Menambahkan endpoint pratinjau PDF PO dan DO serta QR yang mengarah ke PDF dokumen terkait. QR menggunakan logo PNG `public/images/logos/icont Logo.png`; kop dokumen menggunakan `public/images/logos/cop-surat.png`.
- Menyelaraskan template cetak PO dan DO dengan contoh: logo kop di kiri, judul di kanan, dua garis berwarna navy/oranye, kotak nomor PO/DO, serta garis oranye di footer.
- Menampilkan nama lokasi proyek dalam format **Kelompok Tani (Desa/Lokasi)** pada dokumen PO/DO.
- Menambahkan tautan dokumen untuk membuka PO/DO yang sudah dibuat. Perubahan dari form edit PO/DO kembali ke halaman sebelumnya setelah penyimpanan berhasil.

### Alur operasional

#### 1. Permintaan dipenuhi dari stok gudang

```text
Pemohon membuat tiket material
  → bila memilih “Permintaan Material dari Gudang”:
      pilih item katalog + masukkan jumlah (tanpa harga)
  → tiket diajukan dan disetujui Direktur
  → Logistik memilih “Stok tersedia di gudang”
  → sistem memeriksa apakah tiket sudah memiliki DO
      ├─ sudah ada: lanjutkan dengan DO yang sama; jangan membuat DO yang Baru lagi
      └─ belum ada: cocokkan item/satuan dan cek stok
           → buat DO bernomor otomatis
           → kurangi stok satu kali dalam transaksi yang sama
           → teruskan kepada Mover
  → Mover mengirim bukti penerimaan
  → tiket menjadi selesai
```

#### 2. Permintaan memerlukan pembelian dari vendor

```text
Pemohon membuat dan mengajukan tiket material
  → Direktur menyetujui tiket
  → Logistik memilih jalur pembelian, lalu memasukkan vendor dan harga aktual
  → sistem membuat PO terkait tiket dan menunggu pemeriksaan Finance
  → Finance memeriksa PO
  → Direktur/Wakil Direktur menyetujui PO
  → Logistik membeli material dan mengunggah invoice/nota
  → Finance memproses pembayaran dan mengunggah bukti transfer
  → tiket selesai
```

#### 3. Membuka dan mencetak dokumen

```text
PO/DO dibuat dengan nomor SPE dan kode publik acak
  → dokumen dibuka melalui /d/[code]
  → pengguna mengubah data bila berwenang dan menyimpan
  → setelah penyimpanan berhasil, kembali ke halaman sebelumnya
  → pengguna membuka pratinjau/cetak PDF
  → QR pada dokumen menuju PDF dokumen tersebut
```

### Berkas implementasi terkait

- `prisma/schema.prisma` — relasi tiket–PO, PO/DO, dan enum kategori tiket.
- `src/app/actions/tickets.ts` — permintaan gudang, pemenuhan stok dan DO, PO tiket, invoice Logistik, serta pembayaran Finance.
- `src/app/actions/orders.ts` — pemeriksaan/persetujuan PO dan pembuatan/perubahan DO.
- `src/app/components/apps/tickets/CreateTicketModal.tsx` — input kategori dan item dari katalog gudang.
- `src/app/components/apps/tickets/LogisticsActionModal.tsx` — pilihan jalur pemenuhan, pembuatan PO, dan pengiriman invoice.
- `src/app/components/apps/tickets/TicketListing.tsx` — aksi Logistik dan tautan DO yang sudah ada.
- `src/app/(DashboardLayout)/apps/logistics/page.tsx` — data tiket, PO, dan DO untuk workspace Logistik.
- `src/app/d/[code]/page.tsx` — route dokumen berdasarkan kode publik.
- `src/components/documents/PurchaseOrderTemplate.tsx` dan `src/components/documents/DeliveryOrderTemplate.tsx` — template cetak PO/DO.
- `src/app/api/documents/po/route.ts` dan `src/app/api/documents/do/route.ts` — PDF PO/DO.
- `src/lib/documents/numbering.ts`, `src/lib/documents/random-code.ts`, `src/lib/documents/qr-code.ts`, dan `src/lib/documents/render-pdf.ts` — nomor, kode publik, QR, dan rendering PDF.
- `src/lib/documents/lock-ticket-delivery-order.ts` — penguncian pembuatan DO terkait tiket.

### Validasi dan batasan yang diketahui

- Prisma schema sudah divalidasi, Prisma Client digenerate, dan perubahan skema kategori `WAREHOUSE` serta relasi PO–tiket berhasil diterapkan ke database.
- TypeScript dan lint terarah lulus untuk perubahan yang disebutkan sebelumnya; production build juga pernah berhasil setelah alur logistik dan pembuatan PDF diterapkan.
- Perubahan visual terakhir diperiksa dengan TypeScript dan lint terarah. Build ulang tidak dijalankan mengikuti arahan pengguna.
- Tidak ada transaksi uji PO, DO, atau invoice yang dibuat hanya untuk validasi.
- Pemenuhan gudang mengurangi stok dan mencatat `StockMovement` OUT dalam transaksi yang sama; tiket yang sudah memiliki DO diteruskan tanpa pengurangan stok kedua.
- PDF membutuhkan Chrome/Edge lokal pada Windows atau Chromium yang tersedia di runtime deployment.

## Command Hub ERP Konstruksi

Pembaruan implementasi ERP konstruksi sesuai `Pembaruan.md`.

### Fitur dan alur yang ditambahkan

- Hub utama memakai empat halaman `/apps/approvals`, `/apps/projects`, `/apps/logistics`, dan `/apps/finance`, tetap menggunakan sidebar/header dan komponen UI template.
- Workstation proyek memuat pagu vs realisasi, laporan K3/cuaca/tenaga kerja/peralatan, titik pekerjaan, gambar kerja, kontrak subkon, dan progres termin.
- Gambar kerja disimpan privat setelah pemeriksaan signature PDF/DWG/DXF. Endpoint file mensyaratkan login dan membatasi akses berdasarkan role serta PIC proyek.
- Log alat berat memvalidasi HM awal/akhir, jam efektif, BBM, tanggal, dan hak akses proyek.
- SPK subkon menjalani approval eksekutif. Klaim termin dihitung sebagai progres incremental; retensi mengikuti nilai kontrak (default 5%). Termin melewati verifikasi lapangan, pemeriksaan Finance, approval eksekutif, lalu pembayaran Finance dengan bukti transfer.
- Finance dapat mencairkan retensi dengan bukti transfer setelah semua termin dibayar dan masa pemeliharaan selesai.
- CCO memvalidasi nilai perubahan dan memperbarui pagu/tanggal akhir dalam transaksi setelah disetujui. PHO mensyaratkan progres 100%; FHO mensyaratkan PHO disetujui, masa pemeliharaan selesai, dan retensi sudah dicairkan.
- Rute dokumen `/d/[code]` kini juga menangani SPK dan BAST. SPK/BAST yang disetujui memiliki preview PDF inline, kop SP Engineering, QR, dan tiga kolom tanda tangan. Endpoint PDF tidak menampilkan draf yang belum disetujui.
- `/apps/blueprints` diarahkan ke tab Gambar Kerja pada Project Workstation.

### File implementasi utama

- `prisma/schema.prisma` — model gambar kerja, equipment log, SPK/termin, CCO, BAST, serta relasi PIC dan retensi.
- `src/app/actions/construction.ts` — Server Actions untuk gambar kerja, log alat/BBM, SPK, termin, CCO, BAST, dan retensi.
- `src/app/(DashboardLayout)/apps/approvals/page.tsx` dan `src/app/components/apps/approvals/` — antrean PO/tiket/upah dan persetujuan SPK/CCO/BAST.
- `src/app/(DashboardLayout)/apps/projects/page.tsx` dan `src/app/components/apps/projects/ProjectWorkstation.tsx` — data proyek, laporan lapangan, gambar kerja, CCO, serta termin.
- `src/app/(DashboardLayout)/apps/logistics/page.tsx` dan `src/app/components/apps/logistics/LogisticsHub.tsx` — alur logistik, PDF PO/DO, dan log alat berat.
- `src/app/(DashboardLayout)/apps/finance/page.tsx` dan `src/app/components/apps/finance/FinanceHub.tsx` — pemeriksaan/pembayaran dan pencairan retensi.
- `src/lib/blueprint-files.ts` dan `src/app/api/projects/blueprints/[fileName]/route.ts` — penyimpanan serta akses file gambar privat.
- `src/app/d/[code]/page.tsx` dan `src/app/api/documents/construction/route.ts` — preview dokumen konstruksi berbasis kode publik.

### Status validasi dan database

- Validasi terbaru: `npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit`, dan ESLint terarah pada modul ERP — lulus.
- Skema telah berubah, tetapi tidak ada `prisma db push` atau migrasi yang dijalankan dalam pembaruan ini. Terapkan skema hanya setelah review dan persetujuan; database belum diverifikasi untuk model baru.
- Belum menjalankan production build atau pengujian end-to-end. PDF membutuhkan Chrome/Edge lokal di Windows atau Chromium di runtime deployment.

## Skema Tambahan & Alur Kerja

Pembaruan 22 Oktober 2026:

- Mengintegrasikan model `StockItem` dengan pemetaan ke tabel `LogisticsStockItem` yang sudah ada agar data persediaan tetap dipakai. Menambah kategori barang dan relasi pergerakan stok tanpa membuat tabel katalog paralel.
- Menambah `Vendor`, `WageAuditLog`, dan `EquipmentMaster`; menghubungkan log alat dengan master dan mencatat HM terbaru.
- Model `Habit`, `HabitCompletion`, `WorkTask`, `WorkTaskMember`, `CalendarEvent`, `CalendarEventParticipant`, `CalendarEventReminder`, dan `TimesheetEntry` telah tersedia sebelumnya dengan variasi nama field/enum yang kompatibel dengan aplikasi, sehingga tidak dibuat ulang.
- Pemenuhan tiket gudang membuat DO, mengurangi stok, dan mencatat pergerakan OUT atomik. Jalur DO yang sudah ada tidak mengurangi stok atau mencatat movement duplikat. Penerimaan stok tanpa PO juga mencatat movement IN.
- Persetujuan/koreksi upah titik kini menulis `WageAuditLog`; koreksi upah yang telah disetujui mensyaratkan alasan.
- Timesheet mengunci transaksi per user/tanggal saat menjumlahkan durasi agar input bersamaan tidak bisa melewati batas total 24 jam.
- Hub Logistik menyediakan Sheet untuk stok masuk, registrasi master alat, dan log HM/BBM. Approval Hub menyediakan form nilai dan alasan audit upah dalam Sheet.
- Validasi setelah pembaruan: `npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit`, dan ESLint terarah — lulus.
- Tidak menjalankan migrasi/`db push`; perubahan skema perlu diterapkan ke PostgreSQL secara terpisah setelah ditinjau.

## Pembaruan PO/DO: Pembayaran dan Pratinjau PDF

Pembaruan 22 Oktober 2026:

- Purchase Order kini menyimpan metode pembayaran `CASH` atau `TRANSFER`. Transfer mensyaratkan nama bank tujuan, nomor rekening, dan nama pemilik rekening; validasi dijalankan pada form dan Server Action.
- Form pembuatan PO dari antrean tiket Logistik juga memiliki metode pembayaran yang sama, sehingga PO tiket maupun PO mandiri menyimpan detail transfer di dokumen.
- Informasi pembayaran ditampilkan pada PDF PO, sementara rincian rekening hanya ditampilkan untuk metode Transfer. Data lama yang belum memiliki metode eksplisit menggunakan default Cash.
- Perubahan skema PO diterapkan ke PostgreSQL dengan `npx prisma db push`; `npx prisma validate` dan `npx prisma generate` berhasil.
- Tombol pratinjau PO dan DO pada form dokumen membuka Sheet. Pratinjau Sheet kini merender template HTML cetak secara langsung, tidak bergantung pada PDF viewer iframe browser.
- TypeScript dan ESLint terarah pada file PO/DO yang diubah lulus setelah sinkronisasi skema.
- Tidak dilakukan pengujian transaksi nyata atau pembuatan data uji.

## Notifikasi Berbasis Peran dan Deep Link

- Menambahkan model `Notification`, relasi ke `User`, enum `INFO`, `WARNING`, `SUCCESS`, `APPROVAL`, serta indeks untuk kueri unread per pengguna.
- Membuat utilitas `sendNotification` untuk target satu pengguna atau semua pengguna aktif pada satu/beberapa role; semua `actionUrl` dibatasi ke path internal.
- Menambahkan API autentikasi untuk polling daftar notifikasi/unread count dan menandai notifikasi telah dibaca milik pengguna yang sedang login.
- Header menampilkan lonceng dengan badge merah dan dropdown; SWR melakukan pembaruan setiap 15 detik. Badge antrean Approval, Logistik, dan Finance ditampilkan pada menu Sidebar.
- Pemicu transaksi mengirim PO baru ke Finance, PO yang telah diperiksa Finance ke Direktur/Wakil, serta tiket yang diajukan ke Direktur dan permintaan material ke Koordinator Lapangan.
- Link notifikasi membawa tab dan `openSheet` untuk PO Finance/Approval dan tiket. Notifikasi PO yang disetujui membuka pratinjau dokumen melalui rute kode publik.
- Pengguna lama tetap menerima notifikasi sintetik habit, tugas, dan tiket di dropdown bersama notifikasi persisten.
- Badge menu Approval, Logistik, dan Finance sekarang dihitung dari notifikasi belum dibaca yang action URL-nya mengarah ke hub terkait (termasuk pratinjau PO `/d/` untuk penerima Finance/Logistik), memakai feed SWR yang sama dengan lonceng. Header hanya merender satu lonceng pada tiap breakpoint.
- Pratinjau PO/DO pada form, Approval Hub, dan Finance Hub memakai template HTML yang juga dipakai untuk cetak; endpoint PDF tetap tersedia untuk unduh/cetak terpisah.
- `npx prisma validate`, `npx prisma generate`, `npx prisma db push`, TypeScript, dan ESLint terarah dijalankan. Database berhasil disinkronkan dengan skema Prisma terbaru.

### Penguatan approval, pembayaran, dan dokumen

- Persetujuan PO oleh Direktur/Wakil kini mensyaratkan PO berstatus menunggu persetujuan dan metadata Checked By Finance terisi.
- PO menyimpan pilihan PPN 11% (default tidak dikenakan), tujuan transfer, bukti pembayaran, dan waktu pelunasan. Toggle pajak berlaku untuk PO mandiri maupun PO dari tiket; total pada form, template cetak, dan endpoint PDF memakai pilihan yang sama.
- Form Finance mewajibkan keterangan tujuan transfer. Untuk tiket ber-PO, pembayaran Finance secara atomik menyimpan bukti/tujuan/waktu lunas pada PO dan tiket.
- Tiket material dengan PO tidak dapat diselesaikan tanpa status PO disetujui, bukti transfer Finance, tujuan transfer, dan waktu pelunasan; jalur Mover tidak dapat melewati pemeriksaan tersebut.
- Notifikasi PO memakai pesan khusus sesuai tahap: pemeriksaan Checked By, persetujuan dan QR Sign, lalu tindak lanjut pembayaran dan Surat Jalan.
- Sheet/preview PO dan pembayaran menyediakan tombol Tutup di footer; dokumen digital PO valid menyediakan Download PDF dengan nama berkas dokumen.
- Skema tambahan berhasil diterapkan dengan `npx prisma db push`. `npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit`, ESLint terarah, dan `npm run build` lulus.
- Pada tabel **Dokumen Digital & Verifikasi QR**, tombol **Review** untuk PO valid mengunduh PDF; untuk tipe dokumen lain tombol Review tetap membuka verifikasi QR.

### Perapian blok informasi PO

- Menata ulang data vendor, tanggal, pembayaran, proyek, dan syarat pembayaran menjadi baris label–titik dua–nilai yang konsisten, agar titik dua dan nilai tidak bergeser ketika teks panjang membungkus.
- Syarat pembayaran memakai satu baris penuh di bawah dua kolom informasi; nilai tetap membungkus rapi tanpa menabrak label atau kolom lain.
- Perubahan diterapkan pada preview HTML dan template PDF PO. Preview `/d/[code]?preview=1` diperiksa di browser, dan endpoint PDF mengembalikan `200 application/pdf`.
- TypeScript (`npx tsc --noEmit`) dan ESLint terarah lulus.

### Penegasan Checked By Finance pada PO

- Kolom Finance di blok tanda tangan PO kembali menampilkan label Checked By yang jelas, nama pemeriksa, dan waktu pemeriksaan setelah Finance melakukan review.
- PDF PO menampilkan informasi yang sama; sebelum diperiksa, kolom tetap menyatakan “Menunggu pemeriksaan” / “Belum diperiksa”, bukan menampilkan tanda tangan yang seolah-olah sudah diberikan.
- Waktu pemeriksaan diteruskan dari rekaman `reviewedAt` pada rute dokumen dan Approval Hub.

## Sinkronisasi Dokumen PO dan Penerimaan Stok

- Tabel **Dokumen Digital & Verifikasi QR** sekarang membaca Purchase Order berstatus disetujui dari model `PurchaseOrder`, sama dengan sumber data di halaman **Purchase Orders**. Aksi **Review** membuka `/d/[publicCode]` untuk PO yang sama.
- Saat Finance mencatat pembayaran PO untuk tiket material, transaksi yang sama menyimpan bukti bayar, tujuan transfer, dan waktu pelunasan; menerima rincian PO ke stok gudang; membuat `StockPurchase` yang terhubung ke PO; serta mencatat `StockMovement` bertipe `IN`.
- Penerimaan menambah stok barang yang cocok berdasarkan nama/satuan dan memperbarui harga rata-rata tertimbang. Jika barang belum ada, sistem membuat item katalog; jika ditemukan data ganda, transaksi ditolak dengan pesan yang jelas dan tidak menyimpan pembayaran parsial.
- Setelah pembayaran PO, tiket tetap di antrean Logistik. Pembuatan DO berikutnya mengurangi stok dan mencatat `StockMovement` bertipe `OUT` dalam transaksi atomik; DO yang sudah ada tidak mengurangi stok dua kali.
- UI dan Server Action mencegah pengiriman invoice ulang untuk PO yang sudah lunas dan masuk stok.
- Relasi opsional `StockPurchase.purchaseOrderId` telah ditambahkan dan disinkronkan ke PostgreSQL tanpa meminta reset atau menerima kehilangan data.
- Validasi: `npx prisma format`, `npx prisma validate`, `npx prisma generate`, `npx prisma db push`, `npx tsc --noEmit`, ESLint terarah, dan `npm run build` berhasil.
- Tidak dibuat transaksi uji atau data dummy; alur Finance → stok IN → DO → stok OUT belum diuji end-to-end dengan tiket nyata.

## Katalog Vendor dan Form PO Terpusat

- Logistics Hub memiliki tab **Katalog Vendor** dengan daftar vendor disetujui dan Sheet untuk membuat vendor baru; Executive Approval Hub memiliki tab **Evaluasi Vendor** dengan rating yang hanya dapat diubah oleh Direktur.
- Model `Vendor` sudah memuat `bankName`, `bankAccount`, dan `bankHolder`; Purchase Order menyimpan relasi vendor serta salinan data pembayaran. Skema disinkronkan ke PostgreSQL menggunakan `npx prisma db push`.
- Form reusable `CreatePOForm` dipakai untuk membuat PO dari tiket material maupun restock gudang. Vendor dipilih dari data server; metode pembayaran dan rekening tujuan terisi dari data vendor, item tiket diprefill dan terkunci, sedangkan restock memungkinkan penambahan item manual dengan tujuan **Gudang (tanpa proyek)**.
- Finance dapat memproses pembayaran PO restock tanpa tiket. Pembayaran, bukti, penerimaan stok, `StockPurchase`, dan pergerakan `IN` disimpan atomik; penerimaan PO tiket menggunakan helper yang sama dan DO berikutnya tetap mengeluarkan stok melalui alur yang sudah ada.
- Validasi terakhir: `npx prisma format`, `npx prisma validate`, `npx prisma generate`, `npx prisma db push`, `npx tsc --noEmit`, ESLint terarah, dan `npm run build` berhasil. ESLint hanya menampilkan satu peringatan `<img>` yang sudah ada di `TicketListing.tsx`.
- Belum dilakukan transaksi uji end-to-end untuk PO restock atau pengubahan rating menggunakan akun operasional.

## Sinkronisasi Detail Vendor pada Preview PO

- Preview PO di `/d/[code]`, panel Finance/Approval, dan endpoint PDF kini membaca alamat, email kontak, nomor telepon, serta rincian bank dari relasi Vendor. Untuk PO lama tanpa `vendorId`, detail dicari berdasarkan nama vendor.
- PO `SPE-3/PO/2026` terverifikasi terhubung ke Vendor dan semua data kontak serta bank tersedia; preview browser menampilkan data katalog tersebut, bukan placeholder.

## Perbaikan Pembayaran Finance dan Penerimaan Stok

- Aksi pembayaran Finance sempat selalu gagal saat menerima material PO karena kunci advisory PostgreSQL memuat byte NUL, yang menyebabkan error UTF-8. Kunci database sekarang memakai JSON string aman, sementara kunci internal map stok tetap unik.
- Uji query advisory lock berhasil. Data tiket `TKT-202610-006` tetap berstatus menunggu pembayaran dan tidak menyimpan bukti pembayaran maupun waktu pelunasan setelah transaksi sebelumnya gagal; transaksi gagal memang ter-rollback.
- Validasi TypeScript dan ESLint terarah berhasil setelah perbaikan. Pembayaran tidak diulangi otomatis; Finance perlu mengirim ulang bukti dan menekan proses pembayaran setelah aplikasi memuat perubahan.

## Pemilihan Barang PO dari Katalog Stok

- Form PO sekarang memakai dropdown barang yang menampilkan nama, SKU, dan satuan, bukan input nama bebas. Harga katalog terisi otomatis; jumlah dan harga PO tetap dapat disesuaikan, sedangkan nama dan satuan berasal dari barang yang dipilih.
- Tombol **Tambah Jenis Barang** membuka dialog untuk mendaftarkan jenis baru dengan stok awal nol dan SKU otomatis. Server mengunci proses berdasarkan nama+satuan, memakai ulang data yang cocok, dan menolak nama+satuan yang ambigu.
- `POItem` kini dapat menyimpan relasi ke `StockItem`; pembayaran Finance menerima stok ke SKU yang dipilih, bukan mencari ulang hanya berdasarkan teks nama/satuan. Relasi bersifat opsional agar PO lama tetap kompatibel.
- Dropdown katalog juga tersedia saat PO dibuat dari tiket maupun restock gudang. Skema disinkronkan dengan `npx prisma db push`; `npx prisma validate`, generate client, TypeScript, ESLint terarah, dan production build berhasil. Satu peringatan `<img>` lama di `TicketListing.tsx` tetap tidak terkait perubahan ini.

## DO Ekspedisi dan Mover Lapangan

- `DeliveryOrder` menyimpan metode pengiriman, No. STK, plat kendaraan, nama driver, NIK driver, dan nomor HP driver; pilihan metode internal/ekspedisi juga tersedia pada form DO.
- Permintaan material/gudang yang dibuat Tim Lapangan kini meminta pilihan Mover aktif. Server memvalidasi bahwa user tersebut benar-benar role `MOVER`; pilihan tersebut tidak tersedia bagi role lain.
- Untuk tiket dengan PO yang sudah dibayar, proses Logistik meminta data ekspedisi, menerbitkan DO dengan status `IN_TRANSIT`, mencadangkan stok, dan mengubah tiket menjadi `IN_TRANSIT`. Pengiriman dari stok gudang tanpa PO tetap menggunakan Mover internal.
- Menandai DO ekspedisi sebagai `DELIVERED` menyelesaikan tiket yang sedang `IN_TRANSIT` dan mencatat audit log. Preview dan PDF DO menampilkan data kendaraan/driver.
- Skema sudah diformat, divalidasi, digenerate, dan disinkronkan ke PostgreSQL dengan `npx prisma db push`. TypeScript dan ESLint terarah lulus; ESLint masih memberi satu peringatan React Hook Form yang sudah ada di `CreateTicketModal.tsx`. `npm run build` berhasil.
- Alur operasional belum diuji end-to-end dengan transaksi tiket/PO nyata.

## Kerapian Metadata DO dan Relasi Nomor PO

- Baris metadata pada pratinjau dan template cetak DO memakai grid label, titik dua, dan nilai yang konsisten, mengikuti tata letak PO. PDF unduhan DO menggunakan susunan yang sama.
- DO ekspedisi yang dibuat dari tiket kini menyimpan relasi ke PO tiket yang sudah lunas. Jalur pemrosesan ulang juga melengkapi relasi pada DO lama bila relasinya masih kosong, tanpa menimpa PO yang telah terhubung.
- DO `SPE-2/DO/2026` ditautkan ke PO lunas `SPE-2/PO/2026`; relasi diperiksa dan dicatat pada database.
- Validasi: TypeScript, ESLint terarah, dan production build lulus.

## Penerimaan Material Tiba di Gudang

- DO ekspedisi menyimpan waktu tiba, akun penerima Logistik, dan URL foto bukti secara terpisah.
- Saat status DO ekspedisi diubah menjadi **Terkirim**, hanya role Logistik yang dapat menyelesaikannya dan foto JPG/PNG/WEBP maksimal 5 MB wajib diunggah. Waktu dicatat server, penerima dicatat dari akun Logistik, lalu nama penerima diperbarui pada DO.
- Foto disimpan di `.private-data/delivery-order-arrival-photos` (dapat dikonfigurasi melalui `DO_ARRIVAL_PHOTO_UPLOAD_DIR`) dan diakses melalui endpoint terautentikasi yang hanya menghidangkan file yang terhubung ke DO.
- Pratinjau/cetak DO dan PDF menampilkan nama penerima Logistik dan waktu kedatangan setelah penerimaan tercatat; halaman DO menampilkan foto bukti.
- Metode pengiriman dikunci setelah DO diterbitkan agar pengiriman ekspedisi tidak dapat dialihkan menjadi Mover internal untuk melewati persyaratan bukti penerimaan.
- Skema baru diformat, divalidasi, digenerate, dan disinkronkan ke PostgreSQL. TypeScript, ESLint terarah, dan production build lulus. Upload foto end-to-end belum diuji dengan file nyata.

## Pembelian Langsung dan Penerimaan Stok

- Formulir pembelian langsung menggunakan struktur PO: vendor dari katalog, rincian beberapa barang, jumlah desimal, harga satuan, referensi, catatan, dan PPN. Data bank/metode bayar diambil dari vendor terpilih.
- Pembelian langsung berstatus **Menunggu penerimaan** dan tidak mengubah saldo persediaan saat dibuat.
- Bagian Logistik atau Administrasi dapat menekan **Terima Barang** dan wajib mengunggah foto JPG/PNG/WEBP maksimal 5 MB. Saldo stok, harga rata-rata, pergerakan `IN`, waktu penerimaan, penerima, dan URL foto disimpan atomik; penerimaan ulang diblokir.
- Foto disimpan privat di `.private-data/direct-stock-purchase-photos` (dapat dikonfigurasi melalui `DIRECT_STOCK_PURCHASE_PHOTO_UPLOAD_DIR`) dan hanya bisa dibaca pengguna berwenang untuk pembelian yang memiliki foto terkait.
- Formulir bersama digunakan dari tab Stok Gudang di Command Hub maupun halaman Stok Logistik. Kartu ringkasan logistik kini mengatur filter status, termasuk tiket yang sedang dikirim.
- Validasi terakhir: Prisma format/validate/generate, `prisma db push`, TypeScript, ESLint terarah, dan production build berhasil. Uji penerimaan foto dengan file nyata belum dilakukan.

## Penyelesaian DO Ekspedisi dari Antrean Logistik

- Tiket material berstatus **Dalam perjalanan (ekspedisi)** yang memiliki DO berstatus dalam perjalanan kini menampilkan aksi **Terima & Selesaikan** pada daftar dan detail tiket.
- Aksi tersebut mewajibkan foto bukti tiba; status DO menjadi terkirim, tiket menjadi selesai, waktu dan penerima Logistik dicatat, audit dibuat, dan pemohon diberi notifikasi dalam satu transaksi.
- Endpoint bukti tiket mengizinkan role Logistik membaca bukti pembelian selama tiket **Dalam perjalanan**, selain status Logistik yang sudah diizinkan.
- Pemeriksaan browser menemukan URL bukti menerima 404 dari server dev sebelum restart. Setelah server Next.js dimulai ulang, endpoint PDF bukti yang sama merespons HTTP 200 (`application/pdf`). TypeScript lulus; ESLint terarah lulus dengan satu peringatan `<img>` lama di pratinjau bukti.
