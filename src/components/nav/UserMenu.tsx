"use client"

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Package, Settings, LogOut } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useState } from 'react'

interface UserMenuProps {
  user: {
    email?: string
    display_name?: string | null
  }
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter()
  const t = useTranslations('nav')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Use display_name if available, otherwise use first part of email
  const displayName = user.display_name || user.email?.split('@')[0] || 'user'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="font-mono text-lg text-term-text hover:text-white transition-colors flex items-center gap-1 focus:outline-none"
      >
        {displayName}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 bg-[#0a0a0a] border border-term-border font-mono shadow-xl"
      >
        {/* Email label */}
        <div className="px-3 py-2 text-sm text-term-faint">
          {user.email}
        </div>

        <DropdownMenuSeparator className="bg-term-border" />

        {/* Meine Gebote */}
        <DropdownMenuItem asChild className="text-base text-term-text hover:bg-term-border hover:text-white focus:bg-term-border focus:text-white py-2.5 px-3">
          <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer">
            <Package className="h-5 w-5" />
            <span>{t('myBids')}</span>
          </Link>
        </DropdownMenuItem>

        {/* Einstellungen */}
        <DropdownMenuItem asChild className="text-base text-term-text hover:bg-term-border hover:text-white focus:bg-term-border focus:text-white py-2.5 px-3">
          <Link href="/settings" className="flex items-center gap-3 cursor-pointer">
            <Settings className="h-5 w-5" />
            <span>{t('settings')}</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-term-border" />

        {/* Abmelden */}
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-base text-term-text hover:bg-term-border hover:text-white focus:bg-term-border focus:text-white cursor-pointer py-2.5 px-3"
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span>{isLoggingOut ? t('loggingOut') : t('logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
