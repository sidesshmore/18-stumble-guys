import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

export type AuditAction =
  | 'create_client' | 'update_client' | 'delete_client'
  | 'create_service_entry' | 'update_service_entry' | 'delete_service_entry'
  | 'create_appointment' | 'update_appointment'
  | 'update_follow_up'
  | 'ai_voice_to_notes' | 'ai_client_summary' | 'ai_funder_report'
  | 'ai_follow_ups' | 'ai_photo_to_intake' | 'ai_translate' | 'ai_tts' | 'ai_search'
  | 'import_csv' | 'export_csv'
  | 'invite_staff' | 'remove_staff' | 'update_staff_role'
  | 'invite_client'
  | 'page_visit'

function hashData(data: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(data) ?? '')
    .digest('hex')
    .slice(0, 16)
}

export async function logAuditEvent({
  action,
  tableName,
  recordId,
  before,
  after,
  orgId,
  actorId,
  actorRole,
  pagePath,
  metadata,
}: {
  action: AuditAction
  tableName?: string
  recordId?: string
  before?: unknown
  after?: unknown
  orgId: string
  actorId: string
  actorRole?: string
  pagePath?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = await createClient()
  await supabase.from('audit_logs').insert({
    org_id: orgId,
    actor_id: actorId,
    action,
    table_name: tableName,
    record_id: recordId,
    before_hash: before ? hashData(before) : null,
    after_hash: after ? hashData(after) : null,
    actor_role: actorRole ?? null,
    page_path: pagePath ?? null,
    metadata: metadata ?? null,
  })
}
