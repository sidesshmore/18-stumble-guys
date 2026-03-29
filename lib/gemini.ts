/**
 * Gemini 2.0 Flash wrapper with round-robin API key rotation across 3 keys.
 * Free tier: 15 RPM / 1M TPM per key → 45 RPM / 3M TPM combined.
 */

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY_1!,
  process.env.GEMINI_API_KEY_2!,
  process.env.GEMINI_API_KEY_3!,
].filter(Boolean)

let keyIndex = 0

function nextKey(): string {
  const key = GEMINI_KEYS[keyIndex % GEMINI_KEYS.length]
  keyIndex++
  return key
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

interface GeminiPart {
  text?: string
  inlineData?: { mimeType: string; data: string }
}

interface GeminiRequest {
  contents: { role: string; parts: GeminiPart[] }[]
  generationConfig?: {
    responseMimeType?: string
    temperature?: number
    maxOutputTokens?: number
  }
  systemInstruction?: { parts: { text: string }[] }
}

async function callGemini(
  body: GeminiRequest,
  model = 'gemini-2.5-flash',
  retries = 3,
): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const key = nextKey()
    const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${key}`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 429 && attempt < retries - 1) {
        // Rate limited — next iteration picks next key automatically
        continue
      }

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Gemini ${res.status}: ${err}`)
      }

      const data = await res.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    } catch (err) {
      if (attempt === retries - 1) throw err
    }
  }
  throw new Error('Gemini: all retries exhausted')
}

/** Structure free-text case notes into JSON with summary, action_items, follow_up flags */
export async function structureCaseNote(
  notes: string,
  serviceType: string,
  systemInstruction = 'You are a nonprofit case management assistant. Extract structured data from social worker notes. Return only valid JSON.',
): Promise<{
  summary: string
  action_items: string[]
  follow_ups: { description: string; urgency: 'low' | 'medium' | 'high' | 'critical'; due_date?: string }[]
  risk_level: 'low' | 'medium' | 'high'
  mood_flags: string[]
}> {
  const today = new Date().toISOString().split('T')[0]
  const body: GeminiRequest = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [{
      role: 'user',
      parts: [{ text: `Service type: ${serviceType}\nDate: ${today}\n\nCase notes:\n${notes}\n\nReturn JSON matching this schema:\n{"summary":"string","action_items":["string"],"follow_ups":[{"description":"string","urgency":"low|medium|high|critical","due_date":"YYYY-MM-DD or null"}],"risk_level":"low|medium|high","mood_flags":["string"]}` }]
    }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
  }

  const text = await callGemini(body)
  try {
    return JSON.parse(text)
  } catch {
    return { summary: notes.slice(0, 200), action_items: [], follow_ups: [], risk_level: 'low', mood_flags: [] }
  }
}

/** Generate a client handoff summary from their full case history */
export async function generateHandoffSummary(
  clientName: string,
  serviceEntries: { date: string; service_type: string; notes: string; ai_structured_notes?: Record<string, unknown> | null }[],
  systemInstruction = 'You are a licensed nonprofit case management professional. Write clear, concise, clinically appropriate handoff summaries. Use plain language a new staff member can act on immediately. Output clean Markdown only.',
): Promise<string> {
  const history = serviceEntries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => {
      const ai = e.ai_structured_notes
      const extras = ai
        ? `\n  → Risk: ${ai.risk_level ?? '—'} | Action items: ${Array.isArray(ai.action_items) ? (ai.action_items as string[]).join('; ') : '—'}`
        : ''
      return `[${e.date}] ${e.service_type}: ${e.notes || '(no notes)'}${extras}`
    })
    .join('\n')

  const body: GeminiRequest = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [{
      role: 'user',
      parts: [{ text: `Client: ${clientName}

Service history (chronological):
${history}

You MUST write all six sections below in full. Each section must have 2–4 sentences minimum. Do not stop after the first section. Use specific dates, service types, and details from the history. Do not fabricate information not present in the history.

Output clean Markdown with bold headings exactly as shown:

## Background
Who is this client? When did they first engage? What were their presenting issues, referral source, and initial circumstances?

## Services History
List every service type delivered chronologically. For each, note the date range, what was done, and what progress or outcome was observed.

## Current Status
Where does the client stand today — what has measurably improved, what remains unresolved, and how engaged are they currently?

## Active Needs & Referrals
What open needs, pending referrals, scheduled appointments, or unresolved action items exist right now that the incoming worker must follow up on?

## Risk Factors
Call out any safety, mental health, housing, financial, legal, or medical risks the incoming case manager must be aware of immediately. If none are evident, state that.

## Recommended Next Steps
Give 4–6 concrete, actionable steps the new case manager should take in their first 30 days, ordered by priority.` }]
    }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 3000 },
  }

  return callGemini(body)
}

