import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { CreateClientSchema } from '@/lib/validators/client'
import { logAuditEvent } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('org_id').eq('id', user.id).single()
  if (!userData?.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 })

  const search = request.nextUrl.searchParams.get('search') ?? ''

  let query = supabase
    .from('clients')
    .select('id, client_number, first_name, last_name, date_of_birth, phone, email, language_preference, demographics, is_active, created_at')
    .eq('org_id', userData.org_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,client_number.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('org_id').eq('id', user.id).single()
  if (!userData?.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 })

  const body = await request.json()
  const parsed = CreateClientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({ ...parsed.data, org_id: userData.org_id, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAuditEvent({
    action: 'create_client',
    tableName: 'clients',
    recordId: data.id,
    after: { id: data.id, client_number: data.client_number },
    orgId: userData.org_id,
    actorId: user.id,
  })

  return NextResponse.json(data, { status: 201 })
}
