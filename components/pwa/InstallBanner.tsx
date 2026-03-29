'use client'

import { useState, useEffect } from 'react'
import { Download, Share, Bell, X, Check } from 'lucide-react'

type Platform = 'android' | 'ios' | null
type Step = 'install' | 'notify' | null

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const out = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i)
  return out
}

const INSTALL_KEY = 'pwa-install-dismissed'
const NOTIFY_KEY  = 'pwa-notify-dismissed'
const INSTALL_TTL = 7 * 24 * 60 * 60 * 1000
const NOTIFY_TTL  = 3 * 24 * 60 * 60 * 1000

function isDismissed(key: string, ttl: number): boolean {
  try {
    const ts = localStorage.getItem(key)
    return !!ts && Date.now() - Number(ts) < ttl
  } catch { return false }
}

function setDismissed(key: string) {
  try { localStorage.setItem(key, String(Date.now())) } catch { /* noop */ }
}

function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

function notificationsGranted(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const isIos = /iphone|ipad|ipod/i.test(ua)
  const isIosSafari = isIos && /safari/i.test(ua) && !/crios|fxios|opios/i.test(ua)
  if (isIosSafari) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return null
}

export function InstallBanner() {
  const [step, setStep]           = useState<Step>(null)
  const [platform, setPlatform]   = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [notifyState, setNotifyState] = useState<'idle' | 'loading' | 'done'>('idle')

  useEffect(() => {
    const p = detectPlatform()
    setPlatform(p)

    const installed  = isInstalled()
    const notified   = notificationsGranted()

    // Already installed — jump straight to notify step if not yet granted
    if (installed) {
      if (!notified && !isDismissed(NOTIFY_KEY, NOTIFY_TTL)) setStep('notify')
      return
    }

    // Not installed
    if (!isDismissed(INSTALL_KEY, INSTALL_TTL)) {
      if (p === 'android') {
        const handler = (e: Event) => {
          e.preventDefault()
          setDeferredPrompt(e as BeforeInstallPromptEvent)
          setStep('install')
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
      }
      if (p === 'ios') {
        const t = setTimeout(() => setStep('install'), 1500)
        return () => clearTimeout(t)
      }
    }
  }, [])

  // ── Install (Android) ────────────────────────────────────────────────────
  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') {
      // Transition to notification step
      const notified = notificationsGranted()
      if (!notified && !isDismissed(NOTIFY_KEY, NOTIFY_TTL)) {
        setStep('notify')
      } else {
        setStep(null)
      }
    } else {
      dismissInstall()
    }
  }

  function dismissInstall() {
    setDismissed(INSTALL_KEY)
    // Still show notify step if eligible
    const notified = notificationsGranted()
    if (!notified && !isDismissed(NOTIFY_KEY, NOTIFY_TTL)) {
      setStep('notify')
    } else {
      setStep(null)
    }
  }

  // ── Notifications ────────────────────────────────────────────────────────
  async function enableNotifications() {
    setNotifyState('loading')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setNotifyState('idle'); dismissNotify(); return }

      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) throw new Error('VAPID key not configured')

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      setNotifyState('done')
      setTimeout(() => setStep(null), 1200)
    } catch {
      setNotifyState('idle')
      dismissNotify()
    }
  }

  function dismissNotify() {
    setDismissed(NOTIFY_KEY)
    setStep(null)
  }

  if (!step) return null

  return (
    <div
      role="dialog"
      aria-label={step === 'install' ? 'Install CaseTrack app' : 'Enable notifications'}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
    >
      {/* Progress dots */}
      <div className="flex gap-1 px-4 pt-3">
        <span className={`h-1 w-4 rounded-full transition-colors ${step === 'install' ? 'bg-indigo-500' : 'bg-zinc-600'}`} />
        <span className={`h-1 w-4 rounded-full transition-colors ${step === 'notify'  ? 'bg-indigo-500' : 'bg-zinc-600'}`} />
      </div>

      <div className="px-4 pt-2.5 pb-4 flex items-start gap-3">
        {/* Icon */}
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${step === 'notify' ? 'bg-indigo-600/30' : 'bg-white/10'}`}>
          {step === 'install'
            ? <span className="text-sm font-bold text-white">C</span>
            : <Bell className="h-4 w-4 text-indigo-400" aria-hidden="true" />
          }
        </div>

        <div className="flex-1 min-w-0">

          {/* ── INSTALL STEP ── */}
          {step === 'install' && (
            <>
              <p className="text-[13px] font-semibold text-white leading-snug">Install CaseTrack</p>

              {platform === 'android' && (
                <>
                  <p className="text-[12px] text-zinc-400 mt-0.5 leading-snug">
                    Add to your home screen for quick access — works offline too.
                  </p>
                  <button
                    onClick={install}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Install app
                  </button>
                </>
              )}

              {platform === 'ios' && (
                <p className="text-[12px] text-zinc-400 mt-0.5 leading-snug">
                  Tap{' '}
                  <Share className="inline h-3 w-3 mb-0.5 text-zinc-300" aria-label="Share" />
                  {' '}then{' '}
                  <span className="text-zinc-200 font-medium">"Add to Home Screen"</span>
                  {' '}to install.
                </p>
              )}
            </>
          )}

          {/* ── NOTIFY STEP ── */}
          {step === 'notify' && (
            <>
              <p className="text-[13px] font-semibold text-white leading-snug">Stay on top of your caseload</p>
              <p className="text-[12px] text-zinc-400 mt-0.5 leading-snug">
                Get reminders for upcoming appointments and urgent follow-ups.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={enableNotifications}
                  disabled={notifyState === 'loading' || notifyState === 'done'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-[12px] font-semibold transition-colors"
                >
                  {notifyState === 'done'
                    ? <><Check className="h-3.5 w-3.5" aria-hidden="true" /> Enabled!</>
                    : <><Bell  className="h-3.5 w-3.5" aria-hidden="true" /> {notifyState === 'loading' ? 'Enabling…' : 'Enable notifications'}</>
                  }
                </button>
                <button
                  onClick={dismissNotify}
                  className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Not now
                </button>
              </div>
            </>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={step === 'install' ? dismissInstall : dismissNotify}
          aria-label="Dismiss"
          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 mt-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
