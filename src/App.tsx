import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ShieldCheck, Scale, FolderLock, Bell, BarChart3, Settings as SettingsIcon, HardDrive, ArrowRight, CheckCircle2, Database, Lock } from 'lucide-react'
import { initDatabaseWithDefaults, usePurchases, useComplaints, useReminders, useStorageMonitoring } from '@/hooks/use-data-hooks'
import { Button } from '@/components/button/Button'
import { cn } from '@/lib/utils/cn'
import { PurchasesPage } from '@/features/purchases/PurchasesPage'
import { WarrantiesPage } from '@/features/warranties/WarrantiesPage'
import { ComplaintsPage } from '@/features/complaints/ComplaintsPage'
import { EvidencePage } from '@/features/evidence/EvidencePage'
import { RemindersPage } from '@/features/reminders/RemindersPage'
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage'
import { BackupPage } from '@/features/backup/BackupPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { Badge } from '@/components/ui'

const ONBOARD_KEY = 'proofpocket_onboarded'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/purchases', label: 'Purchase Vault', icon: Package },
  { to: '/warranties', label: 'Warranties', icon: ShieldCheck },
  { to: '/complaints', label: 'Complaints', icon: Scale },
  { to: '/evidence', label: 'Evidence Locker', icon: FolderLock },
  { to: '/reminders', label: 'Reminders', icon: Bell },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/backup', label: 'Backup & Restore', icon: HardDrive },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

function Header() {
  const location = useLocation()
  const onLanding = location.pathname === '/'
  return (
    <header className="bg-white border-b border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800">
      <div className="flex items-center justify-between max-w-[1126px] mx-auto px-4 sm:px-6 py-3 w-full">
        <Link to="/" className="flex items-center gap-2.5 min-h-[40px]">
          <span className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center text-white font-bold" aria-hidden="true">P</span>
          <span className="text-lg font-semibold">ProofPocket</span>
        </Link>
        {onLanding ? (
          <nav className="flex items-center gap-2">
            <Link to="/dashboard" className="hidden sm:inline-flex text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white px-3 py-2">Open app</Link>
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 text-white text-sm font-medium px-4 py-2 hover:bg-sky-700 min-h-[40px]">Get started <ArrowRight className="h-4 w-4" /></Link>
          </nav>
        ) : (
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-neutral-500"><Lock className="h-3.5 w-3.5" /> 100% local — no account, no cloud</span>
        )}
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-6 mt-auto">
      <div className="max-w-[1126px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">© 2026 ProofPocket — Your purchases. Your evidence. Your control.</p>
        <p className="text-xs text-neutral-500">Data stays in this browser&apos;s IndexedDB. Backups are your responsibility.</p>
      </div>
    </footer>
  )
}

