'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Settings, Plus, Trash2, Loader2, Database } from 'lucide-react'
import { LiveRegion } from '@/components/a11y/LiveRegion'
import { useLanguage } from '@/components/LanguageProvider'

interface CustomField {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  options?: string[]
}

export default function SettingsPage() {
  const { t } = useLanguage()
  const [fields, setFields] = useState<CustomField[]>([])
  const [serviceTypes, setServiceTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [newField, setNewField] = useState({ key: '', label: '', type: 'text' as const })
  const [newServiceType, setNewServiceType] = useState('')
  const [embedding, setEmbedding] = useState(false)
  const [embedResult, setEmbedResult] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings').then(r => r.ok ? r.json() : { custom_fields: [], service_types: [] }),
    ]).then(([data]: [{ custom_fields?: CustomField[]; service_types?: string[] }]) => {
      setFields(data.custom_fields ?? [])
      setServiceTypes(data.service_types ?? [])
      setLoading(false)
    })
  }, [])

  async function save() {
    setSaving(true)
    setStatusMsg(t('settings_saving'))
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_fields: fields, service_types: serviceTypes }),
      })
      setStatusMsg(t('settings_saved'))
    } catch {
      setStatusMsg(t('settings_save_failed'))
    } finally {
      setSaving(false)
    }
  }

  function addField() {
    if (!newField.key || !newField.label) return
    setFields(f => [...f, { ...newField }])
    setNewField({ key: '', label: '', type: 'text' })
  }

  function removeField(key: string) {
    setFields(f => f.filter(x => x.key !== key))
  }

  function addServiceType() {
    if (!newServiceType || serviceTypes.includes(newServiceType)) return
    setServiceTypes(s => [...s, newServiceType])
    setNewServiceType('')
  }

  function removeServiceType(st: string) {
    setServiceTypes(s => s.filter(x => x !== st))
  }

  if (loading) return (
    <main id="main-content" className="p-6">
      <div className="flex items-center gap-2" aria-busy="true">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {t('settings_loading')}
      </div>
    </main>
  )

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <LiveRegion message={statusMsg} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-bold">{t('settings_title')}</h1>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />{t('settings_saving')}</> : t('settings_save')}
        </Button>
      </div>

      {/* Custom Demographic Fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('settings_custom_fields')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('settings_custom_fields_hint')}
          </p>

          <ul className="space-y-2" aria-label="Custom fields">
            {fields.map(f => (
              <li key={f.key} className="flex items-center gap-3 p-2 rounded-md border text-sm">
                <span className="font-medium flex-1">{f.label}</span>
                <Badge variant="outline" className="text-xs font-mono">{f.key}</Badge>
                <Badge variant="secondary" className="text-xs">{f.type}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeField(f.key)}
                  aria-label={`Remove field ${f.label}`}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>

          <div className="flex gap-2 items-end" role="group" aria-label="Add custom field">
            <div className="space-y-1 flex-1">
              <Label htmlFor="field-label">{t('settings_field_label')}</Label>
              <Input
                id="field-label"
                value={newField.label}
                onChange={e => setNewField(f => ({ ...f, label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                placeholder="e.g. Household Size"
              />
            </div>
            <div className="space-y-1 w-28">
              <Label htmlFor="field-key">{t('settings_field_key')}</Label>
              <Input
                id="field-key"
                value={newField.key}
                onChange={e => setNewField(f => ({ ...f, key: e.target.value }))}
                placeholder="household_size"
              />
            </div>
            <Button type="button" variant="outline" onClick={addField} aria-label="Add field">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('settings_service_types')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {serviceTypes.map(st => (
              <div key={st} className="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1 text-sm">
                <span>{st}</span>
                <button
                  type="button"
                  onClick={() => removeServiceType(st)}
                  aria-label={`Remove service type ${st}`}
                  className="ml-1 text-slate-500 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newServiceType}
              onChange={e => setNewServiceType(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addServiceType() } }}
              placeholder={t('settings_service_type_ph')}
              aria-label="New service type"
            />
            <Button type="button" variant="outline" onClick={addServiceType} aria-label="Add service type">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Semantic Search — Embed Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" aria-hidden="true" />
            {t('settings_search_index')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('settings_embed_hint')}
          </p>
          {embedResult && (
            <p className="text-sm font-medium text-green-700 bg-green-50 px-3 py-2 rounded">{embedResult}</p>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={embedding}
            onClick={async () => {
              setEmbedding(true)
              setEmbedResult('')
              try {
                const res = await fetch('/api/admin/embed-seed', { method: 'POST' })
                const data = await res.json()
                if (data.error) {
                  setEmbedResult(`Error: ${data.error}`)
                } else {
                  const errDetail = data.errors?.length ? ` First error: ${data.errors[0]}` : ''
                  setEmbedResult(`Done — ${data.embedded} notes embedded, ${data.failed ?? 0} failed. ${data.message ?? ''}${errDetail}`)
                }
              } catch {
                setEmbedResult('Failed to run embedding job')
              } finally {
                setEmbedding(false)
              }
            }}
          >
            {embedding ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />{t('settings_embedding')}</>
            ) : (
              <><Database className="h-4 w-4 mr-2" aria-hidden="true" />{t('settings_embed_btn')}</>
            )}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
