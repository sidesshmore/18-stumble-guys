'use client'

import { useState, useEffect, useId } from 'react'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plus, X, Check } from 'lucide-react'
import Link from 'next/link'
import { PhotoIntake } from '@/components/clients/PhotoIntake'

interface CustomField {
  key: string
  label: string
  type: 'text' | 'number'
}

type AdHocFieldType = 'text' | 'number' | 'date' | 'boolean'

interface AdHocField {
  id: string
  key: string
  label: string
  type: AdHocFieldType
  value: string
}

const FIELD_TYPES: { value: AdHocFieldType; label: string }[] = [
  { value: 'text',    label: 'Text' },
  { value: 'number',  label: 'Number' },
  { value: 'date',    label: 'Date' },
  { value: 'boolean', label: 'Yes / No' },
]

// Static translations for standard labels
const T = {
  en: {
    back: 'Back to Clients',
    title: 'New Client',
    basicInfo: 'Basic Information',
    firstName: 'First Name',
    lastName: 'Last Name',
    dob: 'Date of Birth',
    phone: 'Phone',
    email: 'Email',
    langPref: 'Preferred Language',
    addlInfo: 'Additional Information',
    register: 'Register Client',
    registering: 'Saving…',
    cancel: 'Cancel',
  },
  es: {
    back: 'Volver a Clientes',
    title: 'Nuevo Cliente',
    basicInfo: 'Información Básica',
    firstName: 'Nombre',
    lastName: 'Apellido',
    dob: 'Fecha de Nacimiento',
    phone: 'Teléfono',
    email: 'Correo Electrónico',
    langPref: 'Idioma Preferido',
    addlInfo: 'Información Adicional',
    register: 'Registrar Cliente',
    registering: 'Guardando…',
    cancel: 'Cancelar',
  },
}

