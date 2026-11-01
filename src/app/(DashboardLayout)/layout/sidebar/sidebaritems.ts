export interface ChildItem {
  id?: number | string
  name?: string
  icon?: string
  children?: ChildItem[]
  url?: string
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
      },
      {
        name: 'Master Proyek',
        icon: 'solar:buildings-2-linear',
        url: '/apps/projects',
        requiresProjects: true,
      },
      {
        name: 'Gambar Kerja',
        icon: 'solar:ruler-pen-linear',
        url: '/apps/blueprints',
        requiresDrafter: true,
      },
      {
        name: 'Persetujuan Eksekutif',
        icon: 'solar:checklist-minimalistic-linear',
        url: '/apps/approvals',
        requiresExecutive: true,
      },
      {
        name: 'Finance Hub',
        icon: 'solar:wallet-money-linear',
        url: '/apps/finance',
        requiresFinance: true,
      },
      {
        name: 'Jadwal & Habit',
        icon: 'solar:checklist-minimalistic-linear',
        url: '/apps/habits',
      },
      {
        name: 'Tiket & Permintaan',
        icon: 'solar:ticket-linear',
        url: '/apps/tickets',
        requiresNonMover: true,
      },
      {
        name: 'Logistik Lapangan',
        icon: 'solar:delivery-linear',
        url: '/apps/logistics',
        requiresLogistics: true,
      },
      {
        name: 'Dokumen Terbit',
        icon: 'solar:documents-linear',
        url: '/apps/documents/issued',
        requiresNonMover: true,
      },
      {
        name: 'Dokumen PO & DO',
        icon: 'solar:document-text-linear',
        url: '/apps/documents',
        requiresUserManagement: true,
      },
      {
        name: 'Template Dokumen',
        icon: 'solar:document-add-linear',
        url: '/apps/templates',
        requiresUserManagement: true,
      },
      {
        name: 'Catatan',
        icon: 'solar:notes-linear',
        url: '/apps/notes',
      },
      {
        name: 'Manajemen Pengguna',
        icon: 'solar:users-group-rounded-linear',
        url: '/apps/users',
        requiresUserManagement: true,
      },
    ],
  },
]

export default SidebarContent
