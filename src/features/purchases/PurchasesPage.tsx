import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { usePurchases, type PurchaseFormValues } from '@/hooks/use-data-hooks'
import { Button } from '@/components/button/Button'
import { Modal, Field, EmptyState, inputClass } from '@/components/ui'
import { formatINR, formatDateIN, validPaymentMethods } from '@/lib/utils'
import { db } from '@/lib/db'
import { generateId, validateFile, hashBlob, safeFileName } from '@/lib/utils'

const schema = z.object({
  productName: z.string().min(1, 'Required').max(120),
  brand: z.string().min(1, 'Required').max(80),
  category: z.string().min(1, 'Required').max(80),
  seller: z.string().min(1, 'Required').max(120),
  purchaseDate: z.string().min(1, 'Required'),
  price: z.coerce.number().min(0, 'Must be 0 or more'),
  invoiceNumber: z.string().max(60).nullable().optional(),
  orderId: z.string().max(60).nullable().optional(),
  paymentMethod: z.enum(validPaymentMethods as [string, ...string[]]),
  warrantyDetails: z.string().max(500).nullable().optional(),
  warrantyPeriodMonths: z.coerce.number().nullable().optional(),
  serialNumber: z.string().max(80).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

const defaults: PurchaseFormValues = { productName: '', brand: '', category: '', seller: '', purchaseDate: new Date().toISOString().slice(0, 10), price: 0, invoiceNumber: null, orderId: null, paymentMethod: 'UPI', warrantyDetails: null, warrantyPeriodMonths: null, serialNumber: null, description: null, notes: null }

export function PurchasesPage() {
  const { purchases, loading, addPurchase, updatePurchase, deletePurchase } = usePurchases()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'price-desc' | 'price-asc' | 'name'>('newest')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [fileError, setFileError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) as never, defaultValues: defaults as never })
  const { register, handleSubmit, reset, formState } = form

  const categories = useMemo(() => [...new Set(purchases.map((p) => p.category))], [purchases])
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let rows = purchases.filter((p) => (categoryFilter === 'all' || p.category === categoryFilter) && (!needle || [p.productName, p.brand, p.seller, p.category].join(' ').toLowerCase().includes(needle)))
    rows = [...rows].sort((a, b) => sort === 'newest' ? +new Date(b.purchaseDate) - +new Date(a.purchaseDate) : sort === 'oldest' ? +new Date(a.purchaseDate) - +new Date(b.purchaseDate) : sort === 'price-desc' ? b.price - a.price : sort === 'price-asc' ? a.price - b.price : a.productName.localeCompare(b.productName))
    return rows
  }, [purchases, q, sort, categoryFilter])

  const openAdd = () => { setEditing(null); reset(defaults); setFileError(null); setOpen(true) }
  const openEdit = (id: string) => {
    const p = purchases.find((x) => x.id === id)
    if (!p) return
    setEditing(id)
    reset({ productName: p.productName, brand: p.brand, category: p.category, seller: p.seller, purchaseDate: p.purchaseDate, price: p.price, invoiceNumber: p.invoiceNumber, orderId: p.orderId, paymentMethod: p.paymentMethod, warrantyDetails: p.warrantyDetails, warrantyPeriodMonths: p.warrantyPeriodMonths, serialNumber: p.serialNumber, description: p.description, notes: p.notes })
    setOpen(true)
  }

  const onSubmit = async (valuesRaw: z.infer<typeof schema>) => {
    const values = valuesRaw as unknown as PurchaseFormValues
    try {
      const fileInput = document.getElementById('purchase-attachment') as HTMLInputElement | null
      const file = fileInput?.files?.[0]
      if (file) {
        const err = validateFile(file)
        if (err) { setFileError(err); return }
      }
      if (editing) await updatePurchase(editing, values)
      else await addPurchase(values)
      if (file) {
        const id = editing ?? (await db.purchases.toArray()).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0]?.id
        if (id) {
          await db.attachments.add({ id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), complaintId: null, purchaseId: id, timelineEntryId: null, fileName: safeFileName(file.name), originalName: file.name, mimeType: file.type, size: file.size, hash: await hashBlob(file), data: file })
        }
      }
      setOpen(false)
    } catch (e) {
      setFileError(e instanceof Error ? e.message : 'Could not save purchase.')
    }
  }

  return (
    <div className="max-w-[1126px] mx-auto px-4 sm:px-6 py-8 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">Purchase Vault</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Invoices, order IDs, payment methods and warranty details — stored only on this device.</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add purchase</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, brand, seller, category…" className={`${inputClass} pl-9`} aria-label="Search purchases" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputClass} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={inputClass} aria-label="Sort purchases">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="price-desc">Price: high to low</option>
          <option value="price-asc">Price: low to high</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {loading ? <p className="py-10 text-center text-sm text-neutral-500">Loading purchases…</p> : visible.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <EmptyState title={purchases.length === 0 ? 'No purchases yet' : 'No matches'} body={purchases.length === 0 ? 'Add your first purchase to track invoices, warranties and evidence.' : 'Try a different search or filter.'} action={purchases.length === 0 ? <Button onClick={openAdd}>Add purchase</Button> : undefined} />
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead><tr className="text-left text-xs text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                <th className="px-4 py-3 font-medium">Product</th><th className="px-4 py-3 font-medium">Seller</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium text-right">Price</th><th className="px-4 py-3 font-medium">Warranty</th><th className="px-4 py-3" />
              </tr></thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                    <td className="px-4 py-3"><div className="font-medium text-neutral-900 dark:text-neutral-100">{p.productName}</div><div className="text-xs text-neutral-500">{p.brand} • {p.category}{p.invoiceNumber ? ` • Invoice ${p.invoiceNumber}` : ''}</div></td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{p.seller}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{formatDateIN(p.purchaseDate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-900 dark:text-neutral-100">{formatINR(p.price)}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{p.warrantyExpiryDate ? formatDateIN(p.warrantyExpiryDate) : p.warrantyDetails ?? '—'}</td>
                    <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                      <button type="button" aria-label={`Edit ${p.productName}`} onClick={() => openEdit(p.id)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 min-h-[40px] min-w-[40px] flex items-center justify-center"><Pencil className="h-4 w-4" /></button>
                      <button type="button" aria-label={`Delete ${p.productName}`} onClick={async () => { if (window.confirm(`Delete “${p.productName}” and its attachments? This cannot be undone.`)) await deletePurchase(p.id) }} className="p-2 rounded-lg hover:bg-red-50 text-red-600 min-h-[40px] min-w-[40px] flex items-center justify-center"><Trash2 className="h-4 w-4" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} title={editing ? 'Edit purchase' : 'Add purchase'} onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Product name *" error={formState.errors.productName?.message}><input {...register('productName')} className={inputClass} placeholder="e.g. Samsung Galaxy M34" /></Field>
            <Field label="Brand *" error={formState.errors.brand?.message}><input {...register('brand')} className={inputClass} placeholder="e.g. Samsung" /></Field>
            <Field label="Category *" error={formState.errors.category?.message}><input {...register('category')} className={inputClass} placeholder="e.g. Electronics" /></Field>
            <Field label="Seller *" error={formState.errors.seller?.message}><input {...register('seller')} className={inputClass} placeholder="e.g. Amazon India" /></Field>
            <Field label="Purchase date *" error={formState.errors.purchaseDate?.message}><input type="date" {...register('purchaseDate')} className={inputClass} /></Field>
            <Field label="Price (INR) *" error={formState.errors.price?.message}><input type="number" min="0" step="1" {...register('price')} className={inputClass} /></Field>
            <Field label="Invoice number"><input {...register('invoiceNumber')} className={inputClass} /></Field>
            <Field label="Order ID"><input {...register('orderId')} className={inputClass} /></Field>
            <Field label="Payment method"><select {...register('paymentMethod')} className={inputClass}>{validPaymentMethods.map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>
            <Field label="Warranty period (months)"><input type="number" min="0" {...register('warrantyPeriodMonths')} className={inputClass} placeholder="e.g. 12" /></Field>
            <Field label="Serial number"><input {...register('serialNumber')} className={inputClass} /></Field>
            <Field label="Warranty details"><input {...register('warrantyDetails')} className={inputClass} placeholder="e.g. 1-year manufacturer warranty" /></Field>
          </div>
          <Field label="Description"><textarea {...register('description')} className={inputClass} rows={2} /></Field>
          <Field label="Notes"><textarea {...register('notes')} className={inputClass} rows={2} /></Field>
          <Field label="Invoice / receipt attachment (optional, PDF or image, max 50 MB)">
            <input id="purchase-attachment" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt" className={inputClass} />
            {fileError && <span className="block text-xs text-red-600 mt-1" role="alert">{fileError}</span>}
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={formState.isSubmitting}>{editing ? 'Save changes' : 'Add purchase'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
