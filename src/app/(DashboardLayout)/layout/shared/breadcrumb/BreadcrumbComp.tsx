'use client'

import type { ReactNode } from 'react'
import ErpHubBrand from '@/app/components/apps/erp/ErpHubBrand'

interface BreadcrumbItem {
  title: string
  to?: string
}

interface BreadCrumbType {
  title: string
  items?: BreadcrumbItem[]
  action?: ReactNode
}

const BreadcrumbComp = ({ items = [], title, action }: BreadCrumbType) => {
  return (
    <ErpHubBrand title={title} breadcrumbs={items} action={action} />
  )
}

export default BreadcrumbComp
