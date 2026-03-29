import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('service_entries')
    .select('service_type')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts: Record<string, number> = {}
  for (const e of data ?? []) {
    counts[e.service_type] = (counts[e.service_type] ?? 0) + 1
  }

  const stats = Object.entries(counts)
    .map(([service_type, count]) => ({ service_type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return NextResponse.json({ data: stats })
}
