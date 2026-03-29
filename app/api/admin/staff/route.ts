import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

const InviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(['admin', 'staff']),
})

// GET /api/admin/staff — list all staff in org with verification status
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  // Fetch org users from our users table
  const { data: orgUsers, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, created_at')
    .eq('org_id', me.org_id)
    .neq('role', 'client')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch auth metadata (email_confirmed_at, last_sign_in_at) via admin API
  const adminClient = createAdminClient()
  const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const authMap = new Map(authData?.users?.map(u => [u.id, u]) ?? [])

  const staff = (orgUsers ?? []).map(u => {
    const authUser = authMap.get(u.id)
    return {
      ...u,
      email_confirmed_at: authUser?.email_confirmed_at ?? null,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
      invited_at: authUser?.invited_at ?? null,
      confirmed: !!authUser?.email_confirmed_at,
    }
  })

  return NextResponse.json({ staff })
}

// POST /api/admin/staff — invite a staff member
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await request.json()
  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { email, full_name, role } = parsed.data
  const adminClient = createAdminClient()

  // Check if email already exists in this org
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('org_id', me.org_id)
    .single()

  if (existing) return NextResponse.json({ error: 'User with this email already exists in your org.' }, { status: 409 })

  // Send Supabase invite (creates auth user + sends magic link email)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name, org_id: me.org_id, role },
    redirectTo: `${siteUrl}/auth/callback?redirectTo=/dashboard`,
  })

  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 })

  // Immediately create the users table record (auth user now exists)
  const { error: insertError } = await adminClient.from('users').insert({
    id: inviteData.user.id,
    org_id: me.org_id,
    email,
    full_name,
    role,
  })

  if (insertError && !insertError.message.includes('duplicate')) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  await logAuditEvent({
    action: 'invite_staff',
    tableName: 'users',
    recordId: inviteData.user.id,
    orgId: me.org_id,
    actorId: user.id,
    actorRole: me.role,
    metadata: { invited_email: email, invited_role: role },
  })

  return NextResponse.json({ ok: true, user_id: inviteData.user.id })
}
