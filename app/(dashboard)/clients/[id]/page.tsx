'use client'

import { useEffect, useState, use, useRef } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  ArrowLeft, CalendarDays, Phone, Mail,
  ClipboardList, AlertCircle, CheckCircle2, Clock,
  Sparkles, Loader2, Plus, Download, Send, ShieldCheck, RefreshCw
} from 'lucide-react'
import { TextToSpeech } from '@/components/voice/TextToSpeech'
import ReactMarkdown from 'react-markdown'
import { useLanguage } from '@/components/LanguageProvider'
import { DocumentsSection } from '@/components/clients/DocumentsSection'

interface ServiceEntry {
  id: string
  service_type: string
  date: string
  notes: string | null
  ai_structured_notes: Record<string, unknown> | null
  created_at: string
  users: { full_name: string } | null
}

interface FollowUp {
  id: string
  description: string
  due_date: string | null
  urgency: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'done' | 'dismissed'
  category: string | null
}

interface Client {
  id: string
  client_number: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  phone: string | null
  email: string | null
  language_preference: string
  demographics: Record<string, string | number>
  is_active: boolean
  created_at: string
  portal_user_id: string | null
  service_entries: ServiceEntry[]
  follow_ups: FollowUp[]
}

const urgencyDot: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-400',
  medium:   'bg-amber-400',
  low:      'bg-zinc-400',
}
const urgencyLabel: Record<string, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
}