export default function NewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [uiLang, setUiLang] = useState<'en' | 'es'>('en')
  const [translatedLabels, setTranslatedLabels] = useState<Record<string, string>>({})
  const [translating, setTranslating] = useState(false)

  // Ad-hoc fields added just for this client
  const [adHocFields, setAdHocFields] = useState<AdHocField[]>([])
  const [addingField, setAddingField] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<AdHocFieldType>('text')
  const addFieldNameId = useId()

  const t = T[uiLang]

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone: '',
    email: '',
    language_preference: 'en' as 'en' | 'es',
    demographics: {} as Record<string, string>,
  })

  // Load org's custom fields
  useEffect(() => {
    fetch('/api/clients/fields')
      .then(r => r.ok ? r.json() : [])
      .then(setCustomFields)
      .catch(() => setCustomFields([]))
  }, [])

  // Translate custom field labels when switching to Spanish
  async function switchLang(lang: 'en' | 'es') {
    setUiLang(lang)
    // Auto-set language preference to match UI language
    setForm(f => ({ ...f, language_preference: lang }))

    if (lang === 'es' && customFields.length > 0) {
      setTranslating(true)
      try {
        const results = await Promise.all(
          customFields.map(async field => {
            if (translatedLabels[field.key]) return { key: field.key, label: translatedLabels[field.key] }
            const res = await fetch('/api/ai/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: field.label, target_language: 'Spanish' }),
            })
            const data = await res.json()
            return { key: field.key, label: data.translated ?? field.label }
          })
        )
        const map: Record<string, string> = {}
        for (const r of results) map[r.key] = r.label
        setTranslatedLabels(map)
      } catch {
        // silently fall back to English labels
      } finally {
        setTranslating(false)
      }
    }
  }

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function setDemographic(key: string, value: string) {
    setForm(f => ({ ...f, demographics: { ...f.demographics, [key]: value } }))
  }

  function confirmAddField() {
    const label = newFieldName.trim()
    if (!label) return
    const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    if (!key) return
    setAdHocFields(prev => [...prev, { id: crypto.randomUUID(), key, label, type: newFieldType, value: '' }])
    setNewFieldName('')
    setNewFieldType('text')
    setAddingField(false)
  }

  function setAdHocValue(id: string, value: string) {
    setAdHocFields(prev => prev.map(f => f.id === id ? { ...f, value } : f))
  }

  function removeAdHocField(id: string) {
    setAdHocFields(prev => prev.filter(f => f.id !== id))
  }

  function handlePhotoPrefill(data: {
    first_name?: string; last_name?: string; date_of_birth?: string
    phone?: string; email?: string; demographics?: Record<string, string>
  }) {
    setForm(f => ({
      ...f,
      first_name: data.first_name ?? f.first_name,
      last_name: data.last_name ?? f.last_name,
      date_of_birth: data.date_of_birth ?? f.date_of_birth,
      phone: data.phone ?? f.phone,
      email: data.email ?? f.email,
      demographics: { ...f.demographics, ...(data.demographics ?? {}) },
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const demographics = {
      ...form.demographics,
      ...Object.fromEntries(adHocFields.filter(f => f.value !== '').map(f => [f.key, f.value])),
    }

    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, demographics }),
    })

    if (res.ok) {
      const client = await res.json()
      router.push(`/clients/${client.id}`)
    } else {
      const data = await res.json()
      setError(data.error?.formErrors?.[0] ?? data.error ?? 'Failed to save client')
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/clients"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden="true" /> {t.back}
          </Link>
          <h1 className="text-2xl font-bold">{t.title}</h1>
        </div>

        {/* EN / ES Language Toggle */}
        <div
          className="flex items-center rounded-lg border border-zinc-200 overflow-hidden shrink-0 mt-1"
          role="group"
          aria-label="Form language"
        >
          <button
            type="button"
            onClick={() => switchLang('en')}
            className={cn(
              'px-3 py-1.5 text-[13px] font-medium transition-colors',
              uiLang === 'en'
                ? 'bg-zinc-800 text-white'
                : 'bg-white text-zinc-500 hover:bg-zinc-50'
            )}
            aria-pressed={uiLang === 'en'}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => switchLang('es')}
            disabled={translating}
            className={cn(
              'px-3 py-1.5 text-[13px] font-medium transition-colors border-l border-zinc-200',
              uiLang === 'es'
                ? 'bg-zinc-800 text-white'
                : 'bg-white text-zinc-500 hover:bg-zinc-50',
              translating && 'opacity-50 cursor-wait'
            )}
            aria-pressed={uiLang === 'es'}
          >
            ES
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate lang={uiLang}>
        {/* AI Photo-to-Intake */}
        <div className="mb-4">
          <PhotoIntake onPrefill={handlePhotoPrefill} />
        </div>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">{t.basicInfo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">{t.firstName} <span aria-hidden="true">*</span></Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={e => setField('first_name', e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={!!error && !form.first_name ? true : undefined}
                  aria-describedby={error ? 'form-error' : undefined}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">{t.lastName} <span aria-hidden="true">*</span></Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={e => setField('last_name', e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={!!error && !form.last_name ? true : undefined}
                  aria-describedby={error ? 'form-error' : undefined}
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date_of_birth">{t.dob}</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={e => setField('date_of_birth', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">{t.phone}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  autoComplete="tel"
                  placeholder="(602) 555-0100"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  autoComplete="email"
                  placeholder="client@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="language_preference">{t.langPref}</Label>
              <Select
                value={form.language_preference}
                onValueChange={v => setField('language_preference', v ?? 'en')}
              >
                <SelectTrigger id="language_preference">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information — org fields + ad-hoc fields */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">{t.addlInfo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Org-configured fields */}
            {customFields.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`demo_${field.key}`}>
                  {uiLang === 'es' && translatedLabels[field.key]
                    ? translatedLabels[field.key]
                    : field.label}
                </Label>
                <Input
                  id={`demo_${field.key}`}
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={form.demographics[field.key] ?? ''}
                  onChange={e => setDemographic(field.key, e.target.value)}
                />
              </div>
            ))}

            {/* Ad-hoc fields added for this client */}
            {adHocFields.map(field => (
              <div key={field.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`adhoc_${field.id}`}>
                    {field.label}
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      {FIELD_TYPES.find(t => t.value === field.type)?.label}
                    </span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => removeAdHocField(field.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remove ${field.label} field`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {field.type === 'boolean' ? (
                  <div className="flex items-center gap-3">
                    {['Yes', 'No'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAdHocValue(field.id, opt)}
                        className={cn(
                          'px-4 py-1.5 rounded-md border text-sm font-medium transition-colors',
                          field.value === opt
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Input
                    id={`adhoc_${field.id}`}
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    value={field.value}
                    onChange={e => setAdHocValue(field.id, e.target.value)}
                    placeholder={field.type === 'text' ? `Enter ${field.label.toLowerCase()}` : undefined}
                  />
                )}
              </div>
            ))}

            {/* Inline "add field" form */}
            {addingField ? (
              <div className="rounded-lg border border-dashed border-zinc-300 p-3 space-y-3 bg-zinc-50">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={addFieldNameId} className="text-xs">Field name</Label>
                    <Input
                      id={addFieldNameId}
                      value={newFieldName}
                      onChange={e => setNewFieldName(e.target.value)}
                      placeholder="e.g. Household Size"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmAddField() } }}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Field type</Label>
                    <Select value={newFieldType} onValueChange={v => setNewFieldType(v as AdHocFieldType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map(ft => (
                          <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={confirmAddField} disabled={!newFieldName.trim()}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingField(false); setNewFieldName(''); setNewFieldType('text') }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingField(true)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-4 w-4" /> Add field
              </button>
            )}
          </CardContent>
        </Card>

        {error && (
          <p id="form-error" role="alert" className="text-sm text-destructive mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? t.registering : t.register}
          </Button>
          <Link href="/clients" className={cn(buttonVariants({ variant: 'outline' }))}>
            {t.cancel}
          </Link>
        </div>
      </form>
    </div>
  )
}
