import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.org_id) return NextResponse.json({ ok: false }, { status: 403 })

    const { page_path } = await request.json()
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

    await logAuditEvent({
      action: 'page_visit',
      orgId: userData.org_id,
      actorId: user.id,
      actorRole: userData.role,
      pagePath: page_path,
      metadata: { ip },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
