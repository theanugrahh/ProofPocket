import { useState, useEffect, useCallback } from 'react'
import { db, initDatabase, getStorageInfo, handleQuotaError } from '@/lib/db'
import { initDefaultSettings, generateId, formatDate, formatINR } from '@/lib/utils'
import type { Purchase, Complaint, Reminder, TimelineEntry, Attachment, StorageInfo, ComplaintStatus, ComplaintPriority, PaymentMethod, ReminderType, TimelineEntryType } from '@/types'

export { formatINR }

export interface StorageState extends StorageInfo { error?: string }

export function useStorageMonitoring(): StorageState {
  const [state, setState] = useState<StorageState>({ used: 0, quota: 0, percentage: 0 })
  useEffect(() => {
    let alive = true
    const update = async () => {
      try { const info = await getStorageInfo(); if (alive) setState({ ...info }) }
      catch { if (alive) setState({ used: 0, quota: 0, percentage: 0, error: 'Could not retrieve storage info' }) }
    }
    void update()
    const id = setInterval(update, 5000)
    return () => { alive = false; clearInterval(id) }
  }, [])
  return state
}

export function useId() {
  return { id: generateId(), generate: generateId }
}

export async function initDatabaseWithDefaults(): Promise<void> {
  await initDatabase()
  await initDefaultSettings()
}

