'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Mode = 'password' | 'magic'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<Mode>('password')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)

  const supabase = createClient()

  async function handleGoogle() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError('Email is required'); return }
    setLoading(true)
    setError(null)

    if (mode === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false) }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) { setError(error.message); setLoading(false) }
      else setMagicSent(true)
      setLoading(false)
    }
  }

  if (magicSent) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-100 p-4">
        <div className="w-full max-w-sm text-center animate-fade-up">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-zinc-100 mb-5">
            <Mail className="h-5 w-5 text-zinc-600" aria-hidden="true" />
          </div>
          <h1 className="text-[18px] font-semibold text-zinc-900 mb-2">Check your email</h1>
          <p className="text-[13px] text-zinc-500 leading-relaxed">
            We sent a login link to{' '}
            <span className="font-medium text-zinc-800">{email}</span>.
            <br />
            Click the link to sign in.
          </p>
          <button
            onClick={() => { setMagicSent(false); setError(null) }}
            className="mt-6 text-[13px] text-zinc-400 hover:text-zinc-700 underline underline-offset-2"
          >
            Use a different email
          </button>
        </div>
      </main>
    )
  }

  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center bg-zinc-100 p-4"
    >
      <div className="w-full max-w-sm animate-fade-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-zinc-700 mb-4">
            <span className="text-[15px] font-bold text-white">C</span>
          </div>
          <h1 className="text-[20px] font-semibold text-zinc-900 tracking-tight">CaseTrack</h1>
          <p className="text-[13px] text-zinc-400 mt-1">Nonprofit case management</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-sm">

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            aria-label="Continue with Google"
            className="w-full flex items-center justify-center gap-2.5 h-10 rounded-lg border border-zinc-200 text-[13px] font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-100" />
            <span className="text-[11px] text-zinc-400 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-medium text-zinc-600">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@nonprofit.org"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null) }}
                autoComplete="email"
                autoFocus
                required
                aria-required="true"
                className="h-9 text-[13px] border-zinc-200 rounded-lg focus-visible:ring-zinc-300"
              />
            </div>

            {mode === 'password' && (
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[12px] font-medium text-zinc-600">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  autoComplete="current-password"
                  required
                  aria-required="true"
                  className="h-9 text-[13px] border-zinc-200 rounded-lg focus-visible:ring-zinc-300"
                />
              </div>
            )}

            {error && (
              <p role="alert" className="text-[12px] text-red-500 flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full h-9 rounded-lg text-[13px] font-medium flex items-center justify-center gap-2',
                'bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              )}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  {mode === 'password' ? 'Sign in' : 'Send magic link'}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Mode toggle */}
          <button
            type="button"
            onClick={() => { setMode(m => m === 'password' ? 'magic' : 'password'); setError(null) }}
            className="w-full text-[12px] text-zinc-400 hover:text-zinc-700 transition-colors text-center"
          >
            {mode === 'password'
              ? 'Sign in with a magic link instead'
              : 'Sign in with password instead'}
          </button>
        </div>

        <p className="text-center text-[12px] text-zinc-400 mt-5">
          Secure access for authorized staff only.
        </p>
      </div>
    </main>
  )
}
