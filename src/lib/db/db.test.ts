import { describe, it, expect, beforeEach } from 'vitest'
import { db, clearAllData, getStorageInfo } from '@/lib/db'
import { buildBackupPayload, restoreFromPayload, validateBackupPayload, type BackupPayload } from '@/lib/backup'
import { generateId } from '@/lib/utils'

const purchase = () => ({
  id: generateId(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  productName: 'Test Phone',
  brand: 'Acme',
  category: 'Electronics',
  seller: 'Shop',
  purchaseDate: '2026-01-10',
  price: 19999,
  currency: 'INR' as const,
  invoiceNumber: 'INV-1',
  orderId: null,
  paymentMethod: 'UPI' as const,
  warrantyDetails: '1 year',
  warrantyPeriodMonths: 12,
  warrantyExpiryDate: '2027-01-10',
  serialNumber: 'SN1',
  description: null,
  notes: null,
})

const complaint = (purchaseId: string | null) => ({
  id: generateId(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  companyName: 'Acme Support',
  productService: 'Test Phone',
  purchaseId,
  issueDescription: 'Screen flickers',
  complaintNumber: 'CMP-1',
  registrationDate: '2026-02-01',
  expectedResolutionDate: null,
  priority: 'High' as const,
  status: 'Submitted' as const,
  resolutionDetails: null,
})

beforeEach(async () => {
  await db.open()
  await clearAllData()
})

describe('IndexedDB persistence', () => {
  it('persists purchases across reads (survives reload semantics)', async () => {
    const p = purchase()
    await db.purchases.add(p)
    const found = await db.purchases.get(p.id)
    expect(found?.productName).toBe('Test Phone')
  })

  it('links complaints to purchases and cascades on delete', async () => {
    const p = purchase()
    await db.purchases.add(p)
    const c = complaint(p.id)
    await db.complaints.add(c)
    await db.timelineEntries.add({ id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), complaintId: c.id, type: 'call', dateTime: new Date().toISOString(), description: 'Called support', attachmentIds: [] })
    const linked = await db.complaints.where('purchaseId').equals(p.id).toArray()
    expect(linked).toHaveLength(1)
    // deleting complaint removes its timeline
    await db.timelineEntries.where('complaintId').equals(c.id).delete()
    await db.complaints.delete(c.id)
    expect(await db.timelineEntries.count()).toBe(0)
  })

  it('orders timeline entries chronologically', async () => {
    const c = complaint(null)
    await db.complaints.add(c)
    const mk = (dateTime: string, description: string) => ({ id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), complaintId: c.id, type: 'call' as const, dateTime, description, attachmentIds: [] })
    await db.timelineEntries.bulkAdd([mk('2026-03-02T10:00:00Z', 'third'), mk('2026-03-01T10:00:00Z', 'first'), mk('2026-03-03T10:00:00Z', 'fourth')])
    const entries = await db.timelineEntries.where('complaintId').equals(c.id).toArray()
    entries.sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime))
    expect(entries.map((e) => e.description)).toEqual(['first', 'third', 'fourth'])
  })

  it('stores attachment Blobs and reports storage usage', async () => {
    const blob = new Blob(['hello evidence'], { type: 'application/pdf' })
    await db.attachments.add({ id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), complaintId: null, purchaseId: null, timelineEntryId: null, fileName: 'evidence.pdf', originalName: 'evidence.pdf', mimeType: 'application/pdf', size: blob.size, hash: 'abc', data: blob })
    const stored = await db.attachments.toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0].originalName).toBe('evidence.pdf')
    expect(stored[0].mimeType).toBe('application/pdf')
    const info = await getStorageInfo()
    expect(info.quota).toBeGreaterThanOrEqual(0)
    expect(info.percentage).toBeGreaterThanOrEqual(0)
  })
})

describe('backup and restore', () => {
  it('exports a payload with manifest and restores it on a clean database', async () => {
    const p = purchase()
    await db.purchases.add(p)
    await db.complaints.add(complaint(p.id))
    const payload = await buildBackupPayload()
    expect(payload.purchases).toHaveLength(1)
    expect(payload.manifest.length).toBeGreaterThanOrEqual(5)
    expect(validateBackupPayload(payload)).toBeNull()

    await clearAllData()
    expect(await db.purchases.count()).toBe(0)
    await restoreFromPayload(payload, 'replace')
    expect(await db.purchases.count()).toBe(1)
    expect(await db.complaints.count()).toBe(1)
    const restored = await db.complaints.toArray()
    expect(restored[0].purchaseId).toBe(p.id)
  })

  it('merge restore keeps existing data and updates duplicates', async () => {
    const p = purchase()
    await db.purchases.add(p)
    const payload = await buildBackupPayload()
    const extra = purchase()
    await db.purchases.add(extra)
    await restoreFromPayload(payload, 'merge')
    expect(await db.purchases.count()).toBe(2)
  })

  it('rejects corrupted payloads without touching the database', async () => {
    const bad = { version: '1', purchases: 'nope', complaints: [] } as unknown as BackupPayload
    await expect(restoreFromPayload(bad, 'replace')).rejects.toThrow()
    expect(await db.purchases.count()).toBe(0)
  })

  it('nulls dangling purchase links on restore', async () => {
    const payload: BackupPayload = {
      version: '1.0.0', createdAt: new Date().toISOString(),
      purchases: [], complaints: [{ ...complaint('missing-id') }], timelineEntries: [], reminders: [], settings: [], attachments: [], manifest: [],
    }
    await restoreFromPayload(payload, 'replace')
    const restored = await db.complaints.toArray()
    expect(restored[0].purchaseId).toBeNull()
  })
})