// ---------- Purchases ----------
export interface PurchaseFormValues {
  productName: string; brand: string; category: string; seller: string; purchaseDate: string; price: number
  invoiceNumber: string | null; orderId: string | null; paymentMethod: PaymentMethod; warrantyDetails: string | null
  warrantyPeriodMonths: number | null; serialNumber: string | null; description: string | null; notes: string | null
}
export interface UsePurchaseResult {
  purchases: Purchase[]; loading: boolean; error: string | null
  addPurchase: (v: PurchaseFormValues) => Promise<void>
  updatePurchase: (id: string, v: PurchaseFormValues) => Promise<void>
  deletePurchase: (id: string) => Promise<void>
}
export function usePurchases(): UsePurchaseResult {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    try { setLoading(true); setPurchases(await db.purchases.toArray()) }
    catch { setError('Failed to load purchases') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const addPurchase = useCallback(async (v: PurchaseFormValues) => {
    await handleQuotaError(1000)
    const warrantyExpiryDate = v.warrantyPeriodMonths ? formatDate(new Date(new Date(v.purchaseDate).getTime() + v.warrantyPeriodMonths * 30 * 86400000)) : null
    const p: Purchase = { id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productName: v.productName, brand: v.brand, category: v.category, seller: v.seller, purchaseDate: formatDate(v.purchaseDate), price: v.price, currency: 'INR', invoiceNumber: v.invoiceNumber || null, orderId: v.orderId || null, paymentMethod: v.paymentMethod, warrantyDetails: v.warrantyDetails || null, warrantyPeriodMonths: v.warrantyPeriodMonths || null, warrantyExpiryDate, serialNumber: v.serialNumber || null, description: v.description || null, notes: v.notes || null }
    await db.purchases.add(p); await load()
  }, [load])
  const updatePurchase = useCallback(async (id: string, v: PurchaseFormValues) => {
    await handleQuotaError(1000)
    const warrantyExpiryDate = v.warrantyPeriodMonths ? formatDate(new Date(new Date(v.purchaseDate).getTime() + v.warrantyPeriodMonths * 30 * 86400000)) : null
    await db.purchases.update(id, { productName: v.productName, brand: v.brand, category: v.category, seller: v.seller, purchaseDate: formatDate(v.purchaseDate), price: v.price, invoiceNumber: v.invoiceNumber || null, orderId: v.orderId || null, paymentMethod: v.paymentMethod, warrantyDetails: v.warrantyDetails || null, warrantyPeriodMonths: v.warrantyPeriodMonths || null, warrantyExpiryDate, serialNumber: v.serialNumber || null, description: v.description || null, notes: v.notes || null, updatedAt: new Date().toISOString() })
    await load()
  }, [load])
  const deletePurchase = useCallback(async (id: string) => {
    await db.transaction('rw', [db.purchases, db.complaints, db.attachments, db.reminders], async () => {
      await db.attachments.where('purchaseId').equals(id).delete()
      await db.reminders.where('purchaseId').equals(id).delete()
      await db.complaints.where('purchaseId').equals(id).modify({ purchaseId: null })
      await db.purchases.delete(id)
    })
    await load()
  }, [load])
  return { purchases, loading, error, addPurchase, updatePurchase, deletePurchase }
}

// ---------- Complaints ----------
export interface ComplaintFormValues {
  companyName: string; productService: string; purchaseId: string | null; issueDescription: string
  complaintNumber: string | null; expectedResolutionDate: string | null; priority: ComplaintPriority; status: ComplaintStatus; resolutionDetails: string | null
}
export interface UseComplaintResult {
  complaints: Complaint[]; loading: boolean; error: string | null
  addComplaint: (v: ComplaintFormValues) => Promise<void>
  updateComplaint: (id: string, v: ComplaintFormValues) => Promise<void>
  deleteComplaint: (id: string) => Promise<void>
}
export function useComplaints(): UseComplaintResult {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    try { setLoading(true); setComplaints(await db.complaints.toArray()) }
    catch { setError('Failed to load complaints') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const addComplaint = useCallback(async (v: ComplaintFormValues) => {
    await handleQuotaError(1500)
    const c: Complaint = { id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), companyName: v.companyName, productService: v.productService, purchaseId: v.purchaseId || null, issueDescription: v.issueDescription, complaintNumber: v.complaintNumber || null, registrationDate: formatDate(new Date()), expectedResolutionDate: v.expectedResolutionDate || null, priority: v.priority, status: v.status, resolutionDetails: v.resolutionDetails || null }
    await db.complaints.add(c); await load()
  }, [load])
  const updateComplaint = useCallback(async (id: string, v: ComplaintFormValues) => {
    await handleQuotaError(1500)
    await db.complaints.update(id, { companyName: v.companyName, productService: v.productService, purchaseId: v.purchaseId || null, issueDescription: v.issueDescription, complaintNumber: v.complaintNumber || null, expectedResolutionDate: v.expectedResolutionDate || null, priority: v.priority, status: v.status, resolutionDetails: v.resolutionDetails || null, updatedAt: new Date().toISOString() })
    await load()
  }, [load])
  const deleteComplaint = useCallback(async (id: string) => {
    await db.transaction('rw', [db.complaints, db.timelineEntries, db.attachments, db.reminders], async () => {
      const entries = await db.timelineEntries.where('complaintId').equals(id).toArray()
      for (const e of entries) await db.attachments.where('timelineEntryId').equals(e.id).delete()
      await db.timelineEntries.where('complaintId').equals(id).delete()
      await db.attachments.where('complaintId').equals(id).delete()
      await db.reminders.where('complaintId').equals(id).delete()
      await db.complaints.delete(id)
    })
    await load()
  }, [load])
  return { complaints, loading, error, addComplaint, updateComplaint, deleteComplaint }
}

// ---------- Reminders ----------
export interface ReminderFormValues { title: string; type: ReminderType; complaintId: string | null; purchaseId: string | null; remindAt: string }
export interface UseReminderResult { reminders: Reminder[]; loading: boolean; error: string | null; addReminder: (v: ReminderFormValues) => Promise<void>; updateReminder: (id: string, v: ReminderFormValues) => Promise<void>; deleteReminder: (id: string) => Promise<void>; completeReminder: (id: string) => Promise<void> }
export function useReminders(): UseReminderResult {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => { try { setLoading(true); setReminders(await db.reminders.toArray()) } catch { setError('Failed to load reminders') } finally { setLoading(false) } }, [])
  useEffect(() => { void load() }, [load])
  const addReminder = useCallback(async (v: ReminderFormValues) => { await handleQuotaError(800); await db.reminders.add({ id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), title: v.title, type: v.type, complaintId: v.complaintId || null, purchaseId: v.purchaseId || null, warrantyId: null, remindAt: v.remindAt, status: 'pending', notificationSent: false, snoozeUntil: null }); await load() }, [load])
  const updateReminder = useCallback(async (id: string, v: ReminderFormValues) => { await db.reminders.update(id, { title: v.title, type: v.type, complaintId: v.complaintId || null, purchaseId: v.purchaseId || null, remindAt: v.remindAt, updatedAt: new Date().toISOString() }); await load() }, [load])
  const deleteReminder = useCallback(async (id: string) => { await db.reminders.delete(id); await load() }, [load])
  const completeReminder = useCallback(async (id: string) => { await db.reminders.update(id, { status: 'completed', updatedAt: new Date().toISOString() }); await load() }, [load])
  return { reminders, loading, error, addReminder, updateReminder, deleteReminder, completeReminder }
}

// ---------- Timeline ----------
export function useTimeline(complaintId: string | null) {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const load = useCallback(async () => { if (!complaintId) { setEntries([]); return } const all = await db.timelineEntries.where('complaintId').equals(complaintId).toArray(); all.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()); setEntries(all) }, [complaintId])
  useEffect(() => { void load() }, [load])
  const add = useCallback(async (type: TimelineEntryType, dateTime: string, description: string) => { if (!complaintId) return; await handleQuotaError(800); await db.timelineEntries.add({ id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), complaintId, type, dateTime, description, attachmentIds: [] }); await load() }, [complaintId, load])
  const remove = useCallback(async (id: string) => { await db.attachments.where('timelineEntryId').equals(id).delete(); await db.timelineEntries.delete(id); await load() }, [load])
  return { entries, add, remove, reload: load }
}

// ---------- Attachments ----------
export function useAttachments() {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const load = useCallback(async () => { setAttachments(await db.attachments.toArray()) }, [])
  useEffect(() => { void load() }, [load])
  const remove = useCallback(async (id: string) => { await db.attachments.delete(id); await load() }, [load])
  return { attachments, remove, reload: load }
}
