import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Bell, Check, Trash2 } from 'lucide-react'
import { useReminders, useComplaints, usePurchases, type ReminderFormValues } from '@/hooks/use-data-hooks'
import { Button } from '@/components/button/Button'
import { Modal, Field, EmptyState, inputClass, Badge } from '@/components/ui'
import { formatDateIN } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(1, 'Required').max(120),
  type: z.enum(['complaint-follow-up', 'warranty-expiration', 'custom']),
  complaintId: z.string().nullable().optional(),
  purchaseId: z.string().nullable().optional(),
  remindAt: z.string().min(1, 'Required'),
})

export function RemindersPage() {
  const { reminders, loading, addReminder, updateReminder, deleteReminder, completeReminder } = useReminders()
  const { complaints } = useComplaints()
  const { purchases } = usePurchases()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [tab, setTab] = useState<'upcoming' | 'overdue' | 'completed'>('upcoming')
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) as never, defaultValues: { title: '', type: 'custom', complaintId: null, purchaseId: null, remindAt: new Date().toISOString().slice(0, 10) } as never })
  const { register, handleSubmit, reset, formState } = form

  const now = Date.now()
  const withStatus = useMemo(() => reminders.map((r) => ({ ...r, overdue: r.status === 'pending' && +new Date(r.remindAt) < now })), [reminders, now])
  const visible = withStatus.filter((r) => tab === 'completed' ? r.status === 'completed' : tab === 'overdue' ? r.overdue : r.status === 'pending' && !r.overdue).sort((a, b) => +new Date(a.remindAt) - +new Date(b.remindAt))

  const labelFor = (r: (typeof reminders)[number]) => {
    const c = complaints.find((x) => x.id === r.complaintId)
    const p = purchases.find((x) => x.id === r.purchaseId)
    if (c) return c.companyName
    if (p) return p.productName
    return 'General'
  }

  const onSubmit = async (vRaw: z.infer<typeof schema>) => { const v = vRaw as unknown as ReminderFormValues; if (editing) await updateReminder(editing, v); else await addReminder(v); setOpen(false) }
  const openAdd = () => { setEditing(null); reset({ title: '', type: 'custom', complaintId: null, purchaseId: null, remindAt: new Date().toISOString().slice(0, 10) }); setOpen(true) }
  const openEdit = (r: (typeof reminders)[number]) => { setEditing(r.id); reset({ title: r.title, type: r.type as ReminderFormValues['type'], complaintId: r.complaintId, purchaseId: r.purchaseId, remindAt: r.remindAt.slice(0, 10) }); setOpen(true) }

  return (
    <div className="max-w-[1126px] mx-auto px-4 sm:px-6 py-8 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div><h1 className="text-2xl sm:text-3xl font-bold">Reminder Centre</h1><p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">In-app reminders only. When the browser is closed, reminders cannot fire background notifications.</p></div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> New reminder</Button>
      </div>
      <div className="flex gap-2 mb-4">
        {(['upcoming', 'overdue', 'completed'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize min-h-[36px] ${tab === t ? 'bg-sky-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800'}`}>{t}</button>
        ))}
      </div>
      {loading ? <p className="py-10 text-center text-sm text-neutral-500">Loading reminders…</p> : visible.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl"><EmptyState title={`No ${tab} reminders`} body="Create a follow-up, warranty or custom reminder and it will appear here." action={<Button onClick={openAdd}>New reminder</Button>} /></div>
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => (
            <li key={r.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-sky-600" /><span className="font-medium">{r.title}</span><Badge tone={r.overdue ? 'danger' : r.status === 'completed' ? 'success' : 'primary'}>{r.overdue ? 'Overdue' : r.status}</Badge></div>
                <div className="text-sm text-neutral-500 mt-1">{labelFor(r)} • {formatDateIN(r.remindAt)}</div>
              </div>
              <div className="flex gap-2">
                {r.status !== 'completed' && <Button variant="outline" size="sm" onClick={() => void completeReminder(r.id)}><Check className="h-3.5 w-3.5" /> Complete</Button>}
                <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Reschedule</Button>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => void deleteReminder(r.id)}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} title={editing ? 'Reschedule reminder' : 'New reminder'} onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Title *" error={formState.errors.title?.message}><input {...register('title')} className={inputClass} placeholder="e.g. Follow up with Samsung support" /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Type"><select {...register('type')} className={inputClass}><option value="complaint-follow-up">Complaint follow-up</option><option value="warranty-expiration">Warranty expiration</option><option value="custom">Custom</option></select></Field>
            <Field label="Remind on *" error={formState.errors.remindAt?.message}><input type="date" {...register('remindAt')} className={inputClass} /></Field>
            <Field label="Linked complaint"><select {...register('complaintId')} className={inputClass}><option value="">None</option>{complaints.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}</select></Field>
            <Field label="Linked purchase"><select {...register('purchaseId')} className={inputClass}><option value="">None</option>{purchases.map((p) => <option key={p.id} value={p.id}>{p.productName}</option>)}</select></Field>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={formState.isSubmitting}>{editing ? 'Save' : 'Create reminder'}</Button></div>
        </form>
      </Modal>
    </div>
  )
}
