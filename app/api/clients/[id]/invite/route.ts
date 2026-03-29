import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
  if (!me?.org_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch the client — use admin client so portal_user_id is accessible even if column was just added
  const adminClient = createAdminClient()

  const { data: client, error: clientError } = await adminClient
    .from('clients')
    .select('id, email, first_name, last_name, org_id, portal_user_id')
    .eq('id', clientId)
    .eq('org_id', me.org_id)
    .single()

  if (clientError) {
    console.error('[invite] client fetch error:', clientError)
    // Column may not exist yet (migration not run)
    if (clientError.message?.includes('portal_user_id')) {
      return NextResponse.json({
        error: 'Migration 004 has not been run yet. Please run it in Supabase SQL Editor first.',
      }, { status: 500 })
    }
    return NextResponse.json({ error: clientError.message }, { status: 500 })
  }

  if (!client) return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
  if (!client.email) return NextResponse.json({ error: 'Client has no email address on their profile.' }, { status: 400 })
  if (client.portal_user_id) return NextResponse.json({ error: 'Client already has a portal account.' }, { status: 409 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(client.email, {
    data: {
      role: 'client',
      client_id: clientId,
      org_id: me.org_id,
      full_name: `${client.first_name} ${client.last_name}`,
    },
    redirectTo: `${siteUrl}/auth/callback?redirectTo=/portal`,
  })

  if (inviteError) {
    console.error('[invite] Supabase invite error:', inviteError)
    // Email already registered in Supabase Auth
    if (inviteError.message?.toLowerCase().includes('already') || inviteError.status === 422) {
      return NextResponse.json({
        error: 'This email is already registered. Use a different email address for the client portal.',
      }, { status: 409 })
    }
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // Create users table record for the client portal user
  const { error: userInsertError } = await adminClient.from('users').insert({
    id: inviteData.user.id,
    org_id: me.org_id,
    email: client.email,
    full_name: `${client.first_name} ${client.last_name}`,
    role: 'client',
    client_id: clientId,
  })

  if (userInsertError && !userInsertError.message.includes('duplicate')) {
    console.error('[invite] users insert error:', userInsertError)
    // If client_id column doesn't exist yet, fall back without it
    if (userInsertError.message?.includes('client_id')) {
      await adminClient.from('users').insert({
        id: inviteData.user.id,
        org_id: me.org_id,
        email: client.email,
        full_name: `${client.first_name} ${client.last_name}`,
        role: 'client',
      })
    }
  }

  // Link portal user to client record
  const { error: linkError } = await adminClient
    .from('clients')
    .update({ portal_user_id: inviteData.user.id })
    .eq('id', clientId)

  if (linkError) console.error('[invite] portal_user_id link error:', linkError)

  await logAuditEvent({
    action: 'invite_client',
    tableName: 'clients',
    recordId: clientId,
    orgId: me.org_id,
    actorId: user.id,
    actorRole: me.role,
    metadata: { client_email: client.email },
  })

  return NextResponse.json({ ok: true })
}
