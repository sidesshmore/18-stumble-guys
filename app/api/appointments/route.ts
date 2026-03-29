import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('appointments')
    .select('*, clients(first_name, last_name, id), users(full_name)')
    .order('scheduled_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}


const CreateAppointmentSchema = z.object({
  client_id: z.string().min(1),
  scheduled_at: z.string().min(1),
  service_type: z.string().optional(),
  notes: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('org_id').eq('id', user.id).single()
  if (!userData?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const body = await request.json()
  const parsed = CreateAppointmentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      ...parsed.data,
      org_id: userData.org_id,
      staff_id: user.id,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
