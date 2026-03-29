import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('service_entries')
    .select('client_id')

  const sessionsByClient: Record<string, number> = {}
  for (const e of data ?? []) {
    sessionsByClient[e.client_id] = (sessionsByClient[e.client_id] ?? 0) + 1
  }

  const buckets = { '1': 0, '2–5': 0, '6–10': 0, '11+': 0 }
  for (const count of Object.values(sessionsByClient)) {
    if (count === 1) buckets['1']++
    else if (count <= 5) buckets['2–5']++
    else if (count <= 10) buckets['6–10']++
    else buckets['11+']++
  }

  const stats = Object.entries(buckets).map(([sessions, clients]) => ({ sessions, clients }))
  return NextResponse.json({ data: stats })
}
