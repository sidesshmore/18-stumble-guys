/**
 * POST /api/ai/follow-ups
 * Extracts follow-up items from a service entry note using Gemini.
 * Called async after saving a service entry.
 *
 * Privacy: case note PII is masked before reaching Gemini.
 * Every call is recorded in audit_logs with input/output hashes.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { structureCaseNote } from '@/lib/gemini'
import { getSystemPrompt } from '@/lib/prompts'
import { sendPushToOrg } from '@/lib/push'
import { logAuditEvent } from '@/lib/audit'
import { createMasker, hashForAudit } from '@/lib/pii'
import { z } from 'zod'

const Schema = z.object({
  dry_run: z.boolean().optional().default(false),
  service_entry_id: z.string().min(1).optional(),
  client_id: z.string().min(1),
  notes: z.string().min(1),
  service_type: z.string(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(user.id)
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded. Max 10 AI requests per minute.' }, { status: 429 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { dry_run, service_entry_id, client_id, notes, service_type } = parsed.data

  const { data: userData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const systemInstruction = userData?.org_id
    ? await getSystemPrompt(supabase, userData.org_id, 'structure_case_note')
    : undefined

  // ── Privacy: mask PII before sending to Gemini ────────────────────────────
  const masker = createMasker()
  const maskedNotes = masker.mask(notes)
  const inputHash = hashForAudit(notes + service_type)

  const structured = await structureCaseNote(maskedNotes, service_type, systemInstruction)

  // ── Audit log ─────────────────────────────────────────────────────────────
  if (userData?.org_id) {
    logAuditEvent({
      action: 'ai_follow_ups',
      orgId: userData.org_id,
      actorId: user.id,
      recordId: service_entry_id ?? client_id,
      tableName: service_entry_id ? 'service_entries' : 'clients',
      before: inputHash,
      after: hashForAudit(JSON.stringify(structured)),
      metadata: {
        client_id,
        service_entry_id,
        dry_run,
        pii_tokens_masked: masker.tokenCount,
        model: 'gemini-2.5-flash',
      },
    }).catch(() => {})
  }

  // dry_run: detect only — do not write anything to DB (human must confirm first)
  if (!dry_run && service_entry_id) {
    // Update service entry with AI structured notes
    await supabase
      .from('service_entries')
      .update({ ai_structured_notes: structured })
      .eq('id', service_entry_id)

    // Insert follow-ups
    if (structured.follow_ups && structured.follow_ups.length > 0 && userData?.org_id) {
      const followUps = structured.follow_ups.map(f => ({
        client_id,
        service_entry_id,
        org_id: userData.org_id,
        description: f.description,
        urgency: f.urgency,
        due_date: f.due_date ?? null,
        status: 'pending' as const,
      }))
      const { data: inserted } = await supabase
        .from('follow_ups')
        .insert(followUps)
        .select('id, urgency, description')

      // Push notification for critical/high follow-ups
      if (inserted && userData?.org_id) {
        for (const fu of inserted) {
          if (fu.urgency === 'critical' || fu.urgency === 'high') {
            sendPushToOrg(userData.org_id, {
              title: fu.urgency === 'critical' ? 'Critical Follow-up Required' : 'High Priority Follow-up',
              body: fu.description.slice(0, 120),
              type: 'follow_up',
              id: fu.id,
            }).catch(() => {})  // fire-and-forget, don't block response
          }
        }
      }
    }
  }

  return NextResponse.json({ structured, follow_ups_created: structured.follow_ups?.length ?? 0 })
}
