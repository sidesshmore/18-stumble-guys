'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Filter, X } from 'lucide-react'

interface User {
  id: string
  full_name: string | null
  email: string
  role: string
}

interface Props {
  users: User[]
  actions: string[]
  current: { action?: string; user_id?: string; role?: string; date_from?: string; date_to?: string }
  activeCount: number
}

export function AuditFilters({ users, actions, current, activeCount }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // reset to page 1 on any filter change
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const clearAll = useCallback(() => {
    router.push(pathname)
  }, [router, pathname])

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Action filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Action</label>
          <select
            value={current.action ?? ''}
            onChange={e => updateFilter('action', e.target.value)}
            className="w-full text-sm rounded-md border px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All actions</option>
            {actions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* User filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">User</label>
          <select
            value={current.user_id ?? ''}
            onChange={e => updateFilter('user_id', e.target.value)}
            className="w-full text-sm rounded-md border px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.full_name ?? u.email}
              </option>
            ))}
          </select>
        </div>

        {/* Role filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Role</label>
          <select
            value={current.role ?? ''}
            onChange={e => updateFilter('role', e.target.value)}
            className="w-full text-sm rounded-md border px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="client">Client</option>
          </select>
        </div>

        {/* Date from */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From date</label>
          <input
            type="date"
            value={current.date_from ?? ''}
            onChange={e => updateFilter('date_from', e.target.value)}
            className="w-full text-sm rounded-md border px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Date to */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To date</label>
          <input
            type="date"
            value={current.date_to ?? ''}
            onChange={e => updateFilter('date_to', e.target.value)}
            className="w-full text-sm rounded-md border px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  )
}
