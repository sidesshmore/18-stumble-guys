/**
 * POST /api/ai/tts
 * Converts text to speech via ElevenLabs Multilingual v2.
 * Returns MP3 audio stream.
 *
 * Privacy: phone numbers, emails and SSNs are masked before sending to
 * ElevenLabs. The audio is never stored server-side.
 * Every call is recorded in audit_logs with input hash.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { textToSpeech } from '@/lib/elevenlabs'
import { logAuditEvent } from '@/lib/audit'
import { createMasker, hashForAudit } from '@/lib/pii'
import { z } from 'zod'

const MAX_TTS_CHARS = 800

const Schema = z.object({
  text: z.string().min(1).transform(t => t.slice(0, MAX_TTS_CHARS)),
  voice_id: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(user.id)
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded. Max 10 AI requests per minute.' }, { status: 429 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data: userData } = await supabase.from('users').select('org_id').eq('id', user.id).single()

  // ── Privacy: mask PII before sending to ElevenLabs ────────────────────────
  const masker = createMasker()
  const maskedText = masker.mask(parsed.data.text)
  const inputHash = hashForAudit(parsed.data.text)

  try {
    const audioBuffer = await textToSpeech(maskedText, parsed.data.voice_id)

    // ── Audit log ───────────────────────────────────────────────────────────
    if (userData?.org_id) {
      logAuditEvent({
        action: 'ai_tts',
        orgId: userData.org_id,
        actorId: user.id,
        before: inputHash,
        metadata: {
          chars_sent: maskedText.length,
          pii_tokens_masked: masker.tokenCount,
          model: 'eleven_multilingual_v2',
        },
      }).catch(() => {})
    }

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'TTS failed'
    console.error('TTS error:', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
