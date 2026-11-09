import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Pencil, Trash2, FileText, ChevronDown } from 'lucide-react'
import { useComplaints, usePurchases, useTimeline, useAttachments, type ComplaintFormValues } from '@/hooks/use-data-hooks'
import { Button } from '@/components/button/Button'
import { Modal, Field, EmptyState, inputClass, Badge, statusTone } from '@/components/ui'
import { formatDateIN, validComplaintStatuses, validPriorities, generateId, validateFile, hashBlob, safeFileName } from '@/lib/utils'
import { db } from '@/lib/db'
import { generateComplaintReport } from '@/lib/pdf'
import { downloadBlob } from '@/lib/backup'

const schema = z.object({
  companyName: z.string().min(1, 'Required').max(120),
  productService: z.string().min(1, 'Required').max(120),
  purchaseId: z.string().nullable().optional(),
  issueDescription: z.string().min(10, 'Describe the issue (min 10 characters)').max(4000),
  complaintNumber: z.string().max(80).nullable().optional(),
  expectedResolutionDate: z.string().nullable().optional(),
  priority: z.enum(validPriorities as [string, ...string[]]),
  status: z.enum(validComplaintStatuses as [string, ...string[]]),
  resolutionDetails: z.string().max(4000).nullable().optional(),
})
const defaults: ComplaintFormValues = { companyName: '', productService: '', purchaseId: null, issueDescription: '', complaintNumber: null, expectedResolutionDate: null, priority: 'Medium', status: 'Draft', resolutionDetails: null }

