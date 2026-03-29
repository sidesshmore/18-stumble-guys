'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useReduceMotion } from '@/lib/hooks/useReduceMotion'
import { Loader2, FileText, Sparkles, Printer, BarChart3, Users, Layers, PenLine } from 'lucide-react'
import { LiveRegion } from '@/components/a11y/LiveRegion'
import { TextToSpeech } from '@/components/voice/TextToSpeech'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Legend,
} from 'recharts'

/** Completely static SVG donut — no Recharts animation code at all. */
function StaticDonut({
  data, dataKey, nameKey, colors, innerRadius, outerRadius, width, height, cy: cyProp,
}: {
  data: Record<string, unknown>[]
  dataKey: string; nameKey: string; colors: string[]
  innerRadius: number; outerRadius: number; width: number; height: number; cy?: number
}) {
  const total = data.reduce((s, d) => s + (d[dataKey] as number), 0)
  if (!total) return <div className="flex items-center justify-center h-full text-[13px] text-zinc-500">No data</div>
  const cx = width / 2
  const cy = cyProp ?? height * 0.44
  let a = -Math.PI / 2
  const slices = data.map((d, i) => {
    const sweep = ((d[dataKey] as number) / total) * 2 * Math.PI
    const a1 = a, a2 = a + sweep
    a = a2
    const large = sweep > Math.PI ? 1 : 0
    const path = [
      `M${cx + outerRadius * Math.cos(a1)},${cy + outerRadius * Math.sin(a1)}`,
      `A${outerRadius},${outerRadius},0,${large},1,${cx + outerRadius * Math.cos(a2)},${cy + outerRadius * Math.sin(a2)}`,
      `L${cx + innerRadius * Math.cos(a2)},${cy + innerRadius * Math.sin(a2)}`,
      `A${innerRadius},${innerRadius},0,${large},0,${cx + innerRadius * Math.cos(a1)},${cy + innerRadius * Math.sin(a1)}`,
      'Z',
    ].join(' ')
    return { path, fill: colors[i % colors.length], name: String(d[nameKey]) }
  })
  return (
    <div style={{ width }}>
      <svg width={width} height={cy + outerRadius + 4} viewBox={`0 0 ${width} ${cy + outerRadius + 4}`}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.fill} stroke="#fff" strokeWidth={2} />)}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-3">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span className="inline-block w-2 h-2 rounded-sm shrink-0" style={{ background: s.fill }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  )
}

interface ServiceStat  { service_type: string; count: number }
interface MonthStat    { month: string; sessions: number }
interface LangStat     { language: string; count: number }
interface FollowupStat { urgency: string; pending: number; completed: number; total: number }
interface RiskStat     { level: string; count: number; fill: string }
interface EngageStat   { sessions: string; clients: number }

type TemplateId = 'quarterly' | 'annual' | 'demographics' | 'services' | 'custom'

interface Template {
  id: TemplateId
  label: string
  description: string
  icon: React.ElementType
  defaultPeriod: () => string
}

const TEMPLATES: Template[] = [
  {
    id: 'quarterly',
    label: 'Quarterly Impact',
    description: 'Sessions, outcomes, and client stories for one quarter',
    icon: BarChart3,
    defaultPeriod: () => {
      const q = Math.ceil((new Date().getMonth() + 1) / 3)
      return `Q${q} ${new Date().getFullYear()} Impact Report`
    },
  },
  {
    id: 'annual',
    label: 'Annual Report',
    description: 'Full-year overview — all metrics, outcomes, and year ahead',
    icon: FileText,
    defaultPeriod: () => `FY${new Date().getFullYear()} Annual Report`,
  },
  {
    id: 'demographics',
    label: 'Demographics Focus',
    description: 'Who we serve — language access, equity, population breakdown',
    icon: Users,
    defaultPeriod: () => `${new Date().getFullYear()} Population Served Report`,
  },
  {
    id: 'services',
    label: 'Services by Type',
    description: 'Service-by-service breakdown with counts and outcomes',
    icon: Layers,
    defaultPeriod: () => `${new Date().getFullYear()} Services Delivered Report`,
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Write your own period and report focus',
    icon: PenLine,
    defaultPeriod: () => `${new Date().getFullYear()} Report`,
  },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-700 text-white text-[12px] rounded-lg px-3 py-2 shadow-xl">
      <p className="font-medium mb-0.5">{label}</p>
      <p className="text-zinc-300">{payload[0].value} sessions</p>
    </div>
  )
}

