import { describe, it, expect, beforeEach } from 'vitest'
import { db, clearAllData, validateStorageSpace, handleQuotaError, formatBytes } from '@/lib/db'
import { createZipBackup, createJsonBackup, exportPurchasesCsv, exportComplaintsCsv, toCsv, restoreFromZip, restoreFromJson } from '@/lib/backup'
import { generateComplaintReport } from '@/lib/pdf'
import { generateId } from '@/lib/utils'

const purchase = () => ({
  id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  productName: 'Phone', brand: 'Acme', category: 'Electronics', seller: 'Shop', purchaseDate: '2026-01-10',
  price: 10000, currency: 'INR' as const, invoiceNumber: null, orderId: null, paymentMethod: 'UPI' as const,
  warrantyDetails: null, warrantyPeriodMonths: 12, warrantyExpiryDate: '2027-01-10', serialNumber: null, description: null, notes: null,
})

beforeEach(async () => { await db.open(); await clearAllData() })

describe('storage helpers', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes')
    expect(formatBytes(1024)).toContain('KB')
    expect(formatBytes(1024 * 1024)).toContain('MB')
  })
  it('validates storage space and throws on quota excess', async () => {
    const { canStore } = await validateStorageSpace(100)
    expect(typeof canStore).toBe('boolean')
    await expect(handleQuotaError(Number.MAX_SAFE_INTEGER)).rejects.toThrow(/quota/i)
  })
})

describe('csv export', () => {
  it('escapes commas and quotes', () => {
    const csv = toCsv([{ a: 'x, "y"', b: 1 } as unknown as Record<string, unknown>])
    expect(csv).toContain('"x, ""y"""')
    expect(csv.split('\n')).toHaveLength(2)
  })
  it('exports purchases and complaints csv', async () => {
    await db.purchases.add(purchase())
    const p = await exportPurchasesCsv()
    expect(p.filename.endsWith('.csv')).toBe(true)
    expect(await p.blob.text()).toContain('Phone')
    const c = await exportComplaintsCsv()
    expect(c.filename.endsWith('.csv')).toBe(true)
  })
})

describe('zip and json backup round-trip', () => {
  it('creates a zip backup with manifest and restores it', async () => {
    const p = purchase()
    await db.purchases.add(p)
    const { blob, metadata } = await createZipBackup()
    expect(metadata.filename.endsWith('.zip')).toBe(true)
    expect(metadata.checksum.length).toBeGreaterThan(10)
    const history = await db.backupMetadata.toArray()
    expect(history).toHaveLength(1)

    await clearAllData()
    const file = new File([blob], metadata.filename, { type: 'application/zip' })
    await restoreFromZip(file, 'replace')
    expect(await db.purchases.count()).toBe(1)
  })

  it('rejects malformed zips and invalid json backups', async () => {
    await expect(restoreFromZip(new File(['not a zip'], 'bad.zip'), 'replace')).rejects.toThrow()
    await expect(restoreFromJson(new File(['{oops'], 'bad.json', { type: 'application/json' }), 'replace')).rejects.toThrow(/JSON/i)
    await expect(restoreFromJson(new File(['{"hello":1}'], 'bad.json', { type: 'application/json' }), 'replace')).rejects.toThrow()
  })

  it('creates a json backup that restores', async () => {
    await db.purchases.add(purchase())
    const { blob } = await createJsonBackup()
    await clearAllData()
    await restoreFromJson(new File([blob], 'backup.json', { type: 'application/json' }), 'replace')
    expect(await db.purchases.count()).toBe(1)
  })
})

describe('pdf report generation', () => {
  it('generates a local pdf blob for a complaint', async () => {
    const p = purchase()
    await db.purchases.add(p)
    const complaint = {
      id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      companyName: 'Acme', productService: 'Phone', purchaseId: p.id, issueDescription: 'Flickers',
      complaintNumber: 'CMP-9', registrationDate: '2026-02-01', expectedResolutionDate: null,
      priority: 'High' as const, status: 'Submitted' as const, resolutionDetails: null,
    }
    const blob = await generateComplaintReport(complaint, p, [], [])
    expect(blob.type).toContain('pdf')
    expect(blob.size).toBeGreaterThan(500)
  })
})