function ComplaintDetail({ complaintId, onClose }: { complaintId: string; onClose: () => void }) {
  const { complaints } = useComplaints()
  const { purchases } = usePurchases()
  const { entries, add, remove } = useTimeline(complaintId)
  const { attachments, remove: removeAttachment } = useAttachments()
  const complaint = complaints.find((c) => c.id === complaintId)
  const [type, setType] = useState('follow-up')
  const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16))
  const [desc, setDesc] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  if (!complaint) return null
  const linked = purchases.find((p) => p.id === complaint.purchaseId)
  const evidence = attachments.filter((a) => a.complaintId === complaintId || entries.some((e) => e.id === a.timelineEntryId))

  const addEntry = async () => {
    if (desc.trim().length < 2) { setError('Add a short description.'); return }
    setError(null)
    await add(type as never, new Date(dateTime).toISOString(), desc.trim())
    setDesc('')
  }

  const onFile = async (file: File | undefined, timelineId: string | null) => {
    if (!file) return
    const err = validateFile(file)
    if (err) { setUploadError(err); return }
    setUploadError(null)
    await db.attachments.add({ id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), complaintId, purchaseId: null, timelineEntryId: timelineId, fileName: safeFileName(file.name), originalName: file.name, mimeType: file.type, size: file.size, hash: await hashBlob(file), data: file })
    if (timelineId) {
      const entry = entries.find((e) => e.id === timelineId)
      if (entry) await db.timelineEntries.update(timelineId, { attachmentIds: [...entry.attachmentIds, ''] })
    }
  }

  const downloadEvidence = (a: (typeof attachments)[number]) => {
    const url = URL.createObjectURL(a.data)
    const el = document.createElement('a'); el.href = url; el.download = a.originalName; el.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const makePdf = async () => {
    const blob = await generateComplaintReport(complaint, linked ?? null, entries, evidence)
    downloadBlob(blob, `complaint-${complaint.complaintNumber ?? complaint.id}.pdf`)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap gap-2 mb-2"><Badge tone={statusTone(complaint.status)}>{complaint.status}</Badge><Badge>{complaint.priority} priority</Badge></div>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">{complaint.issueDescription}</p>
        <dl className="text-sm mt-3 space-y-1 text-neutral-600 dark:text-neutral-300">
          <div><dt className="inline font-medium text-neutral-900 dark:text-neutral-100">Complaint no: </dt><dd className="inline">{complaint.complaintNumber ?? '—'}</dd></div>
          <div><dt className="inline font-medium text-neutral-900 dark:text-neutral-100">Registered: </dt><dd className="inline">{formatDateIN(complaint.registrationDate)}</dd></div>
          <div><dt className="inline font-medium text-neutral-900 dark:text-neutral-100">Expected: </dt><dd className="inline">{formatDateIN(complaint.expectedResolutionDate)}</dd></div>
          <div><dt className="inline font-medium text-neutral-900 dark:text-neutral-100">Linked purchase: </dt><dd className="inline">{linked ? `${linked.productName} (${linked.brand})` : 'None'}</dd></div>
          {complaint.resolutionDetails && <div><dt className="inline font-medium text-neutral-900 dark:text-neutral-100">Resolution: </dt><dd className="inline">{complaint.resolutionDetails}</dd></div>}
        </dl>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Timeline</h3>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass} aria-label="Timeline entry type">
            <option value="call">Call</option><option value="email">Email</option><option value="message">Message</option><option value="follow-up">Follow-up</option><option value="company-promise">Company promise</option><option value="response">Response</option><option value="escalation">Escalation</option><option value="resolution">Resolution</option>
          </select>
          <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className={inputClass} aria-label="Date and time" />
        </div>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} className={inputClass} rows={2} placeholder="What happened? Who did you speak to? What was promised?" aria-label="Timeline description" />
        {error && <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>}
        <Button className="mt-2" onClick={addEntry}>Add timeline entry</Button>
        <ol className="mt-4 space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-sky-700 dark:text-sky-300">{e.type}</span>
                <span className="text-xs text-neutral-500">{new Date(e.dateTime).toLocaleString('en-IN')}</span>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{e.description}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <label className="text-xs text-sky-700 hover:underline cursor-pointer">Attach file<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt" onChange={(ev) => void onFile(ev.target.files?.[0], e.id)} /></label>
                <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => void remove(e.id)}>Delete entry</button>
              </div>
            </li>
          ))}
          {entries.length === 0 && <li className="text-sm text-neutral-500">No timeline entries yet. Record every call, email and promise here.</li>}
        </ol>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Evidence</h3>
        <label className="text-sm text-sky-700 hover:underline cursor-pointer">Upload evidence (PDF / image)<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt" onChange={(ev) => void onFile(ev.target.files?.[0], null)} /></label>
        {uploadError && <p className="text-xs text-red-600 mt-1" role="alert">{uploadError}</p>}
        <ul className="mt-2 space-y-2">
          {evidence.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2">
              <span className="text-sm truncate">{a.originalName} <span className="text-xs text-neutral-500">({(a.size / 1024).toFixed(1)} KB)</span></span>
              <span className="flex gap-3 shrink-0">
                <button type="button" className="text-xs text-sky-700 hover:underline" onClick={() => downloadEvidence(a)}>Download</button>
                <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => void removeAttachment(a.id)}>Delete</button>
              </span>
            </li>
          ))}
          {evidence.length === 0 && <li className="text-sm text-neutral-500">No evidence attached.</li>}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
        <Button onClick={makePdf}><FileText className="h-4 w-4" /> Generate PDF report</Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </div>
  )
}

