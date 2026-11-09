import JSZip from 'jszip'
import { db } from '@/lib/db'
import { blobToBase64, computeFileHash } from '@/lib/utils'
import { generateId } from '@/lib/utils'
import type { BackupMetadata } from '@/types'

export const BACKUP_VERSION = '1.0.0'

export interface BackupPayload {
  version: string
  createdAt: string
  purchases: unknown[]
  complaints: unknown[]
  timelineEntries: unknown[]
  reminders: unknown[]
  settings: unknown[]
  attachments: { id: string; fileName: string; mimeType: string; size: number; hash: string; complaintId: string | null; purchaseId: string | null; timelineEntryId: string | null; createdAt: string; updatedAt: string; base64: string }[]
  manifest: { table: string; count: number; checksum: string }[]
}

export async function buildBackupPayload(): Promise<BackupPayload> {
  const [purchases, complaints, timelineEntries, reminders, settings, attachments] = await Promise.all([
    db.purchases.toArray(), db.complaints.toArray(), db.timelineEntries.toArray(), db.reminders.toArray(), db.settings.toArray(), db.attachments.toArray(),
  ])
  const attachData = []
  for (const a of attachments) {
    attachData.push({ id: a.id, fileName: a.fileName, mimeType: a.mimeType, size: a.size, hash: a.hash, complaintId: a.complaintId, purchaseId: a.purchaseId, timelineEntryId: a.timelineEntryId, createdAt: a.createdAt, updatedAt: a.updatedAt, base64: await blobToBase64(a.data) })
  }
  const tables: Record<string, unknown[]> = { purchases, complaints, timelineEntries, reminders, settings }
  const manifest = []
  for (const [table, rows] of Object.entries(tables)) {
    const checksum = await computeFileHash(new TextEncoder().encode(JSON.stringify(rows)))
    manifest.push({ table, count: rows.length, checksum })
  }
  return { version: BACKUP_VERSION, createdAt: new Date().toISOString(), purchases, complaints, timelineEntries, reminders, settings, attachments: attachData, manifest }
}

export async function createZipBackup(): Promise<{ blob: Blob; filename: string; metadata: BackupMetadata }> {
  const payload = await buildBackupPayload()
  const zip = new JSZip()
  zip.file('backup.json', JSON.stringify(payload, null, 2))
  zip.file('manifest.json', JSON.stringify({ version: BACKUP_VERSION, createdAt: payload.createdAt, manifest: payload.manifest }, null, 2))
  zip.file('README.txt', `ProofPocket backup v${BACKUP_VERSION}\nCreated: ${payload.createdAt}\nRestore via Settings > Backup & Restore.`)
  const blob = await zip.generateAsync({ type: 'blob' })
  const filename = `proofpocket-backup-${new Date().toISOString().slice(0, 10)}.zip`
  const checksum = await computeFileHash(new Uint8Array(await blob.arrayBuffer()))
  const meta: BackupMetadata = { id: generateId(), createdAt: new Date().toISOString(), format: 'json', scope: 'all', filename, size: blob.size, checksum, version: BACKUP_VERSION, recordCount: payload.purchases.length + payload.complaints.length + payload.timelineEntries.length + payload.reminders.length + payload.attachments.length }
  await db.backupMetadata.add(meta)
  return { blob, filename, metadata: meta }
}

export async function createJsonBackup(): Promise<{ blob: Blob; filename: string }> {
  const payload = await buildBackupPayload()
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  return { blob, filename: `proofpocket-backup-${new Date().toISOString().slice(0, 10)}.json` }
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n')
}

export async function exportPurchasesCsv(): Promise<{ blob: Blob; filename: string }> {
  const rows = await db.purchases.toArray() as unknown as Record<string, unknown>[]
  return { blob: new Blob([toCsv(rows)], { type: 'text/csv' }), filename: 'proofpocket-purchases.csv' }
}
export async function exportComplaintsCsv(): Promise<{ blob: Blob; filename: string }> {
  const rows = await db.complaints.toArray() as unknown as Record<string, unknown>[]
  return { blob: new Blob([toCsv(rows)], { type: 'text/csv' }), filename: 'proofpocket-complaints.csv' }
}

