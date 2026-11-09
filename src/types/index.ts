export type Currency = 'INR'

export type WarrantyStatus = 'active' | 'expired' | 'upcoming'

export type ComplaintStatus =
  | 'Draft'
  | 'Submitted'
  | 'Acknowledged'
  | 'In Progress'
  | 'Awaiting Response'
  | 'Escalated'
  | 'Resolved'
  | 'Rejected'
  | 'Closed'

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical'

export type TimelineEntryType =
  | 'call'
  | 'email'
  | 'message'
  | 'follow-up'
  | 'company-promise'
  | 'response'
  | 'escalation'
  | 'resolution'

export type ReminderType =
  | 'complaint-follow-up'
  | 'warranty-expiration'
  | 'custom'

export type ReminderStatus = 'pending' | 'completed' | 'overdue'

export type PaymentMethod =
  | 'Cash'
  | 'UPI'
  | 'Credit Card'
  | 'Debit Card'
  | 'Net Banking'
  | 'Cheque'
  | 'Other'

export type BackupFormat = 'json' | 'csv'
export type BackupScope = 'all' | 'purchase' | 'complaint'
export type RestoreStrategy = 'merge' | 'replace'

export interface BaseRecord {
  id: string
  createdAt: string
  updatedAt: string
}

export interface Purchase extends BaseRecord {
  productName: string
  brand: string
  category: string
  seller: string
  purchaseDate: string
  price: number
  currency: Currency
  invoiceNumber: string | null
  orderId: string | null
  paymentMethod: PaymentMethod
  warrantyDetails: string | null
  warrantyPeriodMonths: number | null
  warrantyExpiryDate: string | null
  serialNumber: string | null
  description: string | null
  notes: string | null
}

export interface Complaint extends BaseRecord {
  companyName: string
  productService: string
  purchaseId: string | null
  issueDescription: string
  complaintNumber: string | null
  registrationDate: string
  expectedResolutionDate: string | null
  priority: ComplaintPriority
  status: ComplaintStatus
  resolutionDetails: string | null
}

export interface Attachment extends BaseRecord {
  complaintId: string | null
  purchaseId: string | null
  timelineEntryId: string | null
  fileName: string
  originalName: string
  mimeType: string
  size: number
  data: Blob
  hash: string
}

export interface TimelineEntry extends BaseRecord {
  complaintId: string
  type: TimelineEntryType
  dateTime: string
  description: string
  attachmentIds: string[]
}

export interface Reminder extends BaseRecord {
  title: string
  type: ReminderType
  complaintId: string | null
  purchaseId: string | null
  warrantyId: string | null
  remindAt: string
  status: ReminderStatus
  notificationSent: boolean
  snoozeUntil: string | null
}

export interface Setting {
  key: string
  value: string
}

export interface BackupMetadata {
  id: string
  createdAt: string
  format: BackupFormat
  scope: BackupScope
  filename: string
  size: number
  checksum: string
  version: string
  recordCount: number
}

export interface StorageInfo {
  used: number
  quota: number
  percentage: number
}

export interface BackupFile {
  name: string
  data: Blob
}
