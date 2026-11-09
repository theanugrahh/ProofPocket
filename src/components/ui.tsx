import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-neutral-900 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100" style={{ textWrap: 'balance' }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -m-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 min-h-[40px] min-w-[40px] flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1" role="alert">{error}</span>}
    </label>
  )
}

export const inputClass = "w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[40px]"

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-4">
      <p className="font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'purple' }) {
  const tones: Record<string, string> = {
    neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    primary: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    purple: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tones[tone]}`}>{children}</span>
}

export function statusTone(status: string): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'purple' {
  const map: Record<string, 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'purple'> = {
    Draft: 'neutral', Submitted: 'primary', Acknowledged: 'primary', 'In Progress': 'warning', 'Awaiting Response': 'purple', Escalated: 'danger', Resolved: 'success', Rejected: 'neutral', Closed: 'neutral',
  }
  return map[status] ?? 'neutral'
}
