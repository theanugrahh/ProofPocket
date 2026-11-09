import { useState } from 'react'
import { Upload, Download, Trash2 } from 'lucide-react'
import { useAttachments, usePurchases, useComplaints } from '@/hooks/use-data-hooks'
import { db } from '@/lib/db'
import { generateId, validateFile, hashBlob, safeFileName, formatDateIN } from '@/lib/utils'
import { EmptyState, Badge } from '@/components/ui'

export function EvidencePage() {
  const { attachments, remove, reload } = useAttachments()
  const { purchases } = usePurchases()
  const { complaints } = useComplaints()
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'purchase' | 'complaint' | 'timeline'>('all')

  const visible = attachments.filter((a) => filter === 'all' ? true : filter === 'purchase' ? !!a.purchaseId : filter === 'complaint' ? !!a.complaintId && !a.timelineEntryId : !!a.timelineEntryId)

  const labelFor = (a: (typeof attachments)[number]) => {
    const p = purchases.find((x) => x.id === a.purchaseId)
    const c = complaints.find((x) => x.id === a.complaintId)
    if (p) return `Purchase: ${p.productName}`
    if (c) return `Complaint: ${c.companyName}`
    return 'Unlinked'
  }

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      const err = validateFile(file)
      if (err) { setError(err); continue }
      try {
        await db.attachments.add({ id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), complaintId: null, purchaseId: null, timelineEntryId: null, fileName: safeFileName(file.name), originalName: file.name, mimeType: file.type, size: file.size, hash: await hashBlob(file), data: file })
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not store file.') }
    }
    await reload()
  }

  const download = (a: (typeof attachments)[number]) => {
    const url = URL.createObjectURL(a.data)
    const el = document.createElement('a'); el.href = url; el.download = a.originalName; el.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="max-w-[1126px] mx-auto px-4 sm:px-6 py-8 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div><h1 className="text-2xl sm:text-3xl font-bold">Evidence Locker</h1><p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Files are stored as Blobs in IndexedDB on this device. Accepted: PDF, images, text — max 50 MB each.</p></div>
        <label className="inline-flex items-center gap-2 rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium cursor-pointer hover:bg-sky-700 min-h-[40px]"><Upload className="h-4 w-4" /> Upload files<input type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt" onChange={(e) => void onFiles(e.target.files)} /></label>
      </div>
      {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'purchase', 'complaint', 'timeline'] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={`px-3 py-1.5 rounded-full text-xs font-medium min-h-[36px] ${filter === f ? 'bg-sky-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'}`}>{f === 'all' ? 'All' : f === 'purchase' ? 'Purchases' : f === 'complaint' ? 'Complaints' : 'Timeline'}</button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl"><EmptyState title="No evidence yet" body="Upload receipts, invoices, screenshots or supporting documents. You can also attach files from a complaint timeline." /></div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]">
            <thead><tr className="text-left text-xs text-neutral-500 border-b border-neutral-200 dark:border-neutral-800"><th className="px-4 py-3 font-medium">File</th><th className="px-4 py-3 font-medium">Linked to</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Size</th><th className="px-4 py-3 font-medium">Added</th><th className="px-4 py-3" /></tr></thead>
            <tbody>{visible.map((a) => (
              <tr key={a.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <td className="px-4 py-3 font-medium">{a.originalName}</td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{labelFor(a)}</td>
                <td className="px-4 py-3"><Badge>{a.mimeType || 'file'}</Badge></td>
                <td className="px-4 py-3 tabular-nums">{(a.size / 1024).toFixed(1)} KB</td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{formatDateIN(a.createdAt)}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1">
                  <button type="button" aria-label={`Download ${a.originalName}`} onClick={() => download(a)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 min-h-[40px] min-w-[40px] flex items-center justify-center"><Download className="h-4 w-4" /></button>
                  <button type="button" aria-label={`Delete ${a.originalName}`} onClick={async () => { if (window.confirm(`Delete ${a.originalName}?`)) await remove(a.id) }} className="p-2 rounded-lg hover:bg-red-50 text-red-600 min-h-[40px] min-w-[40px] flex items-center justify-center"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </div>
  )
}
