/**
 * POST /api/admin/embed-seed
 * One-time job: embeds all existing service_entries that don't yet have an embedding.
 * Admin-only. Safe to run multiple times (uses upsert with onConflict).
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getEmbedding } from '@/lib/gemini'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('org_id, role').eq('id', user.id).single()
  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  // Get all service entries that don't have an embedding yet
  const { data: entries, error: fetchErr } = await supabase
    .from('service_entries')
    .select('id, client_id, org_id, notes')
    .eq('org_id', userData.org_id)
    .not('notes', 'is', null)
    .neq('notes', '')

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!entries?.length) return NextResponse.json({ embedded: 0, message: 'No entries to embed' })

  // Find which ones already have embeddings
  const { data: existing } = await supabase
    .from('case_note_embeddings')
    .select('service_entry_id')
    .eq('org_id', userData.org_id)

  const alreadyEmbedded = new Set((existing ?? []).map(e => e.service_entry_id))
  const toEmbed = entries.filter(e => !alreadyEmbedded.has(e.id) && e.notes.length > 10)

  if (!toEmbed.length) return NextResponse.json({ embedded: 0, message: 'All entries already embedded' })

  let embedded = 0
  let failed = 0
  const errors: string[] = []

  for (const entry of toEmbed) {
    try {
      const embedding = await getEmbedding(entry.notes)
      // Try insert; if duplicate key, treat as already done (not a failure)
      const { error: insertErr } = await supabase
        .from('case_note_embeddings')
        .insert({
          service_entry_id: entry.id,
          org_id: entry.org_id,
          embedding,
          content_hash: entry.id,
        })

      if (insertErr) {
        if (insertErr.code === '23505') {
          // duplicate key — already embedded, skip silently
          embedded++
        } else {
          errors.push(`${entry.id.slice(0, 8)}: ${insertErr.message} (code: ${insertErr.code})`)
          failed++
        }
      } else {
        embedded++
      }

      // Small delay to avoid hitting Gemini rate limits
      await new Promise(r => setTimeout(r, 200))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown'
      errors.push(`${entry.id}: ${msg}`)
      failed++
    }
  }

  return NextResponse.json({
    embedded,
    failed,
    total: toEmbed.length,
    errors: errors.slice(0, 5),
  })
}