export function ComplaintsPage() {
  const { complaints, loading, addComplaint, updateComplaint, deleteComplaint } = useComplaints()
  const { purchases } = usePurchases()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) as never, defaultValues: defaults as never })
  const { register, handleSubmit, reset, formState } = form

  const visible = useMemo(() => complaints.filter((c) => (statusFilter === 'all' || c.status === statusFilter) && (!q.trim() || [c.companyName, c.productService, c.complaintNumber ?? ''].join(' ').toLowerCase().includes(q.toLowerCase()))), [complaints, q, statusFilter])

  const openAdd = () => { setEditing(null); reset(defaults); setOpen(true) }
  const openEdit = (id: string) => {
    const c = complaints.find((x) => x.id === id)
    if (!c) return
    setEditing(id)
    reset({ companyName: c.companyName, productService: c.productService, purchaseId: c.purchaseId, issueDescription: c.issueDescription, complaintNumber: c.complaintNumber, expectedResolutionDate: c.expectedResolutionDate?.slice(0, 10) ?? null, priority: c.priority, status: c.status, resolutionDetails: c.resolutionDetails })
    setOpen(true)
  }
  const onSubmit = async (vRaw: z.infer<typeof schema>) => { const v = vRaw as unknown as ComplaintFormValues; if (editing) await updateComplaint(editing, v); else await addComplaint(v); setOpen(false) }

  return (
    <div className="max-w-[1126px] mx-auto px-4 sm:px-6 py-8 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div><h1 className="text-2xl sm:text-3xl font-bold">Complaint Manager</h1><p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Track reference numbers, statuses and follow-ups.</p></div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> New complaint</Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, product, complaint no…" className={`${inputClass} pl-9`} aria-label="Search complaints" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass} aria-label="Filter by status"><option value="all">All statuses</option>{validComplaintStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      {loading ? <p className="py-10 text-center text-sm text-neutral-500">Loading complaints…</p> : visible.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl"><EmptyState title={complaints.length === 0 ? 'No complaints yet' : 'No matches'} body={complaints.length === 0 ? 'Record a complaint to track its reference number, timeline and evidence.' : 'Try a different search or filter.'} action={complaints.length === 0 ? <Button onClick={openAdd}>New complaint</Button> : undefined} /></div>
      ) : (
        <div className="space-y-3">
          {visible.map((c) => (
            <article key={c.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button type="button" className="text-left" onClick={() => setDetailId(c.id)}>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">{c.companyName} <ChevronDown className="h-4 w-4 text-neutral-400" /></div>
                  <div className="text-sm text-neutral-500">{c.productService} • {formatDateIN(c.registrationDate)}{c.complaintNumber ? ` • Ref ${c.complaintNumber}` : ''}</div>
                </button>
                <div className="flex items-center gap-2"><Badge tone={statusTone(c.status)}>{c.status}</Badge><Badge>{c.priority}</Badge></div>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2 line-clamp-2">{c.issueDescription}</p>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setDetailId(c.id)}>Timeline &amp; evidence</Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(c.id)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={async () => { if (window.confirm(`Delete complaint “${c.companyName}” with its timeline and evidence?`)) await deleteComplaint(c.id) }}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={open} title={editing ? 'Edit complaint' : 'New complaint'} onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Company *" error={formState.errors.companyName?.message}><input {...register('companyName')} className={inputClass} /></Field>
            <Field label="Product / service *" error={formState.errors.productService?.message}><input {...register('productService')} className={inputClass} /></Field>
            <Field label="Complaint number"><input {...register('complaintNumber')} className={inputClass} placeholder="e.g. CMPL/2026/12345" /></Field>
            <Field label="Expected resolution date"><input type="date" {...register('expectedResolutionDate')} className={inputClass} /></Field>
            <Field label="Linked purchase"><select {...register('purchaseId')} className={inputClass}><option value="">None</option>{purchases.map((p) => <option key={p.id} value={p.id}>{p.productName} ({p.brand})</option>)}</select></Field>
            <Field label="Priority"><select {...register('priority')} className={inputClass}>{validPriorities.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
            <Field label="Status"><select {...register('status')} className={inputClass}>{validComplaintStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          </div>
          <Field label="Issue description *" error={formState.errors.issueDescription?.message}><textarea {...register('issueDescription')} className={inputClass} rows={4} /></Field>
          <Field label="Resolution details"><textarea {...register('resolutionDetails')} className={inputClass} rows={2} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={formState.isSubmitting}>{editing ? 'Save changes' : 'Create complaint'}</Button></div>
        </form>
      </Modal>

      <Modal open={!!detailId} title="Complaint detail" onClose={() => setDetailId(null)}>
        {detailId && <ComplaintDetail complaintId={detailId} onClose={() => setDetailId(null)} />}
      </Modal>
    </div>
  )
}
