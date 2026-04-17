'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DownloadIcon, ExternalLinkIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

type TransactionWithDetails = {
  id: string
  created_at: string
  user_email: string
  type: 'bid' | 'refund'
  amount_eur: number
  commission_eur: number
  stripe_payment_intent_id: string | null
  status: 'pending' | 'completed' | 'failed' | 'refunded'
}

export default function AdminTransactionsPage() {
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('admin.transactions')

  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | 'bid' | 'refund'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed' | 'refunded'>('all')
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    loadTransactions()
  }, [])

  async function loadTransactions() {
    try {
      const res = await fetch('/api/admin/transactions')
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch (error) {
      console.error('Failed to load transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    setExportLoading(true)
    try {
      const res = await fetch('/api/admin/transactions/export')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to export transactions:', error)
    } finally {
      setExportLoading(false)
    }
  }

  const filteredTransactions = transactions
    .filter(t => typeFilter === 'all' || t.type === typeFilter)
    .filter(t => statusFilter === 'all' || t.status === statusFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-600">Loading transactions...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {t('title')}
          </h1>
        </div>
        <Button onClick={handleExport} disabled={exportLoading}>
          <DownloadIcon className="mr-2 size-4" />
          {t('export')}
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="flex gap-2">
          <span className="text-sm text-zinc-600">Type:</span>
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
          >
            All
          </Button>
          <Button
            variant={typeFilter === 'bid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('bid')}
          >
            Bid
          </Button>
          <Button
            variant={typeFilter === 'refund' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('refund')}
          >
            Refund
          </Button>
        </div>
        <div className="ml-4 flex gap-2">
          <span className="text-sm text-zinc-600">Status:</span>
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('completed')}
          >
            Completed
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Payment Intent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm text-zinc-600">
                      {new Date(transaction.created_at).toLocaleString(locale)}
                    </TableCell>
                    <TableCell className="text-sm">{transaction.user_email}</TableCell>
                    <TableCell>
                      <Badge variant={transaction.type === 'bid' ? 'default' : 'secondary'}>
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      €{transaction.amount_eur.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      €{transaction.commission_eur.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {transaction.stripe_payment_intent_id ? (
                        <a
                          href={`https://dashboard.stripe.com/payments/${transaction.stripe_payment_intent_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          {transaction.stripe_payment_intent_id.substring(0, 20)}...
                          <ExternalLinkIcon className="size-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-zinc-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.status === 'completed'
                            ? 'success'
                            : transaction.status === 'failed'
                            ? 'destructive'
                            : transaction.status === 'pending'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {transaction.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-12 text-center text-sm text-zinc-600">
              No transactions found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
