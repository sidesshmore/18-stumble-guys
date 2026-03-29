'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function PageVisitTracker() {
  const pathname = usePathname()
  const lastLogged = useRef<string>('')

  useEffect(() => {
    if (pathname === lastLogged.current) return
    lastLogged.current = pathname

    fetch('/api/audit/page-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_path: pathname }),
    }).catch(() => {})
  }, [pathname])

  return null
}
