'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import * as profileData from './data'
import SimpleBar from 'simplebar-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/actions/auth'
import { UserRole } from '@/generated/prisma/enums'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const roleLabels: Record<UserRole, string> = {
  [UserRole.DIRECTOR]: 'Direktur',
  [UserRole.DEPUTY_DIRECTOR]: 'Wakil Direktur',
  [UserRole.DRAFTER]: 'Drafter',
  [UserRole.FINANCE]: 'Keuangan',
  [UserRole.LOGISTICS]: 'Koordinator Logistik',
  [UserRole.KOORDINATOR]: 'Koordinator Lapangan',
  [UserRole.FIELD_TEAM]: 'Tim Lapangan',
  [UserRole.MOVER]: 'Mover',
  [UserRole.ADMINISTRATIONS]: 'Administrasi',
}

const Profile = ({
  canManageUsers,
  profilePhotoUrl,
  userName,
  userRole,
}: {
  canManageUsers: boolean;
  profilePhotoUrl: string | null;
  userName: string;
  userRole: UserRole;
}) => {
  return (
    <div className='relative group/menu ps-15 shrink-0'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span className='hover:text-primary hover:bg-lightprimary rounded-full flex justify-center items-center cursor-pointer group-hover/menu:bg-lightprimary group-hover/menu:text-primary'>
            <Image
              src={profilePhotoUrl ?? '/images/profile/user-1.jpg'}
              alt='Foto profil'
              height={35}
              width={35}
              style={{ height: 35, width: 35 }}
              className='rounded-full'
            />
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align='end'
          className='w-[250px] overflow-hidden rounded-md border-0 bg-[#102A4D] p-0 text-white shadow-lg'>
          <div className='border-b border-white/10 px-4 py-4 text-center'>
            <p className='truncate text-base font-bold text-white'>{userName}</p>
            <span className='mt-2 inline-flex max-w-full truncate rounded-full bg-[#E67E22] px-3 py-1 text-xs font-semibold text-white'>
              {roleLabels[userRole]}
            </span>
          </div>
          <SimpleBar>
            {canManageUsers && (
              <DropdownMenuItem asChild>
                <Link
                  href='/apps/users'
                  className='px-4 py-2 flex items-center group/link w-full text-slate-300 hover:bg-[#19385E] hover:text-white focus:bg-[#19385E] focus:text-white'
                >
                  <div className='flex items-center gap-3 w-full'>
                    <Icon
                      icon='tabler:user-plus'
                      className='text-lg text-slate-400 group-hover/link:text-white'
                    />
                    <h5 className='mb-0 text-sm text-slate-300 group-hover/link:text-white'>
                      Kelola Akun
                    </h5>
                  </div>
                </Link>
              </DropdownMenuItem>
            )}
            {profileData.profileDD.map((item, index) => (
              <DropdownMenuItem key={index} asChild>
                <Link
                  href={item.url}
                  className='px-4 py-2 flex justify-between items-center group/link w-full text-slate-300 hover:bg-[#19385E] hover:text-white focus:bg-[#19385E] focus:text-white'>
                  <div className='flex items-center gap-3 w-full'>
                    <Icon
                      icon={item.icon}
                      className='text-lg text-slate-400 group-hover/link:text-white'
                    />
                    <h5 className='mb-0 text-sm text-slate-300 group-hover/link:text-white'>
                      {item.title}
                    </h5>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </SimpleBar>

          <DropdownMenuSeparator className='my-2 bg-white/10' />

          <form action={logout} className='px-4 pb-4'>
            <Button
              type='submit'
              variant='outline'
              className='w-full rounded-md border-[#E67E22] text-[#E67E22] hover:bg-[#E67E22] hover:text-white'>
              Keluar
            </Button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default Profile
