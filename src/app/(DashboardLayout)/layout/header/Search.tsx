'use client'
import { useState, useMemo } from 'react'
import { Icon } from '@iconify/react'
import SidebarContent, { MenuItem, ChildItem } from '../sidebar/sidebaritems'

import SimpleBar from 'simplebar-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

interface SearchResult {
  name: string
  url: string
  path: string | undefined
  icon?: string
}

function searchItems(
  items: (MenuItem | ChildItem)[],
  q: string,
  parentPath = ''
): SearchResult[] {
  let results: SearchResult[] = []

  items.forEach((item) => {
    const currentPath = parentPath
      ? `${parentPath} → ${item.name}`
      : item.name

    if (item.name?.toLowerCase().includes(q.toLowerCase()) && item.url) {
      results.push({
        name: item.name,
        url: item.url,
        path: currentPath,
        icon: item.icon,
      })
    }

    if (item.children) {
      results = [...results, ...searchItems(item.children, q, currentPath)]
    }
  })

  return results
}

function Search() {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) return []
    return searchItems(SidebarContent, query)
  }, [query])

  return (
    <div className='relative w-full'>
      <div className='flex items-center relative lg:w-xs mx-auto '>
        <Icon
          icon='solar:magnifer-linear'
          width='18'
          height='18'
          className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
        />

        <Input
          placeholder='Cari menu...'
          className='h-10 rounded-xl border-border bg-background pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/30'
          required
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div
        className={`absolute start-0 top-12 z-30 w-full rounded-xl border border-border bg-popover text-popover-foreground shadow-xl ${
          Boolean(query) ? 'block' : 'hidden'
        }`}>
        <SimpleBar className='h-72 p-4 custom-scroll'>
          {Boolean(results.length) ? (
            results.map((item, i) => (
              <Link
                key={i}
                href={item.url}
                onClick={() => setQuery('')}
                className='mb-1.5 flex w-full items-center gap-2 rounded-lg bg-muted p-2 text-sm font-medium text-foreground last:mb-0 hover:bg-accent hover:text-accent-foreground'>
                <div className='flex items-center'>
                  <Icon icon='iconoir:component' width={18} height={18} />
                  <div className='ps-3'>
                    <h5 className='mb-1 text-sm text-foreground'>
                      {item.name}
                    </h5>
                    <span className='block truncate text-xs text-muted-foreground'>
                      {item.path}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className='flex items-center justify-center h-full'>
              <h1 className='text-medium font-medium text-muted-foreground'>
                Menu tidak ditemukan.
              </h1>
            </div>
          )}
        </SimpleBar>
      </div>
    </div>
  )
}

export default Search
