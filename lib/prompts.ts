/**
 * Prompt Registry — fetch org-specific system prompts from DB with fallback to defaults.
 * Cached in-memory for 5 minutes to avoid a DB round-trip on every AI call.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// In-memory cache: `${orgId}:${action}` → { text, fetchedAt }
const cache = new Map<string, { text: string; fetchedAt: number }>()
const TTL_MS = 5 * 60 * 1000

export interface PromptMeta {
  label: string
  description: string
  defaultText: string
}

/** All registered AI actions with their human-readable metadata and fallback prompts */
export const DEFAULT_PROMPTS: Record<string, PromptMeta> = {
  structure_case_note: {
    label: 'Case Note Structuring',
    description:
      'Used when AI structures voice/text notes into JSON (summary, action items, follow-ups, risk level). Add org-specific terminology here — e.g. therapy modalities, intake categories.',
    defaultText:
      'You are a nonprofit case management assistant. Extract structured data from social worker notes. Return only valid JSON.',
  },
  handoff_summary: {
    label: 'Client Handoff Summary',
    description:
      'Used when generating a handoff brief from a client\'s full service history. Customize tone, required sections, or domain vocabulary.',
    defaultText:
      'You are a licensed nonprofit case management professional. Write clear, concise, clinically appropriate handoff summaries. Use plain language a new staff member can act on immediately. Output clean Markdown only.',
  },
  funder_report: {
    label: 'Funder Report Generation',
    description:
      'Used when generating narrative funder/grant reports from org service data. Add funder-specific language, preferred outcome framing, or grant program names.',
    defaultText:
      'You are a professional nonprofit grant writer. Write with clarity, specificity, and warmth. Use only real data — never fabricate statistics.',
  },
  photo_to_intake: {
    label: 'Photo-to-Intake Extraction',
    description:
      'Used when extracting client fields from a photo of a paper intake form. Add form-specific field names your org uses.',
    defaultText:
      'You are a data entry assistant. Extract client information from a photo of a paper intake form. Return only valid JSON.',
  },
}

/**
 * Returns the active system prompt for an org+action.
 * Falls back to DEFAULT_PROMPTS if no custom prompt has been saved.
 */
export async function getSystemPrompt(
  supabase: SupabaseClient,
  orgId: string,
  action: string,
): Promise<string> {
  const fallback = DEFAULT_PROMPTS[action]?.defaultText ?? ''
  const cacheKey = `${orgId}:${action}`

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.text

  const { data } = await supabase
    .from('ai_prompts')
    .select('prompt_template')
    .eq('org_id', orgId)
    .eq('action', action)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const text = data?.prompt_template ?? fallback
  cache.set(cacheKey, { text, fetchedAt: Date.now() })
  return text
}

/** Call after saving a new prompt version so next request re-fetches from DB */
export function invalidatePromptCache(orgId: string, action: string) {
  cache.delete(`${orgId}:${action}`)
}
