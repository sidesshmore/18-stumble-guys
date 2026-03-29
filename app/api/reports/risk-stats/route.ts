import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('service_entries')
    .select('ai_structured_notes')
    .not('ai_structured_notes', 'is', null)

  const counts: Record<string, number> = { low: 0, medium: 0, high: 0 }
  for (const e of data ?? []) {
    const notes = e.ai_structured_notes as { risk_level?: string } | null
    const level = notes?.risk_level ?? 'low'
    counts[level] = (counts[level] ?? 0) + 1
  }

  const stats = [
    { level: 'Low',    count: counts.low,    fill: '#22c55e' },
    { level: 'Medium', count: counts.medium, fill: '#eab308' },
    { level: 'High',   count: counts.high,   fill: '#ef4444' },
  ].filter(s => s.count > 0)

  return NextResponse.json({ data: stats })
}
