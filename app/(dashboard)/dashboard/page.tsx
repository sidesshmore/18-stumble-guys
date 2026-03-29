import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { AlertCircle, Clock, Plus, Sparkles, ArrowRight, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import { SemanticSearch } from './SemanticSearch'
import { getServerT } from '@/lib/server-lang'

export default async function DashboardPage() {
  const { t } = await getServerT()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('org_id, full_name, organizations(name)')
    .eq('id', user.id)
    .single()

  const [
    { count: totalClients },
    { count: activeClients },
    { count: sessionsThisMonth },
    { data: pendingFollowUps },
    { data: recentEntries },
    { data: upcomingAppointments },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('service_entries').select('*', { count: 'exact', head: true })
      .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
    supabase.from('follow_ups')
      .select('id, description, urgency, due_date, clients(first_name, last_name, id)')
      .eq('status', 'pending')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(6),
    supabase.from('service_entries')
      .select('id, service_type, date, notes, clients(first_name, last_name, id)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('appointments')
      .select('id, scheduled_at, service_type, clients(first_name, last_name, id)')
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(4),
  ])

  const orgName = (userData?.organizations as unknown as { name: string })?.name
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = userData?.full_name?.split(' ')[0] ?? 'there'

  const urgencyDot: Record<string, string> = {
    critical: 'bg-red-500',
    high:     'bg-orange-400',
    medium:   'bg-amber-400',
    low:      'bg-zinc-400',
  }
  const urgencyLabel: Record<string, string> = {
    critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
  }

  const stats = [
    { label: t('dash_total_clients'),   value: totalClients ?? 0,              accent: 'border-indigo-100 bg-indigo-50',  dot: 'bg-indigo-500' },
    { label: t('dash_active'),          value: activeClients ?? 0,             accent: 'border-emerald-100 bg-emerald-50', dot: 'bg-emerald-500' },
    { label: t('dash_sessions_month'),  value: sessionsThisMonth ?? 0,         accent: 'border-violet-100 bg-violet-50',  dot: 'bg-violet-500' },
    { label: t('dash_open_followups'),  value: pendingFollowUps?.length ?? 0,  accent: 'border-amber-100 bg-amber-50',    dot: 'bg-amber-500' },
  ]

  return (
    <main id="main-content" className="p-4 md:p-8 max-w-5xl mx-auto space-y-5 md:space-y-8 animate-fade-up">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-zinc-900 tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-[13px] text-zinc-600 mt-0.5">
            {format(new Date(), 'EEEE, MMMM d')}
            {orgName && <> &middot; {orgName}</>}
          </p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {t('dash_new_client')}
        </Link>
      </div>

      {/* Stats */}
      <section aria-label="Key metrics" className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
        {stats.map(s => (
          <div key={s.label} className={cn('border rounded-xl px-4 md:px-5 py-4', s.accent)}>
            <span className={cn('inline-block h-2 w-2 rounded-full mb-3', s.dot)} aria-hidden="true" />
            <p className="text-[28px] font-semibold text-zinc-900 tabular-nums leading-none">{s.value}</p>
            <p className="text-[12px] text-zinc-600 mt-2 leading-none">{s.label}</p>
          </div>
        ))}
      </section>

      {/* AI Search */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">
          {t('dash_search_label')}
        </p>
        <SemanticSearch />
      </div>

      {/* Funder Report shortcut */}
      {(() => {
        const now = new Date()
        const q = Math.ceil((now.getMonth() + 1) / 3)
        const year = now.getFullYear()
        const serviceBreakdown = recentEntries?.reduce<Record<string, number>>((acc, e) => {
          acc[e.service_type] = (acc[e.service_type] ?? 0) + 1
          return acc
        }, {}) ?? {}
        const topServices = Object.entries(serviceBreakdown)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
        return (
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">{t('dash_funder_report')}</p>
            </div>
            <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Before: raw data snapshot */}
              <div className="flex-1 space-y-2">
                <p className="text-[12px] font-medium text-zinc-500">{t('dash_raw_snapshot', { q, year })}</p>
                <div className="flex flex-wrap gap-3">
                  <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
                    <span className="text-[13px] font-semibold text-zinc-800 tabular-nums">{totalClients ?? 0}</span>
                    <span className="text-[12px] text-zinc-600">{t('dash_clients_label')}</span>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
                    <span className="text-[13px] font-semibold text-zinc-800 tabular-nums">{sessionsThisMonth ?? 0}</span>
                    <span className="text-[12px] text-zinc-600">{t('dash_sessions_label')}</span>
                  </div>
                  {topServices.length > 0 && (
                    <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 flex items-center gap-1.5 flex-wrap">
                      {topServices.map(([type, count]) => (
                        <span key={type} className="text-[12px] text-zinc-500">
                          {type} <span className="font-semibold text-zinc-800">{count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-zinc-600">{t('dash_funder_hint')}</p>
              </div>
              {/* CTA */}
              <Link
                href="/reports"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 h-9 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {t('dash_generate_report', { q })}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )
      })()}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Pending Follow-ups */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
              {t('dash_pending_followups')}
            </p>
            {(pendingFollowUps?.length ?? 0) > 0 && (
              <span className="text-[11px] font-semibold text-zinc-400">
                {pendingFollowUps!.length}
              </span>
            )}
          </div>

          {!pendingFollowUps?.length ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-zinc-600">{t('dash_all_caught_up')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {pendingFollowUps.map(f => {
                const client = f.clients as unknown as { first_name: string; last_name: string; id: string } | null
                return (
                  <li key={f.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-zinc-100/70 transition-colors">
                    <span
                      className={cn('mt-[6px] h-1.5 w-1.5 rounded-full shrink-0', urgencyDot[f.urgency] ?? 'bg-zinc-400')}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        {client && (
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-[13px] font-medium text-zinc-800 hover:text-zinc-950 hover:underline underline-offset-2"
                          >
                            {client.first_name} {client.last_name}
                          </Link>
                        )}
                        <span className="text-[11px] text-zinc-600 uppercase tracking-wide">
                          {urgencyLabel[f.urgency]}
                        </span>
                      </div>
                      <p className="text-[13px] text-zinc-500 mt-0.5 line-clamp-1">{f.description}</p>
                      {f.due_date && (
                        <p className="text-[12px] text-zinc-600 flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {format(new Date(f.due_date), 'MMM d')}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Recent Entries */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
              {t('dash_recent_entries')}
            </p>
          </div>

          {!recentEntries?.length ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-zinc-600">{t('dash_no_entries')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {recentEntries.map(e => {
                const client = e.clients as unknown as { first_name: string; last_name: string; id: string } | null
                const initials = client ? `${client.first_name[0]}${client.last_name[0]}` : '?'
                return (
                  <li key={e.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-zinc-100/70 transition-colors">
                    <div className="h-7 w-7 rounded-full bg-zinc-100 flex items-center justify-center text-[11px] font-semibold text-zinc-500 shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        {client && (
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-[13px] font-medium text-zinc-800 hover:text-zinc-950 hover:underline underline-offset-2"
                          >
                            {client.first_name} {client.last_name}
                          </Link>
                        )}
                        <span className="text-[12px] text-zinc-600">{format(new Date(e.date), 'MMM d')}</span>
                      </div>
                      <p className="text-[12px] text-zinc-600 mt-0.5">{e.service_type}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Upcoming Appointments */}
      {(upcomingAppointments?.length ?? 0) > 0 && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
              {t('dash_upcoming_appts')}
            </p>
            <Link
              href="/appointments/new"
              className="text-[12px] font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              {t('dash_schedule')}
            </Link>
          </div>
          <ul className="divide-y divide-zinc-50">
            {upcomingAppointments!.map(a => {
              const client = a.clients as unknown as { first_name: string; last_name: string; id: string } | null
              return (
                <li key={a.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-zinc-100/70 transition-colors">
                  <time dateTime={a.scheduled_at} className="text-center w-10 shrink-0">
                    <span className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                      {format(new Date(a.scheduled_at), 'MMM')}
                    </span>
                    <span className="block text-[18px] font-semibold text-zinc-900 leading-tight">
                      {format(new Date(a.scheduled_at), 'd')}
                    </span>
                  </time>
                  <div className="flex-1 min-w-0">
                    {client && (
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-[13px] font-medium text-zinc-800 hover:text-zinc-950 hover:underline underline-offset-2"
                      >
                        {client.first_name} {client.last_name}
                      </Link>
                    )}
                    <p className="text-[12px] text-zinc-600 mt-0.5">
                      {format(new Date(a.scheduled_at), 'h:mm a')}
                      {a.service_type && ` · ${a.service_type}`}
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                    {t('dash_scheduled')}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </main>
  )
}
