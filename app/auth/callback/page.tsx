'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Signing you in…')

  useEffect(() => {
    const supabase = createClient()

    async function handleCallback() {
      // --- Implicit flow: tokens arrive in URL hash (#access_token=...) ---
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.slice(1)) // strip leading '#'
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token') ?? ''

        if (accessToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            setStatus('Sign-in failed. Redirecting…')
            setTimeout(() => router.replace('/login?error=auth_callback_failed'), 1500)
            return
          }
          await finishSignIn(supabase, router, searchParams)
          return
        }
      }

      // --- PKCE flow: code arrives as query param (?code=...) ---
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setStatus('Sign-in failed. Redirecting…')
          setTimeout(() => router.replace('/login?error=auth_callback_failed'), 1500)
          return
        }
        await finishSignIn(supabase, router, searchParams)
        return
      }

      // --- token_hash flow: used by some Supabase versions for magic links ---
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'email' | 'invite' | 'magiclink',
        })
        if (error) {
          setStatus('Sign-in failed. Redirecting…')
          setTimeout(() => router.replace('/login?error=auth_callback_failed'), 1500)
          return
        }
        await finishSignIn(supabase, router, searchParams)
        return
      }

      // Nothing matched
      router.replace('/login?error=auth_callback_failed')
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50">
      <div className="h-8 w-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
      <p className="text-sm text-zinc-500">{status}</p>
    </div>
  )
}

/** After a session is established: ensure user record exists, then redirect. */
async function finishSignIn(
  supabase: ReturnType<typeof createClient>,
  router: ReturnType<typeof useRouter>,
  searchParams: URLSearchParams
) {
  // Ensure user record exists in public.users (handles new signups)
  await fetch('/api/auth/setup', { method: 'POST' })

  // Get the user's role to decide where to redirect
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    router.replace('/login?error=auth_callback_failed')
    return
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = userData?.role ?? user.user_metadata?.role ?? 'staff'
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'
  router.replace(role === 'client' ? '/portal' : redirectTo)
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
