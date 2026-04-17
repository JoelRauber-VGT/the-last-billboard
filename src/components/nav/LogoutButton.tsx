"use client"

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useState } from 'react'

export function LogoutButton() {
  const router = useRouter()
  const t = useTranslations('nav')
  const [isLoading, setIsLoading] = useState(false)

  async function handleLogout() {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleLogout}
      variant="ghost"
      size="sm"
      disabled={isLoading}
    >
      <LogOut className="h-4 w-4 mr-2" />
      {t('logout')}
    </Button>
  )
}
