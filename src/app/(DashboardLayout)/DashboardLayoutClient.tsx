'use client'

import Header from './layout/header/Header'
import Sidebar from './layout/sidebar/Sidebar'
import type { DashboardNotification } from './layout/header/Notifications'
import { useNotificationFeed } from './layout/header/useNotificationFeed'
import type { UserRole } from '@/generated/prisma/enums'

export default function DashboardLayoutClient({
  children,
  canManageUsers,
  canAccessLogistics,
  canAccessExecutive,
  canAccessFinance,
  canAccessProjects,
  canAccessDrafter,
  isMover,
  profilePhotoUrl,
  userName,
  userRole,
  notifications,
}: Readonly<{
  children: React.ReactNode
  canManageUsers: boolean
  canAccessLogistics: boolean
  canAccessExecutive: boolean
  canAccessFinance: boolean
  canAccessProjects: boolean
  canAccessDrafter: boolean
  isMover: boolean
  profilePhotoUrl: string | null
  userName: string
  userRole: UserRole
  notifications: DashboardNotification[]
}>) {
  const { data, error, mutate } = useNotificationFeed()
  const sidebarCounts = data?.sidebarCounts ?? {
    executive: 0,
    logistics: 0,
    finance: 0,
  }

  return (
    <div className='flex w-full min-h-screen'>
      <div className='page-wrapper flex w-full'>
        <div className='xl:block hidden'>
          <Sidebar
            canManageUsers={canManageUsers}
            canAccessLogistics={canAccessLogistics}
            canAccessExecutive={canAccessExecutive}
            canAccessFinance={canAccessFinance}
            canAccessProjects={canAccessProjects}
            canAccessDrafter={canAccessDrafter}
            isMover={isMover}
            sidebarCounts={sidebarCounts}
          />
        </div>
        <div className='body-wrapper w-full bg-background'>
          <Header
            canManageUsers={canManageUsers}
            canAccessLogistics={canAccessLogistics}
            canAccessExecutive={canAccessExecutive}
            canAccessFinance={canAccessFinance}
            canAccessProjects={canAccessProjects}
            canAccessDrafter={canAccessDrafter}
            isMover={isMover}
            profilePhotoUrl={profilePhotoUrl}
            userName={userName}
            userRole={userRole}
            notifications={notifications}
            sidebarCounts={sidebarCounts}
            notificationFeed={data ?? null}
            notificationLoadFailed={Boolean(error)}
            refreshNotifications={mutate}
          />
          <div className='container mx-auto px-6 py-30'>{children}</div>
        </div>
      </div>
    </div>
  )
}
