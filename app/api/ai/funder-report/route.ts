/**
 * POST /api/ai/funder-report
 * Generates a funder impact report narrative using Gemini.
 *
 * Privacy: funder reports use aggregated, anonymous service data.
 * The rich case notes excerpts are PII-masked before reaching Gemini
 * to remove any phone numbers, emails, or SSNs that may appear in raw notes.
 * Every call is recorded in audit_logs.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateFunderReport } from '@/lib/gemini'
import { getSystemPrompt } from '@/lib/prompts'
import { logAuditEvent } from '@/lib/audit'
import { createMasker, hashForAudit } from '@/lib/pii'
import { z } from 'zod'

const Schema = z.object({
  period: z.string().min(1),
  template: z.enum(['quarterly', 'annual', 'demographics', 'services', 'custom']).default('custom'),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(user.id)
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded. Max 10 AI requests per minute.' }, { status: 429 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  // Get org info
  const { data: userData } = await supabase
    .from('users')
    .select('org_id, organizations(name)')
    .eq('id', user.id)
    .single()

  if (!userData?.org_id) return NextResponse.json({ error: 'Org not found' }, { status: 403 })

  const orgName = (userData.organizations as unknown as { name: string })?.name ?? 'Our Organization'

  // Aggregate service data for the org
  const { data: entries } = await supabase
    .from('service_entries')
    .select('service_type, notes, date, client_id, ai_structured_notes')
    .eq('org_id', userData.org_id)
    .order('date', { ascending: false })

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: 'No service data found for this organization. Add some service entries first.' }, { status: 404 })
  }

  // Client demographics
  const { data: clients } = await supabase
    .from('clients')
    .select('id, language_preference, demographics, date_of_birth')
    .eq('org_id', userData.org_id)
    .eq('is_active', true)

  // Build service type breakdown
  const breakdown: Record<string, number> = {}
  for (const e of entries) {
    breakdown[e.service_type] = (breakdown[e.service_type] ?? 0) + 1
  }

  // Language breakdown
  const langBreakdown: Record<string, number> = {}
  for (const c of (clients ?? [])) {
    const lang = c.language_preference ?? 'en'
    langBreakdown[lang] = (langBreakdown[lang] ?? 0) + 1
  }

  // Outcomes from AI structured notes
  const outcomes: string[] = []
  for (const e of entries) {
    const s = e.ai_structured_notes as { summary?: string } | null
    if (s?.summary) outcomes.push(s.summary)
  }

  // Rich case notes for narrative (full text, up to 10)
  const rawRichNotes = entries
    .filter(e => e.notes && e.notes.length > 50)
    .slice(0, 10)
    .map(e => `[${e.service_type} on ${e.date}]: ${e.notes}`)

  // ── Privacy: mask PII in case note excerpts before sending to Gemini ──────
  const masker = createMasker()   // no known names — aggregate data
  const richNotes = rawRichNotes.map(n => masker.mask(n))
  const maskedOutcomes = outcomes.slice(0, 8).map(o => masker.mask(o))

  const uniqueClients = new Set(entries.map(e => e.client_id)).size

  const systemInstruction = await getSystemPrompt(supabase, userData.org_id, 'funder_report')

  const report = await generateFunderReport({
    systemInstruction,
    orgName,
    period: parsed.data.period,
    template: parsed.data.template,
    totalClients: uniqueClients,
    totalSessions: entries.length,
    serviceBreakdown: breakdown,
    languageBreakdown: langBreakdown,
    aiOutcomeSummaries: maskedOutcomes,
    richCaseNotes: richNotes,
  })

  // ── Audit log ─────────────────────────────────────────────────────────────
  logAuditEvent({
    action: 'ai_funder_report',
    orgId: userData.org_id,
    actorId: user.id,
    before: hashForAudit(rawRichNotes.join('\n')),
    after: hashForAudit(report),
    metadata: {
      template: parsed.data.template,
      period: parsed.data.period,
      entries_count: entries.length,
      unique_clients: uniqueClients,
      pii_tokens_masked: masker.tokenCount,
      model: 'gemini-2.5-flash',
    },
  }).catch(() => {})

  return NextResponse.json({ report })
}