/** Generate a funder report narrative from aggregate service data */
export async function generateFunderReport(params: {
  systemInstruction?: string
  orgName: string
  period: string
  template?: 'quarterly' | 'annual' | 'demographics' | 'services' | 'custom'
  totalClients: number
  totalSessions: number
  serviceBreakdown: Record<string, number>
  languageBreakdown: Record<string, number>
  aiOutcomeSummaries: string[]
  richCaseNotes: string[]
}): Promise<string> {
  const template = params.template ?? 'custom'

  const serviceLines = Object.entries(params.serviceBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `- ${type}: ${count} session${count !== 1 ? 's' : ''}`)
    .join('\n')

  const langLines = Object.entries(params.languageBreakdown)
    .map(([lang, count]) => `- ${lang === 'es' ? 'Spanish' : lang === 'en' ? 'English' : lang}: ${count} client${count !== 1 ? 's' : ''}`)
    .join('\n')

  const dataBlock = `ORGANIZATION: ${params.orgName}
REPORTING PERIOD: ${params.period}
Clients served: ${params.totalClients}
Total service sessions: ${params.totalSessions}
Average sessions per client: ${(params.totalSessions / Math.max(params.totalClients, 1)).toFixed(1)}

Services delivered:
${serviceLines}

Client language breakdown:
${langLines}

${params.richCaseNotes.length > 0 ? `Case note excerpts (anonymized):\n${params.richCaseNotes.join('\n\n')}` : ''}
${params.aiOutcomeSummaries.length > 0 ? `\nAI-extracted outcome summaries:\n${params.aiOutcomeSummaries.map(s => `- ${s}`).join('\n')}` : ''}`

  // Template-specific section structures
  const sectionsByTemplate: Record<string, string> = {
    quarterly: `Write a concise quarterly impact report with these sections:

# ${params.orgName}
## ${params.period}

## Quarter at a Glance
(3–4 bullet stats: clients served, sessions delivered, top service type, language diversity)

## What We Delivered This Quarter
(Breakdown of service types with counts. Highlight any notable increase or shift vs. prior quarters if inferable.)

## Client Stories
(2 anonymized vignettes drawn from the case notes — "one participant", "a client". Focus on change within this quarter.)

## Quarter Outcomes
(Measurable results: completion rates, follow-ups resolved, referrals made — use data provided.)

## Looking Ahead
(1 paragraph: what next quarter will focus on, what funding enables)`,

    annual: `Write a comprehensive annual impact report with these sections:

# ${params.orgName}
## ${params.period}

## Executive Summary
(4–5 sentences: who we serve, what we delivered all year, our biggest impact, and our mission)

## Year in Numbers
(A data snapshot: total clients, sessions, average sessions/client, language breakdown — format as a clear bullet list or mini-table)

## Population Served
(Describe the community — vulnerabilities, barriers, why these individuals need support. Use language and demographic data.)

## Services Delivered
(Comprehensive breakdown of every service type, what it involves, count delivered)

## Impact & Client Outcomes
(3 anonymized client journeys — "one participant", "a family we served". Focus on year-long measurable change.)

## Community Need & 2025 Goals
(Unmet need in the community, what continued funder support enables for the year ahead)`,

    demographics: `Write a demographics-focused funder report with these sections:

# ${params.orgName} — Population Served Report
## ${params.period}

## Who We Serve
(Rich narrative description of the client population — language barriers, economic vulnerability, need for services)

## Language & Accessibility
(Deep dive on language breakdown data. Describe how services are delivered across languages, what bilingual service means for access.)

## Client Profiles
(Composite anonymized "typical client" profiles based on case notes — 2–3 archetypes)

## Equity & Access Outcomes
(How services reduced barriers for underserved populations — use case notes and demographics)

## Why Demographics Matter to Funders
(1 paragraph connecting this population data to the funder's equity goals)`,

    services: `Write a service-type breakdown funder report with these sections:

# ${params.orgName} — Services Delivered Report
## ${params.period}

## Overview
(Brief intro: total sessions, clients served, most-delivered service)

## Service-by-Service Breakdown
(For each service type: what it is, how many sessions, who receives it, one outcome example from case notes. Format each as a sub-section.)

## Delivery Model
(Describe how services are delivered — frequency, format, who provides them based on case note evidence)

## Outcomes by Service Type
(For the top 2–3 services, cite specific measurable outcomes from the case notes and AI summaries)

## Service Gaps & Opportunities
(Based on the data, what unmet demand exists? Where could expanded funding have the greatest impact?)`,

    custom: `Write a 2-page funder impact report with these sections:

# ${params.orgName}
## ${params.period}

## Executive Summary
(3–4 sentences: who you serve, what you delivered, one striking outcome)

## Population Served
(Describe clients using demographics and language data)

## Services Delivered
(Data bullets of service types and counts with description of each)

## Client Outcomes & Impact
(2–3 anonymized client journeys from case notes. No real names. Focus on measurable change.)

## Community Need & Looking Ahead
(The unmet need and what continued funding enables)`,
  }

  const sections = sectionsByTemplate[template] ?? sectionsByTemplate.custom

  const prompt = `You are a professional nonprofit grant writer. Generate a compelling funder report using ONLY the real data provided. Do NOT invent numbers or outcomes.

---
${dataBlock}
---

${sections}

Rules:
- Use specific numbers from the data throughout
- Never fabricate statistics or client outcomes
- Use "one participant" / "a client" — never real names
- Write at a professional grant-writer level
- Output clean Markdown only (GitHub Flavored Markdown)
- For any data breakdown (services by type, language breakdown, outcome metrics) format as a Markdown table with headers, e.g.:
  | Service Type | Sessions | % of Total |
  |---|---|---|
  | Individual Music Therapy | 20 | 87% |
- Include at least one Markdown table in every report — funders expect data tables`

  const body: GeminiRequest = {
    systemInstruction: {
      parts: [{ text: params.systemInstruction ?? 'You are a professional nonprofit grant writer. Write with clarity, specificity, and warmth. Use only real data — never fabricate statistics.' }]
    },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 3500 },
  }

  return callGemini(body)
}

