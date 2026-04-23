'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

type UserWithStats = {
  id: string
  email: string
  display_name: string | null
  is_admin: boolean
  created_at: string
  bid_count: number
  total_spent: number
}

export default function AdminUsersPage() {
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('admin.users')
  const tErrors = useTranslations('errors')

  const [users, setUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        toast.error(tErrors('admin.loadFailed'))
      } else {
        setUsers(data.users || [])
        setError(null)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
      const errorMsg = tErrors('admin.loadFailed')
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleAdmin(userId: string, currentIsAdmin: boolean) {
    setActionLoading(userId)
    setError(null)
    try {
      const res = await fetch('/api/admin/users/toggle-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isAdmin: !currentIsAdmin }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`Admin status updated successfully`)
        await loadUsers()
      } else {
        const errorMsg = data.error || tErrors('admin.actionFailed')
        setError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (error) {
      console.error('Failed to toggle admin:', error)
      const errorMsg = tErrors('admin.actionFailed')
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t('title')}
        </h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Signup Date</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead className="text-right">Bids</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.display_name || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell>
                      {user.is_admin ? (
                        <Badge variant="success">Admin</Badge>
                      ) : (
                        <Badge variant="outline">User</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{user.bid_count}</TableCell>
                    <TableCell className="text-right font-mono">
                      €{user.total_spent.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/${locale}/admin/transactions?user=${user.id}`}>
                          <Button size="sm" variant="ghost">
                            {t('viewBids')}
                          </Button>
                        </Link>
                        <Dialog>
                          <DialogTrigger>
                            <Button size="sm" variant="outline">
                              {t('toggleAdmin')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t('confirmToggleAdmin')}</DialogTitle>
                              <DialogDescription>
                                {user.is_admin
                                  ? `Remove admin privileges from ${user.email}?`
                                  : `Grant admin privileges to ${user.email}?`}
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                                disabled={actionLoading === user.id}
                                variant={user.is_admin ? 'destructive' : 'default'}
                              >
                                {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No users found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
