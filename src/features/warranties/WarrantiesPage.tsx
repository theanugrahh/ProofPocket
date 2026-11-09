import { useMemo, useState } from 'react'
import { usePurchases } from '@/hooks/use-data-hooks'
import { Badge, EmptyState } from '@/components/ui'
import { daysUntilWarrantyExpiry, formatDateIN, isWarrantyExpired } from '@/lib/utils'

type Filter = 'all' | 'active' | 'expiring' | 'expired'

export function WarrantiesPage() {
  const { purchases, loading } = usePurchases()
  const [filter, setFilter] = useState<Filter>('all')
  const [reminderDays, setReminderDays] = useState(30)

  const rows = useMemo(() => {
    return purchases
      .filter((p) => p.warrantyExpiryDate)
      .map((p) => {
        const expired = isWarrantyExpired(p.warrantyExpiryDate!)
        const days = daysUntilWarrantyExpiry(p.warrantyExpiryDate!)
        const status = expired ? 'expired' : days <= reminderDays ? 'expiring' : 'active'
        return { purchase: p, expired, days, status: status as 'active' | 'expiring' | 'expired' }
      })
      .filter((r) => filter === 'all' || r.status === filter)
      .sort((a, b) => +new Date(a.purchase.warrantyExpiryDate!) - +new Date(b.purchase.warrantyExpiryDate!))
  }, [purchases, filter, reminderDays])

  const counts = useMemo(() => ({
    active: purchases.filter((p) => p.warrantyExpiryDate && !isWarrantyExpired(p.warrantyExpiryDate) && daysUntilWarrantyExpiry(p.warrantyExpiryDate) > reminderDays).length,
    expiring: purchases.filter((p) => p.warrantyExpiryDate && !isWarrantyExpired(p.warrantyExpiryDate) && daysUntilWarrantyExpiry(p.warrantyExpiryDate) <= reminderDays).length,
    expired: purchases.filter((p) => p.warrantyExpiryDate && isWarrantyExpired(p.warrantyExpiryDate)).length,
  }), [purchases, reminderDays])

  return (
    <div className="max-w-[1126px] mx-auto px-4 sm:px-6 py-8 w-full">
      <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">Warranty Manager</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 mb-6">Expiry is calculated from the purchase date and warranty period. Add a warranty period on the Purchase Vault page.</p>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <label className="text-sm text-neutral-600 dark:text-neutral-300">Remind me <input type="number" min="0" max="365" value={reminderDays} onChange={(e) => setReminderDays(Number(e.target.value))} className="w-20 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" /> days before expiry</label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {([
          ['active', 'Active', counts.active, 'success'],
          ['expiring', 'Expiring soon', counts.expiring, 'warning'],
          ['expired', 'Expired', counts.expired, 'danger'],
        ] as const).map(([key, label, count, tone]) => (
          <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key} className={`text-left bg-white dark:bg-neutral-900 border rounded-xl p-4 ${filter === key ? 'border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900' : 'border-neutral-200 dark:border-neutral-800'}`}>
            <Badge tone={tone}>{label}</Badge>
            <div className="text-2xl font-bold tabular-nums mt-2 text-neutral-900 dark:text-neutral-100">{count}</div>
          </button>
        ))}
      </div>
      <div className="mb-4"><button type="button" onClick={() => setFilter('all')} className="text-sm text-sky-600 hover:underline">Show all warranties</button></div>

      {loading ? <p className="py-10 text-center text-sm text-neutral-500">Loading warranties…</p> : rows.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <EmptyState title="No warranties in this view" body="Add a purchase with a warranty period (in months) to see expiry tracking here." />
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead><tr className="text-left text-xs text-neutral-500 border-b border-neutral-200 dark:border-neutral-800"><th className="px-4 py-3 font-medium">Product</th><th className="px-4 py-3 font-medium">Expires</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Warranty details</th></tr></thead>
              <tbody>
                {rows.map(({ purchase: p, days, status }) => (
                  <tr key={p.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                    <td className="px-4 py-3"><div className="font-medium">{p.productName}</div><div className="text-xs text-neutral-500">{p.brand} • purchased {formatDateIN(p.purchaseDate)}</div></td>
                    <td className="px-4 py-3">{formatDateIN(p.warrantyExpiryDate)}</td>
                    <td className="px-4 py-3"><Badge tone={status === 'expired' ? 'danger' : status === 'expiring' ? 'warning' : 'success'}>{status === 'expired' ? 'Expired' : status === 'expiring' ? `Expires in ${days} days` : 'Active'}</Badge></td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{p.warrantyDetails ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
