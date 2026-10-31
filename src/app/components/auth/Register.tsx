'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import FullLogo from '@/app/(DashboardLayout)/layout/shared/logo/FullLogo'
import CardBox from '../shared/CardBox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createAccount, type RegisterState } from '@/app/auth/register/actions'

const initialState: RegisterState = {
  status: 'idle',
  message: '',
}

const roles = [
  { value: 'DIRECTOR', label: 'Direktur' },
  { value: 'DEPUTY_DIRECTOR', label: 'Wakil Direktur' },
  { value: 'DRAFTER', label: 'Drafter' },
  { value: 'FINANCE', label: 'Keuangan' },
  { value: 'LOGISTICS', label: 'Koordinator Logistik' },
  { value: 'KOORDINATOR', label: 'Koordinator Lapangan' },
  { value: 'FIELD_TEAM', label: 'Tim Lapangan' },
  { value: 'MOVER', label: 'Mover' },
  { value: 'ADMINISTRATIONS', label: 'Administrasi' },
]

export const Register = () => {
  const [state, formAction, isPending] = useActionState(
    createAccount,
    initialState,
  )

  return (
    <div className='min-h-screen w-full flex justify-center items-center bg-lightprimary px-4 py-10'>
      <div className='w-full max-w-[480px]'>
        <CardBox>
          <div className='flex justify-center mb-4'>
            <FullLogo />
          </div>
          <h1 className='text-xl font-semibold text-center'>Buat Akun Pengguna</h1>
          <p className='text-sm text-muted-foreground text-center mt-2 mb-6'>
            Khusus administrator. Tetapkan role sesuai tanggung jawab pengguna.
          </p>

          <form action={formAction} className='space-y-5'>
            <div>
              <Label htmlFor='name' className='mb-2 block font-medium'>
                Nama lengkap
              </Label>
              <Input
                id='name'
                name='name'
                type='text'
                autoComplete='name'
                minLength={2}
                maxLength={120}
                placeholder='Masukkan nama lengkap'
                required
              />
            </div>

            <div>
              <Label htmlFor='email' className='mb-2 block font-medium'>
                Email
              </Label>
              <Input
                id='email'
                name='email'
                type='email'
                autoComplete='email'
                maxLength={254}
                placeholder='nama@perusahaan.com'
                required
              />
            </div>

            <div>
              <Label htmlFor='password' className='mb-2 block font-medium'>
                Password sementara
              </Label>
              <Input
                id='password'
                name='password'
                type='password'
                autoComplete='new-password'
                minLength={12}
                maxLength={128}
                placeholder='Minimal 12 karakter'
                required
              />
              <p className='text-xs text-muted-foreground mt-1'>
                Berikan password ini dengan aman kepada pengguna.
              </p>
            </div>

            <div>
              <Label htmlFor='role' className='mb-2 block font-medium'>
                Role pengguna
              </Label>
              <Select name='role' defaultValue='FIELD_TEAM' required>
                <SelectTrigger id='role' className='w-full'>
                  <SelectValue placeholder='Pilih role' />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {state.message && (
              <p
                className={`text-sm ${state.status === 'success' ? 'text-success' : 'text-destructive'}`}
                role={state.status === 'error' ? 'alert' : 'status'}
              >
                {state.message}
              </p>
            )}

            <Button className='w-full' type='submit' disabled={isPending}>
              {isPending ? 'Membuat akun...' : 'Buat Akun'}
            </Button>
          </form>

          <div className='text-center mt-6'>
            <Link
              href='/'
              className='text-sm font-medium text-primary hover:text-primaryemphasis'
            >
              Kembali ke dashboard
            </Link>
          </div>
        </CardBox>
      </div>
    </div>
  )
}
