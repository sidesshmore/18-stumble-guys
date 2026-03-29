import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Last 12 months
  const since = new Date()
  since.setMonth(since.getMonth() - 11)
  since.setDate(1)

  const { data, error } = await supabase
    .from('service_entries')
    .select('date')
    .gte('date', since.toISOString().split('T')[0])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts: Record<string, number> = {}
  for (const e of data ?? []) {
    const month = e.date.slice(0, 7) // YYYY-MM
    counts[month] = (counts[month] ?? 0) + 1
  }

  // Fill all months in range
  const stats = []
  const cursor = new Date(since)
  const now = new Date()
  while (cursor <= now) {
    const key = cursor.toISOString().slice(0, 7)
    stats.push({
      month: cursor.toLocaleString('default', { month: 'short', year: '2-digit' }),
      sessions: counts[key] ?? 0,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return NextResponse.json({ data: stats })
}
