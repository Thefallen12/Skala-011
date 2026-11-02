export type MaintenancePageDefinition = {
  key: string;
  name: string;
  section: string;
  path: string;
  description?: string;
  query?: Record<string, string>;
  scope?: "page" | "section";
  manageable?: boolean;
};

export const MAINTENANCE_PAGES: MaintenancePageDefinition[] = [
  { key: "dashboard", name: "Beranda", section: "Menu Utama", path: "/" },
  { key: "projects", name: "Master Proyek", section: "Master Proyek", path: "/apps/projects" },
  {
    key: "survey-location",
    name: "Lokasi & Survei Proyek",
    section: "Master Proyek",
    path: "/apps/projects",
    query: { section: "surveys" },
    scope: "section",
    description: "Mengatur tampilan peta/lokasi survei saja.",
  },
  {
    key: "survey-details",
    name: "Peta & Survei Lapangan",
    section: "Master Proyek",
    path: "/apps/projects",
    query: { section: "surveys" },
    scope: "section",
    description: "Mengatur akses ke submenu Peta & Survei Lapangan saja.",
  },
  {
    key: "survey-report",
    name: "Laporan Survei",
    section: "Master Proyek",
    path: "/apps/projects/map/report/:surveyId",
  },
  { key: "project-legacy", name: "Halaman Proyek", section: "Master Proyek", path: "/apps/project" },
  { key: "blueprints", name: "Gambar Kerja", section: "Gambar Kerja", path: "/apps/blueprints" },
  { key: "drafter", name: "Gambar Kerja & Desain Drafter", section: "Gambar Kerja", path: "/apps/drafter" },
  { key: "approvals", name: "Persetujuan Eksekutif", section: "Persetujuan Eksekutif", path: "/apps/approvals" },
  { key: "finance", name: "Finance Hub", section: "Finance Hub", path: "/apps/finance" },
  { key: "habits", name: "Jadwal & Habit", section: "Jadwal & Habit", path: "/apps/habits" },
  { key: "habit-analytics", name: "Analitik Habit", section: "Jadwal & Habit", path: "/apps/habits/analytics" },
  { key: "habit-projects", name: "Proyek Habit", section: "Jadwal & Habit", path: "/apps/habits/projects" },
  { key: "habit-roadmap", name: "Roadmap", section: "Jadwal & Habit", path: "/apps/habits/roadmap" },
  { key: "habit-schedule", name: "Jadwal", section: "Jadwal & Habit", path: "/apps/habits/schedule" },
  { key: "habit-tasks", name: "Tugas", section: "Jadwal & Habit", path: "/apps/habits/tasks" },
  { key: "habit-timesheet", name: "Timesheet", section: "Jadwal & Habit", path: "/apps/habits/timesheet" },
  { key: "tickets", name: "Tiket & Permintaan", section: "Tiket & Permintaan", path: "/apps/tickets" },
  { key: "ticket-create", name: "Buat Tiket", section: "Tiket & Permintaan", path: "/apps/tickets/create" },
  { key: "logistics", name: "Logistik Lapangan", section: "Logistik Lapangan", path: "/apps/logistics" },
  { key: "logistics-stock", name: "Stok Logistik", section: "Logistik Lapangan", path: "/apps/logistics/stock" },
  { key: "documents", name: "Dokumen PO & DO", section: "Dokumen", path: "/apps/documents" },
  { key: "documents-issued", name: "Dokumen Terbit", section: "Dokumen", path: "/apps/documents/issued" },
  { key: "templates", name: "Template Dokumen", section: "Dokumen", path: "/apps/templates" },
  { key: "orders", name: "Pesanan", section: "Pesanan", path: "/apps/orders" },
  { key: "order-create", name: "Buat Pesanan", section: "Pesanan", path: "/apps/orders/new" },
  { key: "notes", name: "Catatan", section: "Catatan", path: "/apps/notes" },
  { key: "settings", name: "Pengaturan Sistem", section: "Pengaturan", path: "/apps/settings", manageable: false },
  { key: "blog-posts", name: "Artikel", section: "Artikel", path: "/apps/blog/post" },
  { key: "blog-detail", name: "Detail Artikel", section: "Artikel", path: "/apps/blog/detail/:slug" },
  { key: "template-new", name: "Buat Template", section: "Template", path: "/dashboard/templates/new" },
  { key: "template-edit", name: "Edit Template", section: "Template", path: "/dashboard/templates/:id/edit" },
  { key: "utility-form", name: "Form Utilitas", section: "Utilitas", path: "/utilities/form" },
  { key: "utility-table", name: "Tabel Utilitas", section: "Utilitas", path: "/utilities/table" },
  { key: "iconify", name: "Ikon", section: "Utilitas", path: "/icons/iconify" },
  { key: "sample-page", name: "Halaman Contoh", section: "Utilitas", path: "/sample-page" },
  { key: "user-profile", name: "Profil Pengguna", section: "Pengguna", path: "/user-profile" },
];

export function getMaintenancePageForLocation(
  pathname: string,
  searchParams: URLSearchParams,
  enabledKeys: string[],
  scope: MaintenancePageDefinition["scope"] = "page",
) {
  return MAINTENANCE_PAGES
    .filter(
      (page) =>
        (page.scope ?? "page") === scope && enabledKeys.includes(page.key),
    )
    .filter((page) => {
      const expectedSegments = page.path.split("/").filter(Boolean);
      const actualSegments = pathname.split("/").filter(Boolean);

      if (expectedSegments.length !== actualSegments.length) return false;
      if (
        !expectedSegments.every(
          (segment, index) =>
            segment.startsWith(":") || segment === actualSegments[index],
        )
      ) {
        return false;
      }

      return Object.entries(page.query ?? {}).every(
        ([key, value]) => searchParams.get(key) === value,
      );
    })
    .sort(
      (left, right) =>
        Object.keys(right.query ?? {}).length -
        Object.keys(left.query ?? {}).length,
    )[0];
}