/** Extract structured client intake data from a photo of a paper form (base64 image) */
export async function photoToIntake(
  base64Image: string,
  mimeType: string,
  systemInstruction = 'You are a data entry assistant. Extract client information from a photo of a paper intake form. Return only valid JSON.',
): Promise<{
  first_name?: string
  last_name?: string
  date_of_birth?: string
  phone?: string
  email?: string
  demographics?: Record<string, string>
}> {
  const body: GeminiRequest = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: 'Extract all client information visible on this intake form. Return JSON: {"first_name":"","last_name":"","date_of_birth":"YYYY-MM-DD","phone":"","email":"","demographics":{}}. Use null for fields not visible.' }
      ]
    }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 },
  }

  const text = await callGemini(body)
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

/** Translate text using Gemini (falls back to original on error) */
export async function translateText(text: string, targetLanguage: string): Promise<string> {
  const body: GeminiRequest = {
    contents: [{
      role: 'user',
      parts: [{ text: `Translate the following to ${targetLanguage}. Return only the translated text, no explanation:\n\n${text}` }]
    }],
    generationConfig: { temperature: 0.1 },
  }

  try {
    return await callGemini(body)
  } catch {
    return text
  }
}

/** Generate embeddings using Gemini text-embedding-004 (768 dims) */
export async function getEmbedding(text: string): Promise<number[]> {
  // Try each key — embeddings use v1 endpoint (not v1beta)
  for (let attempt = 0; attempt < GEMINI_KEYS.length; attempt++) {
    const key = nextKey()
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          outputDimensionality: 768,
        }),
      })
      if (res.status === 429 && attempt < GEMINI_KEYS.length - 1) continue
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Embedding error: ${res.status} ${err}`)
      }
      const data = await res.json()
      return data.embedding?.values ?? []
    } catch (err) {
      if (attempt === GEMINI_KEYS.length - 1) throw err
    }
  }
  throw new Error('Embedding: all keys exhausted')
}
