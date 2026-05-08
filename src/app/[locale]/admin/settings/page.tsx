import { requireAdmin } from '@/lib/admin/auth'
import { getTranslations } from 'next-intl/server'
import { getFreezeDate } from '@/lib/freeze/getFreezeDate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FreezeDateForm } from '@/components/admin/FreezeDateForm'

interface AuditRow {
  id: string
  created_at: string
  action: string
  details: { previous?: string | null; next?: string | null } | null
  profiles: { email: string } | null
}

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const { supabase } = await requireAdmin(locale)
  const t = await getTranslations({ locale, namespace: 'admin.settings' })

  const freezeDate = await getFreezeDate()

  // Fetch recent audit entries for app settings (most recent 10).
  const { data: auditData } = await supabase
    .from('admin_audit_log')
    .select('id, created_at, action, details, profiles(email)')
    .eq('target_type', 'app_settings')
    .order('created_at', { ascending: false })
    .limit(10)

  const auditEntries = (auditData ?? []) as unknown as AuditRow[]
  const fmtUtc = (iso: string | null | undefined) =>
    iso ? new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—'
  // Format for <input type="datetime-local"> — must be local-naive YYYY-MM-DDTHH:mm
  const isoForInput = (() => {
    const d = freezeDate
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(
      d.getUTCHours()
    )}:${pad(d.getUTCMinutes())}`
  })()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t('freezeDate.title')}</CardTitle>
          <CardDescription>{t('freezeDate.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <FreezeDateForm
            initialIsoUtc={freezeDate.toISOString()}
            initialInputValue={isoForInput}
            labels={{
              field: t('freezeDate.field'),
              hint: t('freezeDate.hint'),
              save: t('freezeDate.save'),
              saving: t('freezeDate.saving'),
              success: t('freezeDate.success'),
              warningEarlier: t('freezeDate.warningEarlier'),
              warningPast: t('freezeDate.warningPast'),
            }}
          />
        </CardContent>
      </Card>

      <Card className="mt-8 max-w-4xl">
        <CardHeader>
          <CardTitle>{t('audit.title')}</CardTitle>
          <CardDescription>{t('audit.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {auditEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('audit.empty')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('audit.when')}</TableHead>
                  <TableHead>{t('audit.who')}</TableHead>
                  <TableHead>{t('audit.action')}</TableHead>
                  <TableHead>{t('audit.previous')}</TableHead>
                  <TableHead>{t('audit.next')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditEntries.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString(locale)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.profiles?.email ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {row.action}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {fmtUtc(row.details?.previous)}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {fmtUtc(row.details?.next)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'admin.settings' })
  return { title: t('title') }
}
