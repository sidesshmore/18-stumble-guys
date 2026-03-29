import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('clients')
    .select('language_preference')
    .eq('is_active', true)

  const counts: Record<string, number> = {}
  for (const c of data ?? []) {
    const lang = c.language_preference ?? 'en'
    counts[lang] = (counts[lang] ?? 0) + 1
  }

  const LANG_LABELS: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', zh: 'Chinese',
    vi: 'Vietnamese', ar: 'Arabic', so: 'Somali', other: 'Other',
  }

  const stats = Object.entries(counts).map(([lang, count]) => ({
    language: LANG_LABELS[lang] ?? lang,
    count,
  })).sort((a, b) => b.count - a.count)

  return NextResponse.json({ data: stats })
}
