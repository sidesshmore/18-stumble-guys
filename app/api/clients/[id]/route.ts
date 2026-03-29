import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { UpdateClientSchema } from '@/lib/validators/client'
import { logAuditEvent } from '@/lib/audit'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      service_entries(*, users(full_name)),
      follow_ups(*),
      appointments(*)
    `)
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('org_id').eq('id', user.id).single()

  const body = await request.json()
  const parsed = UpdateClientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data: before } = await supabase.from('clients').select('id').eq('id', id).single()

  const { data, error } = await supabase
    .from('clients').update(parsed.data).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (userData?.org_id) {
    await logAuditEvent({
      action: 'update_client',
      tableName: 'clients',
      recordId: id,
      before,
      after: { id },
      orgId: userData.org_id,
      actorId: user.id,
    })
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('org_id, role').eq('id', user.id).single()
  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (userData?.org_id) {
    await logAuditEvent({
      action: 'delete_client',
      tableName: 'clients',
      recordId: id,
      orgId: userData.org_id,
      actorId: user.id,
    })
  }

  return new NextResponse(null, { status: 204 })
}