const LANG_COLORS   = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#0ea5e9']
const RISK_COLORS: Record<string, string> = { low: '#10b981', medium: '#f59e0b', high: '#f43f5e', critical: '#dc2626' }

export default function ReportsPage() {
  const reduceMotion = useReduceMotion()
  const [serviceStats, setServiceStats]   = useState<ServiceStat[]>([])
  const [monthStats, setMonthStats]       = useState<MonthStat[]>([])
  const [langStats, setLangStats]         = useState<LangStat[]>([])
  const [followupStats, setFollowupStats] = useState<FollowupStat[]>([])
  const [riskStats, setRiskStats]         = useState<RiskStat[]>([])
  const [engageStats, setEngageStats]     = useState<EngageStat[]>([])
  const [loading, setLoading]             = useState(true)
  const [template, setTemplate]           = useState<TemplateId>('quarterly')
  const [period, setPeriod]               = useState(TEMPLATES[0].defaultPeriod())
  const [report, setReport]               = useState<string | null>(null)
  const [generating, setGenerating]       = useState(false)
  const [exporting, setExporting]         = useState(false)
  const [statusMsg, setStatusMsg]         = useState('')
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/reports/service-stats').then(r => r.ok ? r.json() : { data: [] }),
      fetch('/api/reports/month-stats').then(r => r.ok ? r.json() : { data: [] }),
      fetch('/api/reports/language-stats').then(r => r.ok ? r.json() : { data: [] }),
      fetch('/api/reports/followup-stats').then(r => r.ok ? r.json() : { data: [] }),
      fetch('/api/reports/risk-stats').then(r => r.ok ? r.json() : { data: [] }),
      fetch('/api/reports/engagement-stats').then(r => r.ok ? r.json() : { data: [] }),
    ]).then(([s, m, l, f, r, e]) => {
      setServiceStats(s.data ?? [])
      setMonthStats(m.data ?? [])
      setLangStats(l.data ?? [])
      setFollowupStats(f.data ?? [])
      setRiskStats(r.data ?? [])
      setEngageStats(e.data ?? [])
      setLoading(false)
    })
  }, [])

  // KPI computations
  const totalClients   = langStats.reduce((s, l) => s + l.count, 0)
  const totalSessions  = serviceStats.reduce((s, l) => s + l.count, 0)
  const avgSessions    = totalClients > 0 ? (totalSessions / totalClients).toFixed(1) : '—'
  const openFollowups  = followupStats.reduce((s, f) => s + f.pending, 0)

  function selectTemplate(t: Template) {
    setTemplate(t.id)
    setPeriod(t.defaultPeriod())
    setReport(null)
  }

  async function generateReport() {
    setGenerating(true)
    setStatusMsg('Generating report…')
    try {
      const res = await fetch('/api/ai/funder-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, template }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setReport(data.report)
      setStatusMsg('Report ready')
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const exportPdf = useCallback(async () => {
    if (!reportRef.current) return
    setExporting(true)
    setStatusMsg('Preparing PDF…')
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ])

      const el = reportRef.current
      // Temporarily expand the scrollable container so html2canvas captures full height
      const prevMaxH = el.style.maxHeight
      const prevOverflow = el.style.overflow
      el.style.maxHeight = 'none'
      el.style.overflow = 'visible'

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: el.scrollWidth,
        onclone: (_doc: Document) => {
          const style = _doc.createElement('style')
          // Force system font + reset spacing so html2canvas doesn't merge words
          style.textContent = `
            #report-print-area, #report-print-area * {
              font-family: Arial, Helvetica, sans-serif !important;
              letter-spacing: 0 !important;
              word-spacing: 0.1em !important;
              font-variant-ligatures: none !important;
              text-rendering: optimizeLegibility;
            }
          `
          _doc.head.appendChild(style)
        },
      })

      el.style.maxHeight = prevMaxH
      el.style.overflow = prevOverflow

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 12 // mm
      const contentW = pageW - margin * 2
      const imgH = (canvas.height * contentW) / canvas.width
      let y = margin
      let remainingH = imgH

      // Slice image across multiple pages
      while (remainingH > 0) {
        const sliceH = Math.min(remainingH, pageH - margin * 2)
        const srcY = (imgH - remainingH) * (canvas.height / imgH)
        const srcH = sliceH * (canvas.height / imgH)

        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = srcH
        const ctx = sliceCanvas.getContext('2d')!
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, y, contentW, sliceH)
        remainingH -= sliceH

        if (remainingH > 0) {
          pdf.addPage()
          y = margin
        }
      }

      const filename = `${period.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`
      pdf.save(filename)
      setStatusMsg('PDF downloaded')
    } catch (err) {
      console.error(err)
      setStatusMsg('PDF export failed')
    } finally {
      setExporting(false)
    }
  }, [period, reportRef])

  return (
    <main id="main-content" className="p-4 md:p-8 max-w-5xl mx-auto space-y-5 animate-fade-up">
      <LiveRegion message={statusMsg} />

      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold text-zinc-900 tracking-tight">Reports</h1>
        <p className="text-[13px] text-zinc-600 mt-0.5">Analytics and AI-generated funder reports</p>
      </div>

      {/* KPI Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Clients',         value: totalClients,  accent: 'bg-indigo-50 border-indigo-100',  dot: 'bg-indigo-500' },
            { label: 'Total Sessions',        value: totalSessions, accent: 'bg-violet-50 border-violet-100',  dot: 'bg-violet-500' },
            { label: 'Avg Sessions / Client', value: avgSessions,   accent: 'bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500' },
            { label: 'Open Follow-ups',       value: openFollowups, accent: 'bg-amber-50 border-amber-100',    dot: 'bg-amber-500' },
          ].map(card => (
            <div key={card.label} className={`border rounded-xl p-4 ${card.accent}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`h-2 w-2 rounded-full ${card.dot}`} aria-hidden="true" />
              </div>
              <p className="text-[28px] font-semibold text-zinc-900 leading-none">{card.value}</p>
              <p className="text-[12px] text-zinc-600 mt-1.5">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Analytics charts */}
      {loading ? (
        <div className="flex items-center gap-2 text-[13px] text-zinc-600 py-8" role="status" aria-live="polite" aria-busy="true">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Loading data…
        </div>
      ) : (
        <div className="space-y-5">
          {/* Chart 1 — Monthly Sessions Trend (full width) */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Sessions Over Time</p>
            </div>
            <div className="p-5">
              {monthStats.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-[13px] text-zinc-600">No data yet</div>
              ) : (
                <>
                  <div role="img" aria-label={`Sessions over time: ${monthStats.map(m => `${m.month} ${m.sessions} sessions`).join(', ')}`}>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={monthStats} margin={{ top: 5, right: 0, bottom: 5, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area isAnimationActive={!reduceMotion} type="monotone" dataKey="sessions" fill="#6366f1" stroke="#4f46e5" fillOpacity={0.15} strokeWidth={2} dot={{ fill: '#4f46e5', r: 3 }} activeDot={{ r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <table className="sr-only">
                    <caption>Sessions over time</caption>
                    <thead><tr><th scope="col">Month</th><th scope="col">Sessions</th></tr></thead>
                    <tbody>{monthStats.map(m => <tr key={m.month}><td>{m.month}</td><td>{m.sessions}</td></tr>)}</tbody>
                  </table>
                </>
              )}
            </div>
          </div>

          {/* Charts 2–6 in 2-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Chart 2 — Services by Type (horizontal BarChart) */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Services Delivered</p>
              </div>
              <div className="p-5">
                {serviceStats.length === 0 ? (
                  <div className="flex items-center justify-center h-[220px] text-[13px] text-zinc-600">No data yet</div>
                ) : (
                  <>
                    <div role="img" aria-label={`Services delivered: ${serviceStats.map(s => `${s.service_type} ${s.count}`).join(', ')}`}>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={serviceStats} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="service_type" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} width={90} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar isAnimationActive={!reduceMotion} dataKey="count" fill="#6366f1" radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <table className="sr-only">
                      <caption>Services delivered by type</caption>
                      <thead><tr><th scope="col">Service type</th><th scope="col">Count</th></tr></thead>
                      <tbody>{serviceStats.map(s => <tr key={s.service_type}><td>{s.service_type}</td><td>{s.count}</td></tr>)}</tbody>
                    </table>
                  </>
                )}
              </div>
            </div>

            {/* Chart 3 — Language Distribution (Donut PieChart) */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Client Languages</p>
              </div>
              <div className="p-5">
                {langStats.length === 0 ? (
                  <div className="flex items-center justify-center h-[220px] text-[13px] text-zinc-600">No data yet</div>
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-4" role="img" aria-label={`Client languages: ${langStats.map(l => `${l.language} ${l.count} clients`).join(', ')}`}>
                      <StaticDonut data={langStats} dataKey="count" nameKey="language"
                        colors={LANG_COLORS} innerRadius={55} outerRadius={90} width={300} height={200} />
                    </div>
                    <table className="sr-only">
                      <caption>Client language distribution</caption>
                      <thead><tr><th scope="col">Language</th><th scope="col">Clients</th></tr></thead>
                      <tbody>{langStats.map(l => <tr key={l.language}><td>{l.language}</td><td>{l.count}</td></tr>)}</tbody>
                    </table>
                  </>
                )}
              </div>
            </div>

            {/* Chart 4 — Follow-up Urgency (Stacked BarChart) */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Follow-up Status by Urgency</p>
              </div>
              <div className="p-5">
                {followupStats.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-[13px] text-zinc-600">No data yet</div>
                ) : (
                  <>
                    <div role="img" aria-label={`Follow-up status by urgency: ${followupStats.map(f => `${f.urgency} — ${f.pending} pending, ${f.completed} completed`).join('; ')}`}>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={followupStats} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                          <XAxis dataKey="urgency" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Bar isAnimationActive={!reduceMotion} dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" radius={[0, 0, 0, 0]} />
                          <Bar isAnimationActive={!reduceMotion} dataKey="completed" stackId="a" fill="#10b981" name="Completed" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <table className="sr-only">
                      <caption>Follow-up status by urgency level</caption>
                      <thead><tr><th scope="col">Urgency</th><th scope="col">Pending</th><th scope="col">Completed</th></tr></thead>
                      <tbody>{followupStats.map(f => <tr key={f.urgency}><td>{f.urgency}</td><td>{f.pending}</td><td>{f.completed}</td></tr>)}</tbody>
                    </table>
                  </>
                )}
              </div>
            </div>

            {/* Chart 5 — Risk Level Distribution (Donut PieChart) */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">AI Risk Assessments</p>
              </div>
              <div className="p-5">
                {riskStats.length === 0 ? (
                  <div className="flex items-center justify-center h-[220px] text-[13px] text-zinc-600">No AI-structured notes yet</div>
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-4" role="img" aria-label={`AI risk assessments: ${riskStats.map(r => `${r.level} risk ${r.count} entries`).join(', ')}`}>
                      <StaticDonut data={riskStats} dataKey="count" nameKey="level" colors={riskStats.map(r => r.fill)} innerRadius={50} outerRadius={80} width={300} height={180} />
                    </div>
                    <table className="sr-only">
                      <caption>AI risk level distribution</caption>
                      <thead><tr><th scope="col">Risk level</th><th scope="col">Entries</th></tr></thead>
                      <tbody>{riskStats.map(r => <tr key={r.level}><td>{r.level}</td><td>{r.count}</td></tr>)}</tbody>
                    </table>
                  </>
                )}
              </div>
            </div>

            {/* Chart 6 — Client Engagement Depth (BarChart) */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden md:col-span-2">
              <div className="px-5 py-4 border-b border-zinc-100">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Engagement Depth</p>
              </div>
              <div className="p-5">
                {engageStats.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-[13px] text-zinc-600">No data yet</div>
                ) : (
                  <>
                    <div role="img" aria-label={`Engagement depth: ${engageStats.map(e => `${e.sessions} sessions — ${e.clients} clients`).join(', ')}`}>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={engageStats} margin={{ top: 0, right: 0, bottom: 20, left: -10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                          <XAxis
                            dataKey="sessions"
                            tick={{ fontSize: 11, fill: '#a1a1aa' }}
                            axisLine={false}
                            tickLine={false}
                            label={{ value: 'Sessions per Client', position: 'insideBottom', offset: -12, fontSize: 11, fill: '#a1a1aa' }}
                          />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(value) => [value, 'clients']} />
                          <Bar isAnimationActive={!reduceMotion} dataKey="clients" fill="#6366f1" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <table className="sr-only">
                      <caption>Client engagement depth</caption>
                      <thead><tr><th scope="col">Sessions per client</th><th scope="col">Number of clients</th></tr></thead>
                      <tbody>{engageStats.map(e => <tr key={e.sessions}><td>{e.sessions}</td><td>{e.clients}</td></tr>)}</tbody>
                    </table>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Funder Report */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">AI Funder Report</p>
        </div>

        <div className="p-5 space-y-5">
          {/* Template selector */}
          <div>
            <p className="text-[12px] font-medium text-zinc-500 mb-3">Choose a template</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {TEMPLATES.map(t => {
                const Icon = t.icon
                const selected = template === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTemplate(t)}
                    className={cn(
                      'flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all',
                      selected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-zinc-200 bg-white hover:border-indigo-200 hover:bg-indigo-50 text-zinc-700'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', selected ? 'text-indigo-200' : 'text-indigo-400')} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className={cn('text-[13px] font-semibold leading-none mb-1', selected ? 'text-white' : 'text-zinc-800')}>
                        {t.label}
                      </p>
                      <p className={cn('text-[11px] leading-snug', selected ? 'text-indigo-200' : 'text-zinc-400')}>
                        {t.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Period input + generate */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label htmlFor="period" className="text-[12px] font-medium text-zinc-500 block">
                Report period / title
              </label>
              <input
                id="period"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                placeholder="e.g. Q1 2026 Impact Report"
                className="w-full h-9 px-3 text-[13px] border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
            <button
              onClick={generateReport}
              disabled={generating || !period.trim()}
              aria-busy={generating}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 h-9 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {generating
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Generating…</>
                : <><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />Generate Report</>
              }
            </button>
          </div>

          {/* Generated report */}
          {report && (
            <div className="space-y-3 animate-fade-in">
              {/* Action bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={exportPdf}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    : <Printer className="h-3.5 w-3.5" aria-hidden="true" />}
                  {exporting ? 'Exporting…' : 'Export PDF'}
                </button>
                <TextToSpeech text={report} label="Read aloud" />
                <span className="text-[11px] text-zinc-400 ml-auto hidden sm:block">
                  Downloads a PDF with charts and full report
                </span>
              </div>

              {/* Report content — also the print target */}
              <div
                id="report-print-area"
                ref={reportRef}
                className="rounded-xl border border-zinc-200 bg-white p-6 md:p-8 text-[13px] leading-relaxed max-h-[700px] overflow-y-auto prose prose-sm max-w-none prose-headings:text-zinc-900 prose-headings:font-semibold prose-p:text-zinc-600 prose-li:text-zinc-600 prose-table:w-full prose-th:bg-zinc-50 prose-th:font-semibold prose-td:border prose-td:border-zinc-200 prose-th:border prose-th:border-zinc-200"
                tabIndex={0}
                role="region"
                aria-label="Generated funder report"
              >
                {/* Template-specific inline charts */}
                {(() => {
                  const chartCard = (title: string, children: React.ReactNode) => (
                    <div className="border border-zinc-100 rounded-lg p-4 bg-zinc-50">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">{title}</p>
                      {children}
                    </div>
                  )

                  const serviceChart = (
                    <BarChart width={300} height={170} data={serviceStats} margin={{ top: 0, right: 0, bottom: 40, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="service_type" angle={-35} textAnchor="end" tick={{ fontSize: 9, fill: '#a1a1aa' }} interval={0} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar isAnimationActive={!reduceMotion} dataKey="count" fill="#3f3f46" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  )

                  const serviceHorizChart = (
                    <BarChart width={300} height={200} data={serviceStats} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="service_type" tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar isAnimationActive={!reduceMotion} dataKey="count" fill="#6366f1" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  )

                  const trendChart = (
                    <LineChart width={300} height={170} data={monthStats} margin={{ top: 5, right: 0, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line isAnimationActive={!reduceMotion} type="monotone" dataKey="sessions" stroke="#3f3f46" strokeWidth={2} dot={{ fill: '#18181b', r: 3 }} activeDot={{ r: 4 }} />
                    </LineChart>
                  )

                  const trendAreaChart = (
                    <AreaChart width={300} height={170} data={monthStats} margin={{ top: 5, right: 0, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area isAnimationActive={!reduceMotion} type="monotone" dataKey="sessions" fill="#3f3f46" stroke="#18181b" fillOpacity={0.15} strokeWidth={2} dot={{ fill: '#18181b', r: 3 }} />
                    </AreaChart>
                  )

                  const followupChart = (
                    <BarChart width={300} height={200} data={followupStats} margin={{ top: 5, right: 0, bottom: 30, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="urgency" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                      <Bar isAnimationActive={!reduceMotion} dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" />
                      <Bar isAnimationActive={!reduceMotion} dataKey="completed" stackId="a" fill="#10b981" name="Completed" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  )

                  const langPieChart = (
                    <StaticDonut data={langStats} dataKey="count" nameKey="language"
                      colors={LANG_COLORS} innerRadius={48} outerRadius={80} width={300} height={250} cy={95} />
                  )

                  const riskPieChart = (
                    <StaticDonut data={riskStats} dataKey="count" nameKey="level" colors={riskStats.map(r => r.fill)} innerRadius={45} outerRadius={80} width={300} height={250} cy={95} />
                  )

                  const engageChart = (
                    <BarChart width={300} height={200} data={engageStats} margin={{ top: 5, right: 0, bottom: 36, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="sessions" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false}
                        label={{ value: 'Sessions / Client', position: 'insideBottom', offset: -20, fontSize: 10, fill: '#a1a1aa' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => [v, 'clients']} />
                      <Bar isAnimationActive={!reduceMotion} dataKey="clients" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  )

                  if (serviceStats.length === 0) return null

                  if (template === 'quarterly') return (
                    <div className="print-charts not-prose mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {chartCard('Services by Type', serviceChart)}
                      {followupStats.length > 0 && chartCard('Follow-up Status by Urgency', followupChart)}
                    </div>
                  )

                  if (template === 'annual') return (
                    <div className="not-prose mb-6 space-y-4">
                      {monthStats.length > 0 && (
                        <div className="border border-zinc-100 rounded-lg p-4 bg-zinc-50">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">Full-Year Sessions Trend</p>
                          <AreaChart width={640} height={180} data={monthStats} margin={{ top: 5, right: 0, bottom: 5, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Area isAnimationActive={!reduceMotion} type="monotone" dataKey="sessions" fill="#3f3f46" stroke="#18181b" fillOpacity={0.15} strokeWidth={2} dot={{ fill: '#18181b', r: 3 }} />
                          </AreaChart>
                        </div>
                      )}
                      <div className="print-charts grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {chartCard('Services Delivered', serviceHorizChart)}
                        {langStats.length > 0 && chartCard('Client Languages', langPieChart)}
                        {followupStats.length > 0 && chartCard('Follow-up by Urgency', followupChart)}
                        {engageStats.length > 0 && chartCard('Engagement Depth', engageChart)}
                      </div>
                    </div>
                  )

                  if (template === 'demographics') return (
                    <div className="not-prose mb-6 space-y-4">
                      {langStats.length > 0 && (
                        <div className="border border-zinc-100 rounded-lg p-4 bg-zinc-50">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">Client Language Distribution</p>
                          <div className="flex items-center justify-center">
                            <StaticDonut data={langStats} dataKey="count" nameKey="language"
                              colors={LANG_COLORS} innerRadius={70} outerRadius={110} width={480} height={220} />
                          </div>
                        </div>
                      )}
                      <div className="print-charts grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {riskStats.length > 0 && chartCard('AI Risk Assessments', riskPieChart)}
                        {engageStats.length > 0 && chartCard('Engagement Depth', engageChart)}
                      </div>
                    </div>
                  )

                  if (template === 'services') return (
                    <div className="not-prose mb-6 space-y-4">
                      <div className="border border-zinc-100 rounded-lg p-4 bg-zinc-50">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">Services Delivered by Type</p>
                        <BarChart width={640} height={200} data={serviceStats} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="service_type" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} width={120} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar isAnimationActive={!reduceMotion} dataKey="count" fill="#6366f1" radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </div>
                      <div className="print-charts grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {engageStats.length > 0 && chartCard('Engagement Depth', engageChart)}
                        {monthStats.length > 0 && chartCard('Monthly Trend', trendChart)}
                      </div>
                    </div>
                  )

                  // custom (default)
                  return (
                    <div className="print-charts not-prose mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {chartCard('Services by Type', serviceChart)}
                      {monthStats.length > 0 && chartCard('Monthly Trend', trendAreaChart)}
                    </div>
                  )
                })()}

                <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                <div className="print-footer" aria-hidden="true">
                  Generated by CaseTrack · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
