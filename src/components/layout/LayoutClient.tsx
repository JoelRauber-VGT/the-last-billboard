'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Header } from '@/components/nav/Header'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import { AuthOverlay } from '@/components/auth/AuthOverlay'

interface LayoutClientProps {
  user: any
  isAdmin: boolean
  children: React.ReactNode
}

export function LayoutClient({ user, isAdmin, children }: LayoutClientProps) {
  const [rulesOpen, setRulesOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const pathname = usePathname()

  // Check if we're on the homepage (e.g., /en, /de, /fr, /es)
  const isHomePage = pathname?.match(/^\/[a-z]{2}$/)

  return (
    <>
      <Header
        user={user}
        isAdmin={isAdmin}
        onOpenRules={() => setRulesOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
      />
      <main className={`flex-1 ${!isHomePage ? 'overflow-y-auto' : ''}`}>{children}</main>
      <OnboardingModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
      <AuthOverlay isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
