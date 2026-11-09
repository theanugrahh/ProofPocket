import { useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { usePurchases, useComplaints } from '@/hooks/use-data-hooks'
import { formatINR } from '@/lib/utils'

const COLORS = ['#0284c7', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0d9488', '#525252', '#2563eb']

export function AnalyticsPage() {
  const { purchases } = usePurchases()
  const { complaints } = useComplaints()

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    purchases.forEach((p) => map.set(p.category, (map.get(p.category) ?? 0) + p.price))
    return [...map.entries()].map(([name, value]) => ({ name, value }))
  }, [purchases])

  const byStatus = useMemo(() => {
    const map = new Map<string, number>()
    complaints.forEach((c) => map.set(c.status, (map.get(c.status) ?? 0) + 1))
    return [...map.entries()].map(([name, value]) => ({ name, value }))
  }, [complaints])

  const totalSpend = purchases.reduce((s, p) => s + p.price, 0)

  return (
    <div className="max-w-[1126px] mx-auto px-4 sm:px-6 py-8 w-full">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Analytics</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Computed locally from your records. Nothing is sent anywhere.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4"><div className="text-xs text-neutral-500">Total spend</div><div className="text-2xl font-bold tabular-nums">{formatINR(totalSpend)}</div></div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4"><div className="text-xs text-neutral-500">Purchases</div><div className="text-2xl font-bold tabular-nums">{purchases.length}</div></div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4"><div className="text-xs text-neutral-500">Complaints</div><div className="text-2xl font-bold tabular-nums">{complaints.length}</div></div>
      </div>

      {purchases.length === 0 && complaints.length === 0 ? (
        <p className="text-sm text-neutral-500">Add purchases and complaints to see charts here.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <h2 className="font-semibold mb-3">Spend by category (INR)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatINR(Number(v))} />
                  <Bar dataKey="value" fill="#0284c7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <h2 className="font-semibold mb-3">Complaints by status</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={90} label>
                    {byStatus.map((_entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
