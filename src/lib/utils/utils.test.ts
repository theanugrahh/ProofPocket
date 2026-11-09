import { describe, it, expect } from 'vitest'
import {
  calculateWarrantyExpiryDate,
  isWarrantyExpired,
  daysUntilWarrantyExpiry,
  formatINR,
  formatDateIN,
  sanitizeText,
  safeFileName,
  isFileSizeValid,
  isValidISODate,
  validateFile,
  isValidComplaintStatus,
  isValidPriority,
  isValidPaymentMethod,
} from '@/lib/utils'
import { validateBackupPayload } from '@/lib/backup'

describe('warranty calculations', () => {
  it('calculates expiry 12 months after purchase', () => {
    const expiry = calculateWarrantyExpiryDate('2025-01-15', 12)
    expect(expiry).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(expiry).getFullYear()).toBe(2026)
  })
  it('detects expired warranties', () => {
    expect(isWarrantyExpired('2000-01-01')).toBe(true)
    expect(isWarrantyExpired('2999-01-01')).toBe(false)
  })
  it('computes days until expiry', () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10)
    expect(daysUntilWarrantyExpiry(future)).toBeGreaterThanOrEqual(9)
  })
})

describe('formatting (Indian locale)', () => {
  it('formats INR', () => {
    expect(formatINR(123456)).toContain('₹')
    expect(formatINR(0)).toContain('0')
  })
  it('formats dates in en-IN style', () => {
    expect(formatDateIN('2026-11-09')).toContain('2026')
    expect(formatDateIN(null)).toBe('—')
    expect(formatDateIN('not-a-date')).toBe('—')
  })
  it('sanitizes HTML', () => {
    expect(sanitizeText('<b>x</b>')).not.toContain('<b>')
  })
  it('makes filenames safe', () => {
    expect(safeFileName('a/b:c?.pdf')).not.toContain('/')
    expect(safeFileName('')).toBe('unnamed-file')
  })
})

describe('validation', () => {
  it('checks file size limit', () => {
    expect(isFileSizeValid(1024)).toBe(true)
    expect(isFileSizeValid(51 * 1024 * 1024)).toBe(false)
  })
  it('validates ISO dates', () => {
    expect(isValidISODate('2026-01-01')).toBe(true)
    expect(isValidISODate('hello')).toBe(false)
    expect(isValidISODate(null)).toBe(false)
  })
  it('validates enums', () => {
    expect(isValidComplaintStatus('Resolved')).toBe(true)
    expect(isValidComplaintStatus('Nope')).toBe(false)
    expect(isValidPriority('High')).toBe(true)
    expect(isValidPaymentMethod('UPI')).toBe(true)
  })
  it('rejects unsupported file types', () => {
    const exe = new File(['x'], 'evil.exe', { type: 'application/octet-stream' })
    expect(validateFile(exe)).not.toBeNull()
    const pdf = new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' })
    expect(validateFile(pdf)).toBeNull()
    const huge = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    Object.defineProperty(huge, 'size', { value: 51 * 1024 * 1024 })
    expect(validateFile(huge)).not.toBeNull()
  })
})

describe('backup validation', () => {
  it('accepts a well-formed payload', () => {
    expect(validateBackupPayload({ version: '1.0.0', purchases: [], complaints: [] })).toBeNull()
  })
  it('rejects corrupted backups', () => {
    expect(validateBackupPayload(null)).not.toBeNull()
    expect(validateBackupPayload({})).not.toBeNull()
    expect(validateBackupPayload({ version: '1', purchases: [{ id: 1 }], complaints: [] })).not.toBeNull()
    expect(validateBackupPayload({ version: '1', purchases: [], complaints: [{ id: 'x' }] })).not.toBeNull()
  })
})
