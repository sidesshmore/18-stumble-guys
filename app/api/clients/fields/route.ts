import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('org_id').eq('id', user.id).single()

  if (!userData?.org_id) return NextResponse.json([])

  const { data: org } = await supabase
    .from('organizations').select('config').eq('id', userData.org_id).single()

  const fields = (org?.config as { custom_fields?: unknown[] })?.custom_fields ?? []
  return NextResponse.json(fields)
}
