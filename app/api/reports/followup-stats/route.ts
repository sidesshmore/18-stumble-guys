import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('follow_ups')
    .select('urgency, status')

  const byUrgency: Record<string, { pending: number; completed: number }> = {
    critical: { pending: 0, completed: 0 },
    high: { pending: 0, completed: 0 },
    medium: { pending: 0, completed: 0 },
    low: { pending: 0, completed: 0 },
  }

  for (const f of data ?? []) {
    const u = f.urgency ?? 'low'
    if (!byUrgency[u]) byUrgency[u] = { pending: 0, completed: 0 }
    if (f.status === 'done') byUrgency[u].completed++
    else byUrgency[u].pending++
  }

  const stats = Object.entries(byUrgency).map(([urgency, counts]) => ({
    urgency: urgency.charAt(0).toUpperCase() + urgency.slice(1),
    ...counts,
    total: counts.pending + counts.completed,
  }))

  return NextResponse.json({ data: stats })
}