export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { lang, t } = useLanguage()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState<string | null>(null)
  const [summaryIsStale, setSummaryIsStale] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryFetching, setSummaryFetching] = useState(true)
  const [highlightedEntry, setHighlightedEntry] = useState<string | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sent' | 'error' | 'already'>('idle')
  const [inviteErrorMsg, setInviteErrorMsg] = useState<string | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  // key: entry.id → Spanish translated text
  const [translatedNotes, setTranslatedNotes] = useState<Record<string, string>>({})
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set())
  const [noteLang, setNoteLang] = useState<Record<string, 'en' | 'es'>>({})

  // After client loads, pre-populate any already-cached translations (no Gemini call)
  useEffect(() => {
    if (!client) return
    const notesWithText = client.service_entries.filter(e => e.notes?.trim())
    if (!notesWithText.length) return

    fetch('/api/ai/translate/cached', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: notesWithText.map(e => e.notes!) }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.translations) return
        const byId: Record<string, string> = {}
        for (const entry of notesWithText) {
          const hit = data.translations[entry.notes!]
          if (hit) byId[entry.id] = hit
        }
        if (Object.keys(byId).length) setTranslatedNotes(byId)
      })
      .catch(() => {})
  }, [client])

  // Auto-apply global language to all notes — no manual toggling needed
  useEffect(() => {
    if (!client) return
    const notesEntries = client.service_entries.filter(e => e.notes?.trim())
    if (lang === 'es') {
      // Mark all notes as ES immediately (cached ones show instantly)
      setNoteLang(prev => {
        const next = { ...prev }
        for (const e of notesEntries) next[e.id] = 'es'
        return next
      })
      // Translate any not yet cached
      notesEntries.forEach(entry => {
        if (entry.notes) translateEntry(entry.id, entry.notes)
      })
    } else {
      // Reset all to EN
      setNoteLang({})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, client])

  async function translateEntry(entryId: string, originalText: string) {
    if (translatedNotes[entryId]) return // already cached
    setTranslatingIds(prev => new Set(prev).add(entryId))
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalText, target_language: 'Spanish' }),
      })
      const data = await res.json()
      if (data.translated) {
        setTranslatedNotes(prev => ({ ...prev, [entryId]: data.translated }))
      }
    } catch { /* keep original on error */ }
    finally {
      setTranslatingIds(prev => { const s = new Set(prev); s.delete(entryId); return s })
    }
  }

  async function toggleTranslate(entryId: string, originalText: string, toLang: 'en' | 'es') {
    setNoteLang(prev => ({ ...prev, [entryId]: toLang }))
    if (toLang === 'es') await translateEntry(entryId, originalText)
  }

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setClient(data)
        setLoading(false)
      })
    // Auto-load stored summary (no-op if none saved yet)
    fetch(`/api/ai/client-summary?client_id=${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.summary && data.summary !== 'No service history available yet.') {
          setSummary(data.summary)
          setSummaryGeneratedAt(data.generated_at ?? null)
          setSummaryIsStale(data.is_stale ?? false)
        }
      })
      .catch(() => {})
      .finally(() => setSummaryFetching(false))
  }, [id])

  // After data loads, scroll to & highlight the entry from search
  useEffect(() => {
    if (loading || !client) return
    const entryId = window.location.hash.slice(1)
    if (!entryId) return
    const el = document.getElementById(entryId)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedEntry(entryId)
    highlightTimerRef.current = setTimeout(() => setHighlightedEntry(null), 3000)
    return () => { if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, client])

  async function loadSummary(force = false) {
    setSummaryLoading(true)
    try {
      const url = `/api/ai/client-summary?client_id=${id}${force ? '&force=true' : ''}`
      const data = await (await fetch(url)).json()
      setSummary(data.summary ?? null)
      setSummaryGeneratedAt(data.generated_at ?? null)
      setSummaryIsStale(data.is_stale ?? false)
    } catch {
      setSummary('Failed to generate summary.')
    } finally {
      setSummaryLoading(false)
    }
  }

  async function exportSummaryPdf() {
    if (!summaryRef.current || !client) return
    setPdfExporting(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ])
      const el = summaryRef.current
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: el.scrollWidth,
        onclone: (_doc: Document) => {
          const style = _doc.createElement('style')
          style.textContent = '* { font-family: Arial, Helvetica, sans-serif !important; letter-spacing: 0 !important; word-spacing: 0.1em !important; font-variant-ligatures: none !important; }'
          _doc.head.appendChild(style)
        },
      })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 14
      const contentW = pageW - margin * 2
      const imgH = (canvas.height * contentW) / canvas.width
      let remaining = imgH
      let srcOffset = 0

      while (remaining > 0) {
        const sliceH = Math.min(remaining, pageH - margin * 2)
        const srcH = sliceH * (canvas.height / imgH)
        const slice = document.createElement('canvas')
        slice.width = canvas.width
        slice.height = srcH
        slice.getContext('2d')!.drawImage(canvas, 0, srcOffset * (canvas.height / imgH), canvas.width, srcH, 0, 0, canvas.width, srcH)
        pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, margin, contentW, sliceH)
        remaining -= sliceH
        srcOffset += sliceH
        if (remaining > 0) { pdf.addPage(); }
      }

      const name = `${client.first_name}-${client.last_name}`.toLowerCase().replace(/\s+/g, '-')
      pdf.save(`handoff-${name}-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('PDF export failed', err)
    } finally {
      setPdfExporting(false)
    }
  }

  async function markDone(followUpId: string) {
    setUpdating(followUpId)
    await fetch(`/api/follow-ups/${followUpId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    setClient(c => c ? {
      ...c,
      follow_ups: c.follow_ups.map(f =>
        f.id === followUpId ? { ...f, status: 'done' as const } : f
      )
    } : c)
    setUpdating(null)
  }

  async function sendPortalInvite() {
    setInviting(true)
    try {
      const res = await fetch(`/api/clients/${id}/invite`, { method: 'POST' })
      const data = await res.json()
      if (res.status === 409) { setInviteStatus('already'); setInviteErrorMsg(data.error); return }
      if (!res.ok) { setInviteStatus('error'); setInviteErrorMsg(data.error ?? 'Failed to send invite.'); return }
      setInviteStatus('sent')
      // Refresh client to show portal active state
      fetch(`/api/clients/${id}`).then(r => r.ok ? r.json() : null).then(data => { if (data) setClient(data) })
    } catch {
      setInviteStatus('error')
    } finally {
      setInviting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto" aria-busy="true">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-zinc-200 rounded w-24" />
          <div className="h-28 bg-zinc-200 rounded-xl" />
          <div className="h-36 bg-zinc-200 rounded-xl" />
          <div className="h-64 bg-zinc-200 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="p-8">
        <p role="alert" className="text-[13px] text-red-500">Client not found.</p>
        <Link href="/clients" className="text-[13px] text-zinc-500 hover:text-zinc-900 underline underline-offset-2 mt-3 inline-block">
          Back to Clients
        </Link>
      </div>
    )
  }

  const pendingFollowUps = client.follow_ups.filter(f => f.status === 'pending')
  const sortedEntries = [...client.service_entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase()
  const isEs = client.language_preference === 'es'

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5 animate-fade-up">

      {/* Back */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-[13px] text-zinc-600 hover:text-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {t('profile_back')}
      </Link>

      {/* Client header card */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center text-[15px] font-semibold text-zinc-600 shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[18px] font-semibold text-zinc-900 tracking-tight">
                  {client.first_name} {client.last_name}
                </h1>
                <span className="font-mono text-[11px] text-zinc-600">{client.client_number}</span>
                <span className={cn(
                  'text-[11px] font-medium px-2 py-0.5 rounded-full',
                  isEs ? 'bg-violet-50 text-violet-600' : 'bg-zinc-100 text-zinc-500'
                )}>
                  {isEs ? 'Español' : 'English'}
                </span>
                <span className={cn(
                  'text-[11px] font-medium px-2 py-0.5 rounded-full',
                  client.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-600'
                )}>
                  {client.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <dl className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-[13px] text-zinc-600">
                {client.date_of_birth && (
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    <dt className="sr-only">Date of birth</dt>
                    <dd>{format(new Date(client.date_of_birth), 'MMM d, yyyy')}</dd>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    <dt className="sr-only">Phone</dt>
                    <dd>{client.phone}</dd>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    <dt className="sr-only">Email</dt>
                    <dd>{client.email}</dd>
                  </div>
                )}
              </dl>

              {Object.keys(client.demographics).length > 0 && (
                <dl className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[13px]">
                  {Object.entries(client.demographics).map(([key, val]) => (
                    <div key={key}>
                      <dt className="inline text-zinc-600 capitalize">{key.replace(/_/g, ' ')}: </dt>
                      <dd className="inline text-zinc-600 font-medium">{String(val)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Link
              href={`/clients/${client.id}/service/new`}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Log Service
            </Link>

            {/* Portal invite — only show if client has an email */}
            {client.email && (
              client.portal_user_id || inviteStatus === 'sent' ? (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Portal Active
                </span>
              ) : (
                <button
                  onClick={sendPortalInvite}
                  disabled={inviting || inviteStatus === 'already'}
                  title={`Send portal invite to ${client.email}`}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 transition-colors"
                >
                  {inviting
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
                  {inviting ? 'Sending…' : inviteStatus === 'error' ? 'Retry Invite' : 'Invite to Portal'}
                </button>
              )
            )}

            {inviteStatus === 'sent' && (
              <p className="text-[11px] text-emerald-600">Invite sent to {client.email}</p>
            )}
            {(inviteStatus === 'error' || inviteStatus === 'already') && inviteErrorMsg && (
              <p className="text-[11px] text-red-500">{inviteErrorMsg}</p>
            )}
            {!client.email && (
              <p className="text-[11px] text-zinc-400">Add email to enable portal invite</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Handoff Summary */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
              AI Handoff Summary
            </p>
            {summaryGeneratedAt && (
              <span className={cn(
                'text-[11px] px-1.5 py-0.5 rounded-md font-medium',
                summaryIsStale
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-zinc-100 text-zinc-500'
              )}>
                {summaryIsStale ? 'Outdated · ' : ''}
                {(() => {
                  const days = Math.floor((Date.now() - new Date(summaryGeneratedAt).getTime()) / 86_400_000)
                  return days === 0 ? 'Generated today' : days === 1 ? 'Generated 1 day ago' : `Generated ${days} days ago`
                })()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {summaryFetching ? (
              <div className="flex items-center gap-2 animate-pulse" aria-hidden="true">
                <div className="h-6 w-16 bg-zinc-200 rounded-md" />
                <div className="h-6 w-24 bg-zinc-200 rounded-lg" />
              </div>
            ) : summary ? (
              <>
                <TextToSpeech text={summary} label={t('profile_read_aloud')} />
                <button
                  onClick={exportSummaryPdf}
                  disabled={pdfExporting}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-500 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {pdfExporting
                    ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    : <Download className="h-3 w-3" aria-hidden="true" />}
                  {pdfExporting ? t('profile_exporting') : t('profile_download_pdf')}
                </button>
                <button
                  onClick={() => loadSummary(true)}
                  disabled={summaryLoading}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                    summaryIsStale
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  )}
                >
                  {summaryLoading
                    ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    : <RefreshCw className="h-3 w-3" aria-hidden="true" />}
                  {t('profile_regenerate')}
                </button>
              </>
            ) : (
              <button
                onClick={() => loadSummary(false)}
                disabled={summaryLoading}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {summaryLoading
                  ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  : <Sparkles className="h-3 w-3" aria-hidden="true" />}
                {t('profile_generate')}
              </button>
            )}
          </div>
        </div>
        <div className="px-5 py-4">
          {summaryFetching ? (
            <div className="bg-white p-2 space-y-3 animate-pulse" aria-hidden="true">
              <div className="h-2.5 w-48 bg-zinc-200 rounded-full" />
              <div className="h-3.5 w-32 bg-zinc-200 rounded-full mt-4" />
              <div className="space-y-2 mt-1">
                <div className="h-2.5 bg-zinc-100 rounded-full w-full" />
                <div className="h-2.5 bg-zinc-100 rounded-full w-[92%]" />
                <div className="h-2.5 bg-zinc-100 rounded-full w-[85%]" />
              </div>
              <div className="h-3.5 w-36 bg-zinc-200 rounded-full mt-3" />
              <div className="space-y-2 mt-1">
                <div className="h-2.5 bg-zinc-100 rounded-full w-full" />
                <div className="h-2.5 bg-zinc-100 rounded-full w-[88%]" />
                <div className="h-2.5 bg-zinc-100 rounded-full w-[76%]" />
                <div className="h-2.5 bg-zinc-100 rounded-full w-[80%]" />
              </div>
              <div className="h-3.5 w-28 bg-zinc-200 rounded-full mt-3" />
              <div className="space-y-2 mt-1">
                <div className="h-2.5 bg-zinc-100 rounded-full w-[95%]" />
                <div className="h-2.5 bg-zinc-100 rounded-full w-[70%]" />
              </div>
            </div>
          ) : summary ? (
            <div
              ref={summaryRef}
              className="prose prose-sm max-w-none prose-headings:text-zinc-800 prose-headings:font-semibold prose-p:text-zinc-600 prose-li:text-zinc-600 prose-strong:text-zinc-800 bg-white p-2"
            >
              <p className="text-[11px] text-zinc-600 not-prose mb-4 font-medium">
                CLIENT HANDOFF SUMMARY · {client.first_name} {client.last_name} · {summaryGeneratedAt ? new Date(summaryGeneratedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-[13px] text-zinc-600">
              Generate an AI-powered case handoff summary with service history and recommended next steps.
            </p>
          )}
        </div>
      </div>

      {/* Documents */}
      <DocumentsSection clientId={client.id} />

      {/* Pending follow-ups */}
      {pendingFollowUps.length > 0 && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2 border-b border-zinc-100">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
              Pending Follow-ups
            </p>
            <span className="text-[11px] font-semibold text-zinc-600 ml-auto">{pendingFollowUps.length}</span>
          </div>
          <ul className="divide-y divide-zinc-50">
            {pendingFollowUps.map(f => (
              <li key={f.id} className="group px-5 py-3.5 flex items-start gap-3 hover:bg-zinc-100/70 transition-colors">
                <span
                  className={cn('mt-[7px] h-1.5 w-1.5 rounded-full shrink-0', urgencyDot[f.urgency] ?? 'bg-zinc-400')}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-[11px] text-zinc-600 uppercase tracking-wide">{urgencyLabel[f.urgency]}</span>
                    {f.category && <span className="text-[11px] text-zinc-600">{f.category}</span>}
                  </div>
                  <p className="text-[13px] text-zinc-700">{f.description}</p>
                  {f.due_date && (
                    <p className="text-[12px] text-zinc-600 flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {format(new Date(f.due_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => markDone(f.id)}
                  disabled={updating === f.id}
                  aria-label={`Mark done: ${f.description}`}
                  className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[12px] font-medium text-zinc-400 hover:text-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 mt-0.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('profile_mark_done')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Service history */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-2 border-b border-zinc-100">
          <ClipboardList className="h-3.5 w-3.5 text-indigo-500" aria-hidden="true" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
            Service History
          </p>
          <span className="text-[11px] text-zinc-600 ml-auto">{sortedEntries.length} entries</span>
        </div>

        {sortedEntries.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-zinc-600">
              No services logged.{' '}
              <Link href={`/clients/${client.id}/service/new`} className="text-zinc-600 hover:text-zinc-900 underline underline-offset-2">
                Log the first one.
              </Link>
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-zinc-200" aria-label="Service history">
            {sortedEntries.map(entry => (
              <li
                key={entry.id}
                id={entry.id}
                className={cn(
                  'px-5 py-4 transition-colors duration-700',
                  highlightedEntry === entry.id ? 'bg-amber-50 ring-2 ring-inset ring-amber-300' : ''
                )}
              >
                <div className="flex items-baseline gap-3 mb-1.5">
                  <span className="text-[12px] font-medium bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                    {entry.service_type}
                  </span>
                  <time dateTime={entry.date} className="text-[12px] text-zinc-600">
                    {format(new Date(entry.date), 'MMM d, yyyy')}
                  </time>
                  {entry.users?.full_name && (
                    <span className="text-[12px] text-zinc-600">· {entry.users.full_name}</span>
                  )}
                </div>

                {entry.notes && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] text-zinc-600 leading-relaxed whitespace-pre-wrap flex-1">
                        {noteLang[entry.id] === 'es' && translatedNotes[entry.id]
                          ? translatedNotes[entry.id]
                          : entry.notes}
                        {translatingIds.has(entry.id) && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-zinc-600">
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                            {t('profile_translating')}
                          </span>
                        )}
                      </p>
                      <div
                        role="group"
                        aria-label="Note language"
                        className="flex items-center shrink-0 rounded-full border border-zinc-200 bg-zinc-100 p-0.5 text-[11px] font-medium self-start mt-0.5"
                      >
                        <button
                          onClick={() => toggleTranslate(entry.id, entry.notes!, 'en')}
                          aria-pressed={!noteLang[entry.id] || noteLang[entry.id] === 'en'}
                          className={cn(
                            'px-2 py-0.5 rounded-full transition-colors',
                            (!noteLang[entry.id] || noteLang[entry.id] === 'en')
                              ? 'bg-white text-zinc-800 shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-600'
                          )}
                        >EN</button>
                        <button
                          onClick={() => toggleTranslate(entry.id, entry.notes!, 'es')}
                          aria-pressed={noteLang[entry.id] === 'es'}
                          disabled={translatingIds.has(entry.id)}
                          className={cn(
                            'px-2 py-0.5 rounded-full transition-colors disabled:cursor-not-allowed',
                            noteLang[entry.id] === 'es'
                              ? 'bg-white text-zinc-800 shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-600'
                          )}
                        >ES</button>
                      </div>
                    </div>
                    {noteLang[entry.id] === 'es' && translatedNotes[entry.id] && (
                      <p className="text-[11px] text-zinc-600 italic">{t('profile_translate_caption')}</p>
                    )}
                  </div>
                )}

                {entry.ai_structured_notes && (
                  <div className="mt-2.5 p-3 rounded-lg bg-zinc-50 border border-zinc-100 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-zinc-400" aria-hidden="true" />
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">{t('profile_ai_notes')}</span>
                    </div>
                    {!!entry.ai_structured_notes.summary && (
                      <p className="text-[13px] text-zinc-700">
                        {String(entry.ai_structured_notes.summary)}
                      </p>
                    )}
                    {Array.isArray(entry.ai_structured_notes.action_items) &&
                      entry.ai_structured_notes.action_items.length > 0 && (
                      <ul className="list-disc list-inside text-[12px] text-zinc-500 space-y-0.5">
                        {(entry.ai_structured_notes.action_items as string[]).map((item, i) => (
                          <li key={i}>{String(item)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
