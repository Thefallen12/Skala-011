export interface ChildItem {
  id?: number | string
  name?: string
  icon?: string
  url?: string
  menuKey?: string
  children?: ChildItem[]
  requiresUserManagement?: boolean
  requiresLogistics?: boolean
  requiresExecutive?: boolean
  requiresFinance?: boolean
  requiresProjects?: boolean
  requiresDrafter?: boolean
  requiresNonMover?: boolean
}

export interface MenuItem {
  heading?: string
  name?: string
  icon?: string
  id?: number | string
  url?: string
  menuKey?: string
  children?: ChildItem[]
  requiresNonMover?: boolean
}

const SidebarContent: MenuItem[] = [
  {
    heading: 'Menu Utama',
    children: [
      {
        name: 'Beranda',
        icon: 'solar:widget-2-linear',
        url: '/',
        menuKey: 'dashboard',
      },
      {
        name: 'Master Proyek',
        icon: 'solar:buildings-2-linear',
        url: '/apps/projects',
        menuKey: 'master_proyek',
        requiresProjects: true,
      },
      {
        name: 'Gambar Kerja',
        icon: 'solar:ruler-pen-linear',
        url: '/apps/blueprints',
        menuKey: 'blueprints',
        requiresDrafter: true,
      },
      {
        name: 'Persetujuan Eksekutif',
        icon: 'solar:checklist-minimalistic-linear',
        url: '/apps/approvals',
        menuKey: 'approvals',
        requiresExecutive: true,
      },
      {
        name: 'Finance Hub',
        icon: 'solar:wallet-money-linear',
        url: '/apps/finance',
        menuKey: 'finance_hub',
        requiresFinance: true,
      },
      {
        name: 'Jadwal & Habit',
        icon: 'solar:checklist-minimalistic-linear',
        url: '/apps/habits',
        menuKey: 'habits',
      },
      {
        name: 'Tiket & Permintaan',
        icon: 'solar:ticket-linear',
        url: '/apps/tickets',
        menuKey: 'tickets',
        requiresNonMover: true,
      },
      {
        name: 'Logistik Lapangan',
        icon: 'solar:delivery-linear',
        url: '/apps/logistics',
        menuKey: 'logistik',
        requiresLogistics: true,
      },
      {
        name: 'Dokumen Terbit',
        icon: 'solar:documents-linear',
        url: '/apps/documents/issued',
        menuKey: 'documents_issued',
        requiresNonMover: true,
      },
      {
        name: 'Dokumen PO & DO',
        icon: 'solar:document-text-linear',
        url: '/apps/documents',
        menuKey: 'documents',
        requiresUserManagement: true,
      },
      {
        name: 'Template Dokumen',
        icon: 'solar:document-add-linear',
        url: '/apps/templates',
        menuKey: 'templates',
        requiresUserManagement: true,
      },
      {
        name: 'Catatan',
        icon: 'solar:notes-linear',
        url: '/apps/notes',
        menuKey: 'notes',
      },
      {
        name: 'Pengaturan',
        icon: 'solar:settings-linear',
        url: '/apps/settings',
        menuKey: 'settings',
      },
    ],
  },
]

export default SidebarContent
