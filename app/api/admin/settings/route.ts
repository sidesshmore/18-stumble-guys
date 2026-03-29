import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

const PatchSchema = z.object({
  custom_fields: z.array(z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(['text', 'number', 'select']),
    options: z.array(z.string()).optional(),
  })).optional(),
  service_types: z.array(z.string().min(1)).optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('org_id, organizations(config, service_types)')
    .eq('id', user.id)
    .single()

  const org = userData?.organizations as unknown as { config: Record<string, unknown>; service_types: string[] } | null

  return NextResponse.json({
    custom_fields: (org?.config?.custom_fields ?? []) as unknown[],
    service_types: org?.service_types ?? [],
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 422 })

  const updates: Record<string, unknown> = {}

  if (parsed.data.custom_fields !== undefined) {
    // Fetch current config to merge
    const { data: org } = await supabase
      .from('organizations')
      .select('config')
      .eq('id', userData.org_id)
      .single()

    const config = (org?.config ?? {}) as Record<string, unknown>
    config.custom_fields = parsed.data.custom_fields
    updates.config = config
  }

  if (parsed.data.service_types !== undefined) {
    updates.service_types = parsed.data.service_types
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true })

  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', userData.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
