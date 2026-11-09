import { Dexie } from 'dexie'
import type {
  Purchase,
  Complaint,
  Attachment,
  TimelineEntry,
  Reminder,
  Setting,
  BackupMetadata,
  StorageInfo,
} from '@/types'

class ProofPocketDB extends Dexie {
  purchases: Dexie.Table<Purchase, string>
  complaints: Dexie.Table<Complaint, string>
  attachments: Dexie.Table<Attachment, string>
  timelineEntries: Dexie.Table<TimelineEntry, string>
  reminders: Dexie.Table<Reminder, string>
  settings: Dexie.Table<Setting, string>
  backupMetadata: Dexie.Table<BackupMetadata, string>

  constructor() {
    super('ProofPocketDB')

    this.version(1).stores({
      purchases: '&id, category, purchaseDate',
      complaints: '&id, purchaseId, status',
      attachments: '&id, complaintId, purchaseId, timelineEntryId',
      timelineEntries: '&id, complaintId, dateTime',
      reminders: '&id, complaintId, purchaseId, remindAt, status',
      settings: '&key',
      backupMetadata: '&id, createdAt',
    })

    this.purchases = this.table('purchases')
    this.complaints = this.table('complaints')
    this.attachments = this.table('attachments')
    this.timelineEntries = this.table('timelineEntries')
    this.reminders = this.table('reminders')
    this.settings = this.table('settings')
    this.backupMetadata = this.table('backupMetadata')
  }
}

export const db = new ProofPocketDB()

export async function initDatabase(): Promise<void> {
  if (!window.indexedDB) {
    console.error('IndexedDB is not supported in this browser')
    return
  }
  await db.open()
  console.log('Database opened successfully')
}

export async function closeDatabase(): Promise<void> {
  await db.close()
}

export async function clearAllData(): Promise<void> {
  await db.purchases.clear()
  await db.complaints.clear()
  await db.attachments.clear()
  await db.timelineEntries.clear()
  await db.reminders.clear()
  await db.settings.clear()
  await db.backupMetadata.clear()
}

export async function getStorageInfo(): Promise<StorageInfo> {
  try {
    const dbs = await (navigator as any).storage?.estimate?.()
    if (dbs && dbs.usage !== undefined) {
      return {
        used: dbs.usage,
        quota: dbs.quota,
        percentage: (dbs.usage / dbs.quota) * 100,
      }
    }
  } catch (_e) {
    // Fall through to fallback
  }

  const stats = await getRecordStats()
  const avgRecordSize = 1000
  const used = stats.totalRecords * avgRecordSize
  const quota = 50 * 1024 * 1024
  return {
    used,
    quota,
    percentage: (used / quota) * 100,
  }
}

async function getRecordStats(): Promise<{ totalRecords: number }> {
  const [
    purchasesCount,
    complaintsCount,
    attachmentsCount,
    timelineCount,
    remindersCount,
  ] = await Promise.all([
    db.purchases.count(),
    db.complaints.count(),
    db.attachments.count(),
    db.timelineEntries.count(),
    db.reminders.count(),
  ])

  const totalRecords = purchasesCount + complaintsCount + attachmentsCount + timelineCount + remindersCount
  return { totalRecords }
}

export async function validateStorageSpace(neededBytes: number): Promise<{ canStore: boolean; currentUsage: StorageInfo }> {
  const current = await getStorageInfo()
  const canStore = current.used + neededBytes <= current.quota
  return { canStore, currentUsage: current }
}

export async function handleQuotaError(neededBytes: number): Promise<void> {
  const { canStore, currentUsage } = await validateStorageSpace(neededBytes)
  if (!canStore) {
    console.warn(
      `Storage space insufficient. Current: ${currentUsage.used} bytes, Needed: ${neededBytes} bytes.`
    )
    throw new Error(
      `Storage quota exceeded. Current usage: ${formatBytes(currentUsage.used)}. Please export your data and clear old records, or free up storage space.`
    )
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}