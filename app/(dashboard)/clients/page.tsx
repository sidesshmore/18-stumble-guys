'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Search, Download, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'

interface Client {
  id: string
  client_number: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  phone: string | null
  language_preference: string
  created_at: string
}

export default function ClientsPage() {
  const { t } = useLanguage()
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchClients = useCallback(async (q: string) => {
    setLoading(true)
    const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}`)
    if (res.ok) setClients(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchClients(search), 250)
    return () => clearTimeout(t)
  }, [search, fetchClients])

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-zinc-900 tracking-tight">{t('clients_title')}</h1>
          <p className="text-[13px] text-zinc-600 mt-0.5" aria-live="polite" aria-atomic="true">
            {loading ? '—' : t('clients_registered', { n: clients.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export?type=clients"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-lg"
            aria-label="Export clients as CSV"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {t('clients_export')}
          </a>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t('dash_new_client')}
          </Link>
        </div>
      </div>

      {/* Search */}
      <div role="search" className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
        <Input
          className="pl-9 h-9 text-[13px] bg-zinc-50 border-zinc-200 placeholder:text-zinc-500 rounded-lg focus-visible:ring-zinc-300"
          placeholder={t('clients_search_ph')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search clients by name or ID"
          aria-controls="clients-table"
        />
      </div>

      {/* Table */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[13px] text-zinc-600" role="status" aria-live="polite" aria-busy="true">
            <span className="inline-block h-4 w-4 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin mr-2" aria-hidden="true" />
            {t('clients_loading')}
          </div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[13px] text-zinc-400">
              {search ? t('clients_no_match') : t('clients_none_yet')}
            </p>
            {!search && (
              <Link href="/clients/new" className="text-[13px] text-zinc-600 hover:text-zinc-900 underline underline-offset-2 mt-1.5 inline-block">
                {t('clients_add_first')}
              </Link>
            )}
          </div>
        ) : (
          <table id="clients-table" className="w-full text-[13px]" aria-label={search ? `${clients.length} clients matching "${search}"` : `${clients.length} clients`}>
            <thead>
              <tr className="border-b border-zinc-100">
                <th scope="col" className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">{t('clients_col_name')}</th>
                <th scope="col" className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-600 hidden sm:table-cell">{t('clients_col_id')}</th>
                <th scope="col" className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-600 hidden md:table-cell">{t('clients_col_dob')}</th>
                <th scope="col" className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-600 hidden sm:table-cell">{t('clients_col_phone')}</th>
                <th scope="col" className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">{t('clients_col_lang')}</th>
                <th scope="col" className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-600 hidden md:table-cell">{t('clients_col_reg')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {clients.map(client => {
                const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase()
                const isEs = client.language_preference === 'es'
                return (
                  <tr
                    key={client.id}
                    className="group hover:bg-zinc-100/70 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-zinc-100 flex items-center justify-center text-[11px] font-semibold text-zinc-500 shrink-0 group-hover:bg-zinc-200 transition-colors">
                          {initials}
                        </div>
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium text-zinc-800 hover:text-zinc-950 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded"
                        >
                          {client.first_name} {client.last_name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="font-mono text-[12px] text-zinc-600">
                        {client.client_number}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-500 hidden md:table-cell">
                      {client.date_of_birth ? format(new Date(client.date_of_birth), 'MMM d, yyyy') : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-zinc-500 hidden sm:table-cell">
                      {client.phone ?? <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'text-[11px] font-medium px-2 py-0.5 rounded-full',
                        isEs ? 'bg-violet-50 text-violet-600' : 'bg-zinc-100 text-zinc-500'
                      )}>
                        {isEs ? 'ES' : 'EN'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-600 text-[12px] hidden md:table-cell">
                      {format(new Date(client.created_at), 'MMM d, yyyy')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
