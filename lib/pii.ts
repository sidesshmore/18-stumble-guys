/**
 * PII masking for Privacy by Design.
 *
 * Usage:
 *   const masker = createMasker(['Jane Doe'])   // pass known client names
 *   const safeText = masker.mask(rawNotes)      // replace PII with tokens
 *   const llmOut   = await callLLM(safeText)    // send sanitized text
 *   const result   = masker.unmask(llmOut)      // restore real values in response
 *
 * All .mask() calls on the same masker instance share a token map, so the same
 * phone number always gets the same token across multiple fields.
 */
import { createHash } from 'crypto'

export type PiiMap = Record<string, string>

/** Ordered: SSN before phone so "123-45-6789" isn't partially matched as phone. */
const PATTERNS: Array<[RegExp, string]> = [
  [/\b\d{3}-\d{2}-\d{4}\b/g, 'SSN'],
  [/(\+1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, 'PHONE'],
  [/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, 'EMAIL'],
]

/**
 * Returns a stateful masker bound to a set of known names.
 * Call .mask() on every string going to an external API.
 * Call .unmask() on the response to restore original values.
 */
export function createMasker(knownNames?: string[]) {
  const map: PiiMap = {}
  const counters: Record<string, number> = {}

  // Pre-build name replacement pairs (case-insensitive)
  const nameReplacements: Array<[RegExp, string]> = []
  let nameIdx = 0
  for (const name of knownNames ?? []) {
    if (!name?.trim()) continue
    nameIdx++
    const token = nameIdx === 1 ? '[CLIENT_NAME]' : `[CLIENT_NAME_${nameIdx}]`
    map[token] = name
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    nameReplacements.push([new RegExp(escaped, 'gi'), token])
  }

  function mask(text: string): string {
    if (!text) return text
    let result = text

    // Replace known names first so partial name matches don't get double-tokenised
    for (const [re, token] of nameReplacements) {
      result = result.replace(re, token)
    }

    // Replace regex-detected PII
    for (const [pattern, label] of PATTERNS) {
      result = result.replace(pattern, (match) => {
        // Re-use token if same value seen before
        const existing = Object.entries(map).find(([, v]) => v === match)?.[0]
        if (existing) return existing
        counters[label] = (counters[label] ?? 0) + 1
        const token = `[${label}_${counters[label]}]`
        map[token] = match
        return token
      })
    }

    return result
  }

  function unmask(text: string): string {
    let result = text
    for (const [token, value] of Object.entries(map)) {
      result = result.split(token).join(value)
    }
    return result
  }

  return {
    mask,
    unmask,
    /** Number of unique PII tokens replaced so far — useful for audit metadata. */
    get tokenCount() { return Object.keys(map).length },
  }
}

/**
 * SHA-256 of a string, truncated to 32 hex chars.
 * Short enough that it can't be reversed to reveal PII, long enough to be
 * a meaningful integrity fingerprint for audit records.
 */
export function hashForAudit(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32)
}
