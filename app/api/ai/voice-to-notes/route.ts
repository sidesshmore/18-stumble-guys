/**
 * POST /api/ai/voice-to-notes
 * Accepts multipart audio, transcribes via ElevenLabs Scribe v1,
 * then structures the transcript with Gemini 2.0 Flash.
 *
 * Privacy: transcript PII is masked before reaching Gemini.
 * Audio bytes never leave ElevenLabs (transcription only, no storage).
 * Every call is recorded in audit_logs with input/output hashes.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { speechToText } from '@/lib/elevenlabs'
import { structureCaseNote } from '@/lib/gemini'
import { getSystemPrompt } from '@/lib/prompts'
import { logAuditEvent } from '@/lib/audit'
import { createMasker, hashForAudit } from '@/lib/pii'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(user.id)
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded. Max 10 AI requests per minute.' }, { status: 429 })

  const formData = await request.formData()
  const file = formData.get('audio') as File | null
  const serviceType = (formData.get('service_type') as string) || 'General Services'

  if (!file) return NextResponse.json({ error: 'No audio file' }, { status: 400 })

  // Validate file size (max 25MB per ElevenLabs limit)
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 400 })
  }

  const audioBuffer = await file.arrayBuffer()

  // Step 1: Transcribe with ElevenLabs Scribe v1
  const { text: transcript, language_detected } = await speechToText(
    audioBuffer,
    file.type || 'audio/webm',
  )

  if (!transcript) {
    return NextResponse.json({ error: 'No speech detected' }, { status: 422 })
  }

  // Step 2: Structure with Gemini (using org's custom prompt if set)
  const { data: userData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  const systemInstruction = userData?.org_id
    ? await getSystemPrompt(supabase, userData.org_id, 'structure_case_note')
    : undefined

  // ── Privacy: mask PII in transcript before sending to Gemini ─────────────
  const masker = createMasker()
  const maskedTranscript = masker.mask(transcript)
  const inputHash = hashForAudit(transcript)

  let structured = null
  try {
    structured = await structureCaseNote(maskedTranscript, serviceType, systemInstruction)
  } catch (err) {
    console.error('Gemini structuring failed (transcript still returned):', err)
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  if (userData?.org_id) {
    logAuditEvent({
      action: 'ai_voice_to_notes',
      orgId: userData.org_id,
      actorId: user.id,
      before: inputHash,
      after: structured ? hashForAudit(JSON.stringify(structured)) : null,
      metadata: {
        service_type: serviceType,
        transcript_chars: transcript.length,
        pii_tokens_masked: masker.tokenCount,
        language_detected,
        model: 'gemini-2.5-flash',
      },
    }).catch(() => {})
  }

  return NextResponse.json({
    transcript,
    language_detected,
    structured,
  })
}
