'use client'

import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { VoiceRecorder } from '@/components/voice/VoiceRecorder'
import { useLanguage } from '@/components/LanguageProvider'

const FALLBACK_SERVICE_TYPES = [
  'Individual Music Therapy', 'Group Music Therapy', 'Assessment Session',
  'Family Session', 'Crisis Session', 'Discharge Planning',
  'Food Pantry Visit', 'Emergency Food Box', 'Clothing Distribution',
  'Crisis Intake', 'Safety Planning', 'Case Management',
  'Housing Referral', 'Mental Health Referral', 'Follow-up Visit', 'General Services',
]

interface StructuredNotes {
  summary: string
  action_items: string[]
  follow_ups: { description: string; urgency: string; due_date?: string }[]
  risk_level: string
}

export default function NewServiceEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params)
  const router = useRouter()
  const { lang, t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [structured, setStructured] = useState<StructuredNotes | null>(null)
  const [confirmedFollowUps, setConfirmedFollowUps] = useState<Set<number>>(new Set())
  const [analyzing, setAnalyzing] = useState(false)
  const [serviceTypes, setServiceTypes] = useState<string[]>(FALLBACK_SERVICE_TYPES)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.service_types?.length) setServiceTypes(data.service_types)
      })
      .catch(() => {})
  }, [])

  const [form, setForm] = useState({
    service_type: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  })

  function handleTranscript(transcript: string) {
    setForm(f => ({ ...f, notes: transcript }))
  }

  function handleStructured(s: StructuredNotes) {
    setStructured(s)
    // Pre-check all detected follow-ups — human can uncheck before saving
    setConfirmedFollowUps(new Set(s.follow_ups.map((_, i) => i)))
  }

  async function analyzeNotes() {
    if (!form.notes.trim()) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/ai/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dry_run: true,
          client_id: clientId,
          notes: form.notes,
          service_type: form.service_type || 'General Services',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        handleStructured(data.structured)
      }
    } catch { /* non-blocking */ }
    finally { setAnalyzing(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.service_type) { setError('Please select a service type'); return }
    setSaving(true)
    setError(null)

    // If UI is in Spanish, translate notes to English before saving
    // so the AI pipeline, embeddings, and English-speaking staff all see consistent text
    let notesToSave = form.notes
    if (lang === 'es' && form.notes.trim()) {
      try {
        const tr = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: form.notes, target_language: 'English' }),
        })
        const trData = await tr.json()
        if (trData.translated) notesToSave = trData.translated
      } catch { /* use original on failure */ }
    }

    // Only include follow-ups the human explicitly confirmed
    const confirmedFUs = structured?.follow_ups.filter((_, i) => confirmedFollowUps.has(i)) ?? []

    const res = await fetch('/api/service-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        notes: notesToSave,
        client_id: clientId,
        ai_structured_notes: structured ?? undefined,
        confirmed_follow_ups: confirmedFUs,
      }),
    })

    if (res.ok) {
      router.push(`/clients/${clientId}`)
    } else {
      const data = await res.json()
      const err = data.error
      const msg = typeof err === 'string'
        ? err
        : err?.formErrors?.[0]
          ?? Object.values(err?.fieldErrors ?? {}).flat()[0]
          ?? 'Validation failed — check all required fields'
      setError(msg as string)
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/clients/${clientId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" /> {t('service_back')}
        </Link>
        <h1 className="text-2xl font-bold">{t('service_title')}</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visit Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="service_type">
                  {t('service_type')} <span aria-hidden="true">*</span>
                </Label>
                <Select
                  value={form.service_type}
                  onValueChange={v => setForm(f => ({ ...f, service_type: v ?? '' }))}
                >
                  <SelectTrigger id="service_type" aria-required="true">
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date">{t('service_date')} <span aria-hidden="true">*</span></Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                  aria-required="true"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">{t('service_notes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('service_notes_ph')}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="min-h-[160px] resize-y"
                aria-describedby="notes-hint"
              />
              <p id="notes-hint" className="text-xs text-muted-foreground">
                {t('service_notes_hint')}
                {lang === 'es' && <span className="ml-1 text-violet-500">(Se traducirá al inglés antes de guardar)</span>}
              </p>
              {form.notes.trim() && !structured && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={analyzeNotes}
                  disabled={analyzing}
                  className="mt-1 h-7 text-xs gap-1.5"
                >
                  {analyzing
                    ? <><Loader2 className="h-3 w-3 animate-spin" />{lang === 'es' ? 'Analizando…' : 'Analyzing…'}</>
                    : <><Sparkles className="h-3 w-3" />{lang === 'es' ? 'Analizar con IA' : 'Analyze with AI'}</>}
                </Button>
              )}
            </div>

            {/* ElevenLabs Voice Recorder */}
            <VoiceRecorder
              serviceType={form.service_type || 'General Services'}
              onTranscript={handleTranscript}
              onStructured={handleStructured}
            />

            {/* AI structured preview — human reviews before saving */}
            {structured && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2 text-sm" role="region" aria-label="AI structured notes preview">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-blue-900">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {lang === 'es' ? 'Vista Previa de IA — revisa antes de guardar' : 'AI Draft — review before saving'}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setStructured(null); setConfirmedFollowUps(new Set()) }}
                    className="text-[11px] text-blue-500 hover:text-blue-700 underline underline-offset-2"
                  >
                    {lang === 'es' ? 'descartar' : 'discard'}
                  </button>
                </div>
                {structured.summary && (
                  <p className="text-blue-800">{structured.summary}</p>
                )}
                {structured.action_items.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-blue-700 mb-1">{t('service_action_items')}</p>
                    <ul className="list-disc list-inside text-blue-800 space-y-0.5">
                      {structured.action_items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {structured.follow_ups.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-blue-700 mb-2">
                      {lang === 'es'
                        ? `Seguimientos detectados — marca los que quieres guardar:`
                        : `Follow-ups detected — check the ones to save:`}
                    </p>
                    <ul className="space-y-1.5">
                      {structured.follow_ups.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            id={`fu-${i}`}
                            checked={confirmedFollowUps.has(i)}
                            onChange={e => {
                              setConfirmedFollowUps(prev => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(i)
                                else next.delete(i)
                                return next
                              })
                            }}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-blue-300 accent-blue-600 cursor-pointer"
                          />
                          <label htmlFor={`fu-${i}`} className="text-blue-800 text-xs cursor-pointer leading-relaxed">
                            <span className={cn(
                              'inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-1.5',
                              f.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                              f.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                              f.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            )}>
                              {f.urgency}
                            </span>
                            {f.description}
                            {f.due_date && <span className="text-blue-600 ml-1">· due {f.due_date}</span>}
                          </label>
                        </li>
                      ))}
                    </ul>
                    {confirmedFollowUps.size === 0 && (
                      <p className="text-[11px] text-blue-500 italic mt-1">
                        {lang === 'es' ? 'Ningún seguimiento se guardará.' : 'No follow-ups will be saved.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? t('service_saving') : t('service_save')}
              </Button>
              <Link
                href={`/clients/${clientId}`}
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                {t('service_cancel')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
