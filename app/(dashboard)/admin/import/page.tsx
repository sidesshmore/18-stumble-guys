'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, X, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LiveRegion } from '@/components/a11y/LiveRegion'
import { useLanguage } from '@/components/LanguageProvider'
import Papa from 'papaparse'

interface PreviewRow {
  id: number
  first_name: string
  last_name: string
  date_of_birth: string
  phone: string
  email: string
  language_preference: string
}

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

function isValid(row: PreviewRow) {
  return !!(row.first_name.trim() && row.last_name.trim())
}

let nextId = 1

export default function ImportPage() {
  const { t } = useLanguage()
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { data, errors } = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      })
      if (errors.length > 0) {
        setStatusMsg(`CSV parse error: ${errors[0].message}`)
        return
      }
      const rows: PreviewRow[] = data.slice(0, 500).map((row) => ({
        id: nextId++,
        first_name: row.first_name ?? '',
        last_name: row.last_name ?? '',
        date_of_birth: row.date_of_birth ?? '',
        phone: row.phone ?? '',
        email: row.email ?? '',
        language_preference: row.language_preference ?? 'en',
      }))
      setPreview(rows)
    }
    reader.readAsText(file)
  }

  function updateCell(id: number, field: keyof Omit<PreviewRow, 'id'>, value: string) {
    setPreview(prev => prev!.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  function deleteRow(id: number) {
    setPreview(prev => {
      const next = prev!.filter(r => r.id !== id)
      return next.length ? next : null
    })
  }

  function addRow() {
    setPreview(prev => [...(prev ?? []), {
      id: nextId++, first_name: '', last_name: '',
      date_of_birth: '', phone: '', email: '', language_preference: 'en',
    }])
  }

  function cancelPreview() {
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function confirmImport() {
    if (!preview) return
    setImporting(true)
    setStatusMsg(t('import_importing'))

    // Reconstruct CSV from edited rows (only valid ones will be imported by API)
    const csv = Papa.unparse(
      preview.map(({ id: _id, ...row }) => row),
      { header: true }
    )
    const file = new File([csv], 'import.csv', { type: 'text/csv' })
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
        setStatusMsg(t('import_complete'))
        setPreview(null)
      } else {
        setStatusMsg(`${t('common_error')} ${data.error}`)
      }
    } catch {
      setStatusMsg(t('common_error'))
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const validCount = preview?.filter(isValid).length ?? 0
  const invalidCount = (preview?.length ?? 0) - validCount

  // Shared cell input style — borderless at rest, outlined on focus
  const cellInput = 'w-full bg-transparent px-1 py-0.5 text-sm outline-none rounded focus:ring-1 focus:ring-indigo-400 focus:bg-white placeholder:text-zinc-300'

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <LiveRegion message={statusMsg} />
      <h1 className="text-2xl font-bold">{t('import_title')}</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('import_export_card')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{t('import_export_hint')}</p>
          <a href="/api/export" download className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('import_download_csv')}
          </a>
        </CardContent>
      </Card>

      <Card className={cn(preview && 'overflow-visible')}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t('import_import_card')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Step 1 — File picker */}
          {!preview && (
            <div className="rounded-md border-2 border-dashed border-slate-200 p-6 text-center space-y-3">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">{t('import_upload_label')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Required: <code className="bg-slate-100 px-1 rounded">first_name</code>, <code className="bg-slate-100 px-1 rounded">last_name</code>
                </p>
                <p className="text-xs text-muted-foreground">
                  Optional: <code className="bg-slate-100 px-1 rounded">date_of_birth</code>, <code className="bg-slate-100 px-1 rounded">phone</code>, <code className="bg-slate-100 px-1 rounded">email</code>, <code className="bg-slate-100 px-1 rounded">language_preference</code>
                </p>
              </div>
              <label htmlFor="csv-upload" className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer')}>
                {t('import_choose_file')}
              </label>
              <input
                id="csv-upload" type="file" accept=".csv,text/csv"
                onChange={handleFileSelect} ref={fileRef}
                className="sr-only" aria-label="Choose CSV file to import"
              />
            </div>
          )}

          {/* Step 2 — Editable preview */}
          {preview && (
            <div className="space-y-3">
              {/* Summary + actions bar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    {validCount} ready to import
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                      <AlertCircle className="h-4 w-4" />
                      {invalidCount} incomplete
                    </span>
                  )}
                </div>
                <button onClick={cancelPreview} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  <X className="h-3.5 w-3.5" /> Discard
                </button>
              </div>

              {/* Editable table */}
              <div className="rounded-md border overflow-auto max-h-[480px]">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-zinc-50 border-b sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-xs font-semibold text-zinc-400 w-8 text-center">#</th>
                      <th className="px-2 py-2 text-xs font-semibold text-zinc-500 text-left">First Name <span className="text-red-400">*</span></th>
                      <th className="px-2 py-2 text-xs font-semibold text-zinc-500 text-left">Last Name <span className="text-red-400">*</span></th>
                      <th className="px-2 py-2 text-xs font-semibold text-zinc-500 text-left">Date of Birth</th>
                      <th className="px-2 py-2 text-xs font-semibold text-zinc-500 text-left">Phone</th>
                      <th className="px-2 py-2 text-xs font-semibold text-zinc-500 text-left">Email</th>
                      <th className="px-2 py-2 text-xs font-semibold text-zinc-500 text-left">Lang</th>
                      <th className="px-2 py-2 text-xs font-semibold text-zinc-500 text-center w-16">Status</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => {
                      const valid = isValid(row)
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            'border-b last:border-0 group',
                            valid ? 'hover:bg-zinc-50/80' : 'bg-red-50/40 hover:bg-red-50/70'
                          )}
                        >
                          <td className="px-2 py-1 text-xs text-zinc-400 text-center select-none">{i + 1}</td>

                          <td className={cn('px-1 py-0.5', !row.first_name.trim() && 'bg-red-50')}>
                            <input
                              className={cn(cellInput, !row.first_name.trim() && 'placeholder:text-red-300')}
                              value={row.first_name}
                              onChange={e => updateCell(row.id, 'first_name', e.target.value)}
                              placeholder="required"
                              aria-label={`Row ${i + 1} first name`}
                            />
                          </td>

                          <td className={cn('px-1 py-0.5', !row.last_name.trim() && 'bg-red-50')}>
                            <input
                              className={cn(cellInput, !row.last_name.trim() && 'placeholder:text-red-300')}
                              value={row.last_name}
                              onChange={e => updateCell(row.id, 'last_name', e.target.value)}
                              placeholder="required"
                              aria-label={`Row ${i + 1} last name`}
                            />
                          </td>

                          <td className="px-1 py-0.5">
                            <input
                              className={cellInput}
                              type="date"
                              value={row.date_of_birth}
                              onChange={e => updateCell(row.id, 'date_of_birth', e.target.value)}
                              aria-label={`Row ${i + 1} date of birth`}
                            />
                          </td>

                          <td className="px-1 py-0.5">
                            <input
                              className={cellInput}
                              value={row.phone}
                              onChange={e => updateCell(row.id, 'phone', e.target.value)}
                              placeholder="—"
                              aria-label={`Row ${i + 1} phone`}
                            />
                          </td>

                          <td className="px-1 py-0.5">
                            <input
                              className={cellInput}
                              type="email"
                              value={row.email}
                              onChange={e => updateCell(row.id, 'email', e.target.value)}
                              placeholder="—"
                              aria-label={`Row ${i + 1} email`}
                            />
                          </td>

                          <td className="px-1 py-0.5 w-20">
                            <select
                              className={cn(cellInput, 'cursor-pointer')}
                              value={row.language_preference}
                              onChange={e => updateCell(row.id, 'language_preference', e.target.value)}
                              aria-label={`Row ${i + 1} language`}
                            >
                              <option value="en">EN</option>
                              <option value="es">ES</option>
                            </select>
                          </td>

                          <td className="px-2 py-1 text-center">
                            {valid
                              ? <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">Import</span>
                              : <span className="text-[10px] font-semibold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full">Incomplete</span>
                            }
                          </td>

                          <td className="px-1 py-1 text-center">
                            <button
                              onClick={() => deleteRow(row.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
                              aria-label={`Delete row ${i + 1}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add row */}
              <button
                onClick={addRow}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-4 w-4" /> Add row
              </button>

              {/* Confirm / Cancel */}
              <div className="flex gap-3 pt-1">
                <Button onClick={confirmImport} disabled={importing || validCount === 0} className="gap-2">
                  {importing
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Importing…</>
                    : <><Upload className="h-4 w-4" />Import {validCount} client{validCount !== 1 ? 's' : ''}</>
                  }
                </Button>
                <Button variant="outline" onClick={cancelPreview} disabled={importing}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-md border p-4 space-y-2" role="status">
              <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {t('import_complete')}
              </div>
              <p className="text-sm">{t('import_result', { imported: result.imported, skipped: result.skipped })}</p>
              {result.errors.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-destructive flex items-center gap-1 mb-1">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('import_errors')}
                  </p>
                  <ul className="text-xs text-destructive space-y-0.5">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
