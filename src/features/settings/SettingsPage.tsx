import { useEffect, useState } from 'react'
import { db, clearAllData, getStorageInfo, formatBytes } from '@/lib/db'
import { Button } from '@/components/button/Button'

type Theme = 'system' | 'light' | 'dark'

export function SettingsPage() {
  const [theme, setTheme] = useState<Theme>('system')
  const [notifications, setNotifications] = useState(false)
  const [storage, setStorage] = useState<{ used: number; quota: number; percentage: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const record = await db.settings.get('app_settings')
      if (record) {
        try { const parsed = JSON.parse(record.value) as { theme?: Theme; notifications?: boolean }; setTheme(parsed.theme ?? 'system'); setNotifications(!!parsed.notifications) } catch { /* ignore */ }
      }
      setStorage(await getStorageInfo())
    })()
  }, [])

  const save = async (nextTheme: Theme, nextNotifications: boolean) => {
    setTheme(nextTheme); setNotifications(nextNotifications)
    await db.settings.put({ key: 'app_settings', value: JSON.stringify({ theme: nextTheme, notifications: nextNotifications }) })
    applyTheme(nextTheme)
    setMessage('Settings saved.')
  }

  const applyTheme = (t: Theme) => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = t === 'dark' || (t === 'system' && prefersDark)
    document.documentElement.classList.toggle('dark', dark)
  }

  const requestNotifications = async () => {
    if (!('Notification' in window)) { setMessage('This browser does not support notifications.'); return }
    const result = await Notification.requestPermission()
    if (result === 'granted') { setMessage('Notifications allowed. Reminders still only fire while ProofPocket is open — browsers cannot run code when closed.'); await save(theme, true) }
    else setMessage('Notifications not allowed. You can still see reminders in the Reminder Centre.')
  }

  const wipe = async () => {
    if (!window.confirm('Delete ALL ProofPocket data on this device (purchases, complaints, evidence, reminders)? Export a backup first. This cannot be undone.')) return
    await clearAllData()
    setMessage('All data deleted.')
    setStorage(await getStorageInfo())
  }

  return (
    <div className="max-w-[1126px] mx-auto px-4 sm:px-6 py-8 w-full">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Settings</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Preferences are stored locally in IndexedDB.</p>
      {message && <p className="mb-4 text-sm text-emerald-700 dark:text-emerald-300" role="status">{message}</p>}

      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-6 space-y-4">
        <div>
          <h2 className="font-semibold mb-2">Theme</h2>
          <div className="flex gap-2">
            {(['system', 'light', 'dark'] as Theme[]).map((t) => (
              <button key={t} type="button" onClick={() => void save(t, notifications)} aria-pressed={theme === t} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize min-h-[36px] ${theme === t ? 'bg-sky-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Browser notifications</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">Currently: {notifications ? 'enabled' : 'disabled'}. ProofPocket never promises background notifications while the browser is closed.</p>
          <Button variant="outline" onClick={() => void requestNotifications()}>Request notification permission</Button>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Storage</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">{storage ? `${formatBytes(storage.used)} used of ${formatBytes(storage.quota)} (${storage.percentage.toFixed(1)}%)` : 'Loading…'}</p>
        </div>
      </section>

      <section className="bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-900 rounded-xl p-5">
        <h2 className="font-semibold text-red-700 dark:text-red-300 mb-2">Danger zone</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">Delete every record on this device. This does not affect backup files you downloaded.</p>
        <Button variant="danger" onClick={() => void wipe()}>Delete all local data</Button>
      </section>
    </div>
  )
}
