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
    <div className='flex min-h-screen w-full min-w-0'>
      <div className='page-wrapper flex min-w-0 flex-1'>
        <div className='hidden xl:block xl:w-0 xl:shrink-0'>
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
        <div className='body-wrapper min-w-0 flex-1 bg-background'>
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
          <div className='container mx-auto w-full min-w-0 px-4 py-8 sm:px-6 sm:py-10 xl:py-30'>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
