import { v4 as uuidv4 } from 'uuid'
import type {
  TimelineEntry,
  Reminder,
  PaymentMethod,
  ComplaintPriority,
  ComplaintStatus,
  WarrantyStatus,
} from '@/types'
import { db } from '@/lib/db'

// Generate a unique ID
export function generateId(): string {
  return uuidv4()
}

// Validate currency field
export function isValidCurrency(value: string): boolean {
  return value === 'INR' || value.length <= 10
}

// Validate payment method field
export const validPaymentMethods: PaymentMethod[] = [
  'Cash',
  'UPI',
  'Credit Card',
  'Debit Card',
  'Net Banking',
  'Cheque',
  'Other',
]

export function isValidPaymentMethod(value: string): boolean {
  return validPaymentMethods.includes(value as PaymentMethod)
}

// Validate complaint priority
export const validPriorities: ComplaintPriority[] = ['Low', 'Medium', 'High', 'Critical']

export function isValidPriority(value: string): boolean {
  return validPriorities.includes(value as ComplaintPriority)
}

// Validate warranty status
export const validWarrantyStatuses: WarrantyStatus[] = ['active', 'expired', 'upcoming']

export function isValidWarrantyStatus(value: string): boolean {
  return validWarrantyStatuses.includes(value as WarrantyStatus)
}

// Validate complaint status
export const validComplaintStatuses: ComplaintStatus[] = [
  'Draft',
  'Submitted',
  'Acknowledged',
  'In Progress',
  'Awaiting Response',
  'Escalated',
  'Resolved',
  'Rejected',
  'Closed',
]

export function isValidComplaintStatus(value: string): boolean {
  return validComplaintStatuses.includes(value as ComplaintStatus)
}

// Validate timeline entry type
export const validTimelineTypes: TimelineEntry['type'][] = [
  'call',
  'email',
  'message',
  'follow-up',
  'company-promise',
  'response',
  'escalation',
  'resolution',
]

export function isValidTimelineType(value: string): boolean {
  return validTimelineTypes.includes(value as any)
}

// Validate reminder type
export const validReminderTypes: Reminder['type'][] = [
  'complaint-follow-up',
  'warranty-expiration',
  'custom',
]

export function isValidReminderType(value: string): boolean {
  return validReminderTypes.includes(value as any)
}

// Validate ISO date format
export function isValidISODate(date: string | null | undefined): date is string {
  if (!date) return false
  const parsed = new Date(date)
  return !isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(date)
}

// Format date as YYYY-MM-DD (Indian format)
export function formatDate(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Format date with time
export function formatDateTime(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return formatDate(d)
}

// Get download URL for an attachment Blob
export function getAttachmentDownloadUrl(attachmentId: string): string {
  return `#/attachments/${attachmentId}`
}

// Sanitize text inputs by removing potential HTML
export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Validate file size (max 50MB for attachments)
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
export function isFileSizeValid(size: number): boolean {
  return size <= MAX_FILE_SIZE
}

// Get file extension
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot === -1) return ''
  return fileName.slice(lastDot + 1).toLowerCase()
}

// Safe filename generation from file content
export function safeFileName(originalName: string): string {
  const sanitized = originalName
    .replace(/[<>:"/\\|?*]/g, '') // Remove characters invalid in filenames, including path separators
    .replace(/\.\./g, '.dot') // Prevent directory traversal
    .replace(/^\.+/, '')
  return sanitized || 'unnamed-file'
}

// Calculate warranty expiry date
export function calculateWarrantyExpiryDate(purchaseDate: string, warrantyPeriodMonths: number): string {
  const purchaseDateObj = new Date(purchaseDate)
  const expiryDate = new Date(
    purchaseDateObj.getTime() + warrantyPeriodMonths * 30 * 24 * 60 * 60 * 1000
  )
  return formatDate(expiryDate)
}

// Check if warranty has expired
export function isWarrantyExpired(expiryDate: string): boolean {
  return new Date(expiryDate).getTime() < Date.now()
}

// Days until warranty expires
export function daysUntilWarrantyExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate)
  const now = new Date()
  const diffMs = expiry.getTime() - now.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

// Export to JSON function for backup
export async function exportRecordToJSON(
  _recordType: 'purchases' | 'complaints' | 'timeline' | 'reminders',
  records: any[]
): Promise<string> {
  return records
    .map((r) => JSON.stringify(r))
    .join('\n')
}

// Convert attachment data to base64
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Compute SHA-like hash for integrity checking (simplified)
export async function computeFileHash(data: Uint8Array): Promise<string> {
  const hash = globalThis.crypto.subtle.digest('SHA-256', data as BufferSource)
  const hashBuffer = await hash
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Deep clone helper
export function deepClone<T>(obj: T): T {
  if (obj instanceof Blob) {
    // Cannot clone Blob directly, need workaround
    return obj as any
  }
  return structuredClone(obj)
}

// Initialize default settings
export async function initDefaultSettings(): Promise<void> {
  const existing = await db.settings.get('app_settings')
  if (!existing) {
    await db.settings.put({ key: 'app_settings', value: JSON.stringify({ theme: 'system', notifications: false, reminderDays: 7 }) })
  }
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export function formatDateIN(date: string | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}

export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'text/plain']

export function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mime)
}

export function validateFile(file: File): string | null {
  if (!isAllowedMimeType(file.type)) return `Unsupported file type: ${file.type || 'unknown'}. Allowed: PDF, images, text.`
  if (!isFileSizeValid(file.size)) return `File too large (${formatBytesLocal(file.size)}). Maximum is 50 MB.`
  const ext = getFileExtension(file.name)
  const map: Record<string, string[]> = { pdf: ['pdf'], jpg: ['jpeg'], jpeg: ['jpeg'], png: ['png'], webp: ['webp'], gif: ['gif'], txt: ['plain'] }
  if (ext && map[ext] && !file.type.includes(map[ext][0])) return 'File extension does not match its type.'
  return null
}

function formatBytesLocal(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const s = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${s[i]}`
}

export async function hashBlob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  return computeFileHash(new Uint8Array(buf))
}
