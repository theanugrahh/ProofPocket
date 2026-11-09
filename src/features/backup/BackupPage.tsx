import { useEffect, useState } from 'react'
import { Download, Upload, FolderOpen } from 'lucide-react'
import { Button } from '@/components/button/Button'
import { db, getStorageInfo, formatBytes } from '@/lib/db'
import { createZipBackup, createJsonBackup, exportPurchasesCsv, exportComplaintsCsv, restoreFromZip, restoreFromJson, downloadBlob } from '@/lib/backup'
import { formatDateIN } from '@/lib/utils'
import type { BackupMetadata } from '@/types'

export function BackupPage() {
  const [history, setHistory] = useState<BackupMetadata[]>([])
  const [storage, setStorage] = useState<{ used: number; quota: number; percentage: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<'merge' | 'replace'>('merge')
  const [busy, setBusy] = useState(false)

  const load = async () => { setHistory(await db.backupMetadata.toArray()); setStorage(await getStorageInfo()) }
  useEffect(() => { void load() }, [])

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true); setError(null); setMessage(null)
    try { await fn(); setMessage(ok); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'Operation failed.') }
    finally { setBusy(false) }
  }

  const saveWithPicker = async (blob: Blob, filename: string) => {
    const picker = (window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<{ createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }> }).showSaveFilePicker
    if (picker) {
      try {
        const handle = await picker({ suggestedName: filename })
        const writable = await handle.createWritable()
        await writable.write(blob); await writable.close()
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
      }
    }
    downloadBlob(blob, filename)
  }

  return (
    <div className="max-w-[1126px] mx-auto px-4 sm:px-6 py-8 w-full">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Backup &amp; Restore</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Your data lives in this browser&apos;s IndexedDB. Export regularly — clearing browser data can erase it. Backups contain records, attachment files, a manifest and SHA-256 checksums.</p>

      {message && <p className="mb-4 text-sm text-emerald-700 dark:text-emerald-300" role="status">{message}</p>}
      {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}

      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-3">Storage</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">{storage ? `${formatBytes(storage.used)} used of ${formatBytes(storage.quota)} (${storage.percentage.toFixed(1)}%)` : 'Loading…'}</p>
        <p className="text-xs text-neutral-500 mt-2">ProofPocket requests persistent storage where supported, but browsers may still clear IndexedDB. Backups are the reliable copy.</p>
      </section>

      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-3">Export</h2>
        <div className="flex flex-wrap gap-2">
          <Button loading={busy} onClick={() => void run(async () => { const { blob, filename } = await createZipBackup(); await saveWithPicker(blob, filename) }, 'Complete ZIP backup downloaded.')}> <Download className="h-4 w-4" /> Complete ZIP backup</Button>
          <Button variant="outline" loading={busy} onClick={() => void run(async () => { const { blob, filename } = await createJsonBackup(); await saveWithPicker(blob, filename) }, 'JSON backup downloaded.')}>JSON backup</Button>
          <Button variant="outline" loading={busy} onClick={() => void run(async () => { const { blob, filename } = await exportPurchasesCsv(); downloadBlob(blob, filename) }, 'Purchases CSV downloaded.')}>Purchases CSV</Button>
          <Button variant="outline" loading={busy} onClick={() => void run(async () => { const { blob, filename } = await exportComplaintsCsv(); downloadBlob(blob, filename) }, 'Complaints CSV downloaded.')}>Complaints CSV</Button>
          <Button variant="ghost" onClick={() => void run(async () => { const { blob, filename } = await createZipBackup(); await saveWithPicker(blob, filename) }, 'Saved to chosen folder.')}><FolderOpen className="h-4 w-4" /> Save ZIP to a folder…</Button>
        </div>
      </section>

      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-3">Restore</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3"><strong>Merge</strong> adds backup records, updating any with the same ID. <strong>Replace</strong> wipes current purchases, complaints, timeline, reminders and attachments first. Replace is destructive — export a fresh backup before using it.</p>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <label className="text-sm">Strategy <select value={strategy} onChange={(e) => setStrategy(e.target.value as 'merge' | 'replace')} className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm"><option value="merge">Merge</option><option value="replace">Replace (destructive)</option></select></label>
          <label className="inline-flex items-center gap-2 rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium cursor-pointer hover:bg-sky-700 min-h-[40px]"><Upload className="h-4 w-4" /> Restore ZIP<input type="file" accept=".zip" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void run(() => restoreFromZip(f, strategy), `Restored (${strategy}).`) }} /></label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm font-medium cursor-pointer min-h-[40px]"><Upload className="h-4 w-4" /> Restore JSON<input type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void run(() => restoreFromJson(f, strategy), `Restored (${strategy}).`) }} /></label>
        </div>
        <p className="text-xs text-neutral-500">Corrupted files, malformed ZIPs and invalid JSON are rejected with an error — nothing is overwritten silently.</p>
      </section>

      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
        <h2 className="font-semibold mb-3">Backup history</h2>
        {history.length === 0 ? <p className="text-sm text-neutral-500">No backups created yet on this device.</p> : (
          <ul className="space-y-2 text-sm">
            {history.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).map((b) => (
              <li key={b.id} className="flex flex-wrap justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2 last:border-0">
                <span>{b.filename}</span><span className="text-neutral-500">{formatDateIN(b.createdAt)} • {formatBytes(b.size)} • {b.recordCount} records</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
