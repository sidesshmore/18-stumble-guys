/**
 * PATCH  /api/clients/[id]/documents/[docId]  — toggle visible_to_client
 * DELETE /api/clients/[id]/documents/[docId]  — delete file from storage + DB
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const BUCKET = 'client-documents'

type Ctx = { params: Promise<{ id: string; docId: string }> }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { docId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { visible_to_client } = await request.json()

  const { data, error } = await supabase
    .from('client_documents')
    .update({ visible_to_client })
    .eq('id', docId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { docId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch path before deleting row (RLS ensures it's in user's org)
  const { data: doc, error: fetchError } = await supabase
    .from('client_documents')
    .select('storage_path')
    .eq('id', docId)
    .single()

  if (fetchError || !doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete from storage first
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([doc.storage_path])
  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 })

  await supabase.from('client_documents').delete().eq('id', docId)

  return NextResponse.json({ ok: true })
}
