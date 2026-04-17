import { requireAdmin } from '@/lib/admin/auth'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { LayoutDashboardIcon, AlertTriangleIcon, ImageIcon, CreditCardIcon, UsersIcon } from 'lucide-react'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.overview' });

  return {
    title: t('title'),
    description: 'Admin management for The Last Billboard',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  await requireAdmin(locale)
  const t = await getTranslations({ locale, namespace: 'admin.nav' })

  const navigation = [
    {
      name: t('overview'),
      href: `/${locale}/admin`,
      icon: LayoutDashboardIcon,
    },
    {
      name: t('reports'),
      href: `/${locale}/admin/reports`,
      icon: AlertTriangleIcon,
    },
    {
      name: t('slots'),
      href: `/${locale}/admin/slots`,
      icon: ImageIcon,
    },
    {
      name: t('transactions'),
      href: `/${locale}/admin/transactions`,
      icon: CreditCardIcon,
    },
    {
      name: t('users'),
      href: `/${locale}/admin/users`,
      icon: UsersIcon,
    },
  ]

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-zinc-200 bg-white">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-zinc-200 px-6 py-4">
            <Link href={`/${locale}`} className="text-lg font-bold text-zinc-900">
              The Last Billboard
            </Link>
            <p className="mt-1 text-sm text-zinc-600">Admin Dashboard</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <Icon className="size-5 text-zinc-500 transition-colors group-hover:text-zinc-900" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-zinc-200 px-6 py-4">
            <Link
              href={`/${locale}`}
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              Back to Billboard
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1">
        <div className="mx-auto max-w-7xl px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
