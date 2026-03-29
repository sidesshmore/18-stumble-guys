/**
 * GET  /api/clients/[id]/documents  — list documents with signed download URLs
 * POST /api/clients/[id]/documents  — upload a file (multipart/form-data)
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const BUCKET = 'client-documents'
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf',
])
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('client_documents')
    .select('id, file_name, file_size, mime_type, storage_path, visible_to_client, created_at, uploaded_by, users(full_name)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate short-lived signed URLs for downloads (60 min)
  const docs = await Promise.all(
    (data ?? []).map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, 3600)
      return { ...doc, download_url: signed?.signedUrl ?? null }
    }),
  )

  return NextResponse.json(docs)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('org_id, role').eq('id', user.id).single()
  if (!userData?.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  // Verify client belongs to same org
  const { data: clientRow } = await supabase
    .from('clients').select('id').eq('id', clientId).eq('org_id', userData.org_id).single()
  if (!clientRow) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const visibleToClient = formData.get('visible_to_client') === 'true'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'File type not allowed. Use PDF, JPEG, PNG, WEBP, or HEIC.' }, { status: 400 })
  }

  // Build path: {org_id}/{client_id}/{timestamp}_{sanitized_name}
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${userData.org_id}/${clientId}/${Date.now()}_${safeName}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: doc, error: insertError } = await supabase
    .from('client_documents')
    .insert({
      client_id: clientId,
      org_id: userData.org_id,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      visible_to_client: visibleToClient,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (insertError) {
    // Roll back storage upload
    await supabase.storage.from(BUCKET).remove([storagePath])
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(doc, { status: 201 })
}
