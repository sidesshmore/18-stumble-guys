import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

const UpdateSchema = z.object({
  role: z.enum(['admin', 'staff']),
})

// DELETE /api/admin/staff/[id] — remove a staff member from org
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (targetId === user.id) return NextResponse.json({ error: 'Cannot remove yourself.' }, { status: 400 })

  const { data: me } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  // Verify target is in same org
  const { data: target } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', targetId)
    .eq('org_id', me.org_id)
    .single()

  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

  const adminClient = createAdminClient()

  // Remove from auth (this cascades to users table via ON DELETE CASCADE)
  const { error } = await adminClient.auth.admin.deleteUser(targetId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAuditEvent({
    action: 'remove_staff',
    tableName: 'users',
    recordId: targetId,
    orgId: me.org_id,
    actorId: user.id,
    actorRole: me.role,
    metadata: { removed_email: target.email, removed_role: target.role },
  })

  return NextResponse.json({ ok: true })
}

// PATCH /api/admin/staff/[id] — update role
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (targetId === user.id) return NextResponse.json({ error: 'Cannot change your own role.' }, { status: 400 })

  const { data: me } = await supabase.from('users').select('org_id, role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('users')
    .update({ role: parsed.data.role })
    .eq('id', targetId)
    .eq('org_id', me.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAuditEvent({
    action: 'update_staff_role',
    tableName: 'users',
    recordId: targetId,
    orgId: me.org_id,
    actorId: user.id,
    actorRole: me.role,
    metadata: { new_role: parsed.data.role },
  })

  return NextResponse.json({ ok: true })
}