function Landing() {
  return (
    <main className="w-full">
      <section className="max-w-[1126px] mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <Badge tone="primary">Free &amp; open-source · Offline-first</Badge>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mt-5 text-neutral-900 dark:text-neutral-100" style={{ textWrap: 'balance' }}>Your purchases. Your evidence. Your control.</h1>
        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 mt-5 max-w-2xl mx-auto">ProofPocket helps you organise purchases, invoices, warranties and consumer complaints — entirely on your laptop. No accounts, no cloud, no API keys.</p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-sky-600 text-white font-medium px-6 py-3 hover:bg-sky-700 min-h-[48px]">Open ProofPocket <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/backup" className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-600 font-medium px-6 py-3 min-h-[48px]">How backups work</Link>
        </div>
        <p className="text-xs text-neutral-500 mt-4">Works offline after install. Your data never leaves this device unless you export it.</p>
      </section>

      <section className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-[1126px] mx-auto px-4 sm:px-6 py-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            ['Purchase Vault', 'Invoices, order IDs, payment methods and serial numbers in one searchable place.'],
            ['Warranty Manager', 'Automatic expiry dates and “expiring soon” alerts for every product you own.'],
            ['Complaint Manager', 'Reference numbers, statuses and priorities — linked to the purchase they concern.'],
            ['Complaint Timeline', 'Every call, email and company promise, in chronological order.'],
            ['Evidence Locker', 'Receipts, screenshots and PDFs stored locally as Blobs in IndexedDB.'],
            ['Backup & Restore', 'Complete ZIP backups with manifest and checksums. Move to any laptop.'],
          ].map(([title, body]) => (
            <div key={title} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h2 className="font-semibold mb-1">{title}</h2><p className="text-sm text-neutral-600 dark:text-neutral-300">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-[1126px] mx-auto px-4 sm:px-6 py-14">
          <h2 className="text-xl font-semibold mb-4">Private by design</h2>
          <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            {['No Google OAuth, cloud storage, analytics or telemetry.', 'No external network requests during normal use.', 'Browser storage is not encrypted — use a device password and keep backups safe.', 'You own the data. Export it any time as ZIP, JSON or CSV.'].map((t) => (
              <li key={t} className="flex gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />{t}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}

function Onboarding({ onDone }: { onDone: () => void }) {
  return (
    <main className="max-w-[1126px] mx-auto px-4 sm:px-6 py-10 w-full">
      <div className="max-w-xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome to ProofPocket</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">A quick tour before you start. Everything runs locally — here&apos;s what to know.</p>
        <ol className="space-y-4 mb-8">
          {[
            ['Your data stays here', 'Records and files live in this browser’s IndexedDB. Nothing is uploaded.'],
            ['Back up regularly', 'Browsers can clear local storage. Export a ZIP backup from Backup & Restore.'],
            ['Start with a purchase', 'Add a purchase, then link complaints and evidence to it.'],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-3"><span className="w-7 h-7 rounded-full bg-sky-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">{i + 1}</span><div><p className="font-medium">{title}</p><p className="text-sm text-neutral-600 dark:text-neutral-300">{body}</p></div></li>
          ))}
        </ol>
        <Button onClick={onDone}>Go to Dashboard</Button>
      </div>
    </main>
  )
}

function Dashboard() {
  const { purchases } = usePurchases()
  const { complaints } = useComplaints()
  const { reminders } = useReminders()
  const storage = useStorageMonitoring()
  const overdue = reminders.filter((r) => r.status === 'pending' && +new Date(r.remindAt) < Date.now()).length
  const expiring = purchases.filter((p) => p.warrantyExpiryDate && +new Date(p.warrantyExpiryDate) >= Date.now()).length

  const cards = [
    ['Total purchases', purchases.length, 'Products and services tracked'],
    ['Active complaints', complaints.length, 'Ongoing consumer issues'],
    ['Warranties tracked', expiring, 'With an expiry date'],
    ['Overdue reminders', overdue, 'Need your attention'],
  ] as const

  return (
    <div className="max-w-[1126px] mx-auto px-4 sm:px-6 py-8 w-full">
      <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 mb-6">Manage your purchases, warranties and complaints in one place.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(([label, value, hint]) => (
          <div key={label} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="text-sm text-neutral-500">{label}</div>
            <div className="text-3xl font-bold tabular-nums mt-1">{value}</div>
            <div className="text-xs text-neutral-500 mt-1">{hint}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3">Recent purchases</h2>
          {purchases.length === 0 ? <p className="text-sm text-neutral-500">No purchases yet. <Link className="text-sky-700 underline" to="/purchases">Add one</Link></p> : (
            <ul className="space-y-2">{purchases.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 5).map((p) => (
              <li key={p.id} className="flex justify-between gap-3 text-sm bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2"><span className="font-medium">{p.productName}</span><span className="text-neutral-500 tabular-nums">₹{p.price} • {new Date(p.purchaseDate).toLocaleDateString('en-IN')}</span></li>
            ))}</ul>
          )}
        </section>
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3">Storage</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 flex items-center gap-2"><Database className="h-4 w-4" /> {storage.error ? 'Could not read storage.' : `${storage.percentage < 1 ? '<1%' : `${Math.round(storage.percentage)}%`} of browser storage in use`}</p>
          <p className="text-xs text-neutral-500 mt-2">Export a ZIP backup regularly — browser storage is not a reliable archive.</p>
        </section>
      </div>
    </div>
  )
}

function Shell() {
  const location = useLocation()
  void location
  return (
    <div className="flex flex-1 w-full max-w-[1126px] mx-auto">
      <nav aria-label="Primary" className="hidden md:flex flex-col gap-1 w-56 shrink-0 border-r border-neutral-200 dark:border-neutral-800 px-3 py-6">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn('flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm min-h-[40px]', isActive ? 'bg-sky-50 text-sky-700 font-medium dark:bg-sky-900/30 dark:text-sky-300' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800')}>
            <Icon className="h-4 w-4 shrink-0" />{label}
          </NavLink>
        ))}
      </nav>
      <div className="flex-1 min-w-0">
        <nav aria-label="Primary mobile" className="md:hidden flex gap-2 overflow-x-auto px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          {NAV.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn('whitespace-nowrap rounded-full px-3 py-1.5 text-xs min-h-[36px] inline-flex items-center', isActive ? 'bg-sky-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800')}>{label}</NavLink>
          ))}
        </nav>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/warranties" element={<WarrantiesPage />} />
          <Route path="/complaints" element={<ComplaintsPage />} />
          <Route path="/evidence" element={<EvidencePage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  )
}

function App() {
  const [ready, setReady] = useState(false)
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARD_KEY) === '1')

  useEffect(() => {
    void initDatabaseWithDefaults().finally(() => setReady(true))
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const stored = localStorage.getItem('proofpocket_theme')
    document.documentElement.classList.toggle('dark', stored === 'dark' || (!stored && mq.matches))
  }, [])

  if (!ready) return <p className="p-10 text-center text-sm text-neutral-500">Opening your local database…</p>

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/*" element={onboarded ? <Shell /> : <Onboarding onDone={() => { localStorage.setItem(ONBOARD_KEY, '1'); setOnboarded(true) }} />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