export function validateBackupPayload(data: unknown): string | null {
  if (!data || typeof data !== 'object') return 'Invalid backup: expected a JSON object.'
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.purchases) || !Array.isArray(d.complaints)) return 'Invalid backup: missing purchases/complaints arrays.'
  if (typeof d.version !== 'string') return 'Invalid backup: missing version.'
  for (const p of d.purchases as Record<string, unknown>[]) {
    if (typeof p.id !== 'string' || typeof p.productName !== 'string') return 'Invalid backup: malformed purchase record.'
  }
  for (const c of d.complaints as Record<string, unknown>[]) {
    if (typeof c.id !== 'string' || typeof c.companyName !== 'string') return 'Invalid backup: malformed complaint record.'
  }
  return null
}

export async function restoreFromPayload(payload: BackupPayload, strategy: 'merge' | 'replace'): Promise<void> {
  const err = validateBackupPayload(payload)
  if (err) throw new Error(err)
  const purchaseIds = new Set((payload.purchases as { id: string }[]).map((p) => p.id))
  const complaintIds = new Set((payload.complaints as { id: string }[]).map((c) => c.id))
  for (const c of payload.complaints as { purchaseId?: string | null }[]) {
    if (c.purchaseId && !purchaseIds.has(c.purchaseId)) c.purchaseId = null
  }
  await db.transaction('rw', [db.purchases, db.complaints, db.timelineEntries, db.reminders, db.attachments, db.settings], async () => {
    if (strategy === 'replace') {
      await db.purchases.clear(); await db.complaints.clear(); await db.timelineEntries.clear(); await db.reminders.clear(); await db.attachments.clear()
    }
    if (payload.purchases.length) await db.purchases.bulkPut(payload.purchases as never[])
    if (payload.complaints.length) await db.complaints.bulkPut(payload.complaints as never[])
    if (payload.timelineEntries.length) await db.timelineEntries.bulkPut(payload.timelineEntries as never[])
    if (payload.reminders.length) await db.reminders.bulkPut(payload.reminders as never[])
    if (payload.settings.length) await db.settings.bulkPut(payload.settings as never[])
    for (const a of payload.attachments) {
      if (a.complaintId && !complaintIds.has(a.complaintId)) continue
      const bin = atob(a.base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const blob = new Blob([bytes], { type: a.mimeType })
      await db.attachments.put({ id: a.id, createdAt: a.createdAt, updatedAt: a.updatedAt, complaintId: a.complaintId, purchaseId: a.purchaseId, timelineEntryId: a.timelineEntryId, fileName: a.fileName, originalName: a.fileName, mimeType: a.mimeType, size: a.size, hash: a.hash, data: blob } as never)
    }
  })
}

export async function restoreFromZip(file: File, strategy: 'merge' | 'replace'): Promise<void> {
  const zip = await JSZip.loadAsync(file)
  const entry = zip.file('backup.json')
  if (!entry) throw new Error('Corrupted backup: backup.json not found in ZIP.')
  const text = await entry.async('string')
  let payload: unknown
  try { payload = JSON.parse(text) } catch { throw new Error('Corrupted backup: backup.json is not valid JSON.') }
  const err = validateBackupPayload(payload)
  if (err) throw new Error(err)
  await restoreFromPayload(payload as BackupPayload, strategy)
}

export async function restoreFromJson(file: File, strategy: 'merge' | 'replace'): Promise<void> {
  const text = await file.text()
  let payload: unknown
  try { payload = JSON.parse(text) } catch { throw new Error('Invalid JSON backup file.') }
  await restoreFromPayload(payload as BackupPayload, strategy)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
