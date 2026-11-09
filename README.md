# ProofPocket — Your purchases. Your evidence. Your control.

A completely local, offline-first, free and open-source consumer management app for anyone in India. Organise purchases, invoices, warranties, consumer complaints, complaint reference numbers, customer-service interactions, supporting evidence, follow-up reminders and complaint reports — **entirely on your laptop**.

No account. No cloud. No API keys. No internet required after install.

## Features

- **Purchase Vault** — product, brand, category, seller, date, price (₹ INR), invoice/order IDs, payment method, serial number, warranty details, receipt attachments. Search, sort, filter.
- **Warranty Manager** — automatic expiry from purchase date + warranty period (months), active / expiring-soon / expired tracking, configurable reminder window.
- **Complaint Manager** — companies, linked purchases, complaint reference numbers, priority, all 9 statuses (Draft → Closed), resolution details.
- **Complaint Timeline** — chronological calls, emails, messages, follow-ups, company promises, responses, escalations, resolutions — with optional evidence per entry.
- **Evidence Locker** — PDF/image/text uploads (validated type + 50 MB limit), stored as Blobs in IndexedDB, preview via download, replace by re-upload, delete.
- **Reminder Centre** — complaint follow-up, warranty and custom reminders; upcoming / overdue / completed; reschedule and complete. In-app only (browsers cannot fire notifications while closed).
- **PDF Complaint Reports** — generated locally with jsPDF: purchase, complaint, timeline, resolution, evidence index, generation date.
- **Backup & Restore (critical)** — complete ZIP backup (records + attachment files + `backup.json` + `manifest.json` + README), JSON backup, purchases/complaints CSV, backup history with SHA-256 checksums, merge/replace restore with validation. Corrupted files are rejected; existing data is never silently overwritten.
- **Analytics** — spend by category and complaints by status (Recharts), computed locally.
- **Settings** — light/dark/system theme, opt-in browser notifications (explicit permission), storage usage, danger-zone wipe.
- **Landing + first-time onboarding**, dashboard, empty/loading/error/success states, Indian date (`en-IN`) and ₹ formatting, mobile + desktop layouts.

## Screenshots

Run the app (below) and visit `/` (landing) and `/dashboard`. Screenshots are not committed since the UI is fully local; seed nothing — the app starts empty by design.

## Architecture

```
src/
  types/        Shared TypeScript types
  lib/db/       Dexie (IndexedDB) — versioned schema, quota handling, storage estimates
  lib/utils/    UUIDs, validation, INR/date formatting, warranty math, file validation, hashing
  lib/backup/   ZIP/JSON/CSV export, manifest + SHA-256, validated merge/replace restore
  lib/pdf/      Local jsPDF complaint reports
  hooks/        usePurchases / useComplaints / useReminders / useTimeline / useAttachments / useStorageMonitoring
  features/     One page per feature (purchases, warranties, complaints, evidence, reminders, analytics, backup, settings)
  components/   Button, Modal, Field, Badge, EmptyState (+ tests)
  App.tsx       Router, header/footer, landing, onboarding, dashboard, app shell
```

- **Database:** Dexie v4 over IndexedDB (`ProofPocketDB`, schema v1: purchases, complaints, attachments, timelineEntries, reminders, settings, backupMetadata — with indexes on foreign keys/dates). Multi-record operations run in Dexie transactions (e.g. complaint deletion cascades to timeline/attachments/reminders).
- **IDs:** UUID v4 everywhere; backup/restore preserves IDs and relationships.
- **Validation:** Zod + React Hook Form on all forms; MIME/extension/size checks on uploads; input sanitisation helpers; no `dangerouslySetInnerHTML`.

## Technology stack

React 19, TypeScript, Vite, Tailwind CSS v4, IndexedDB + Dexie, Zod, React Hook Form, Lucide icons, Recharts, jsPDF, JSZip, Vitest + React Testing Library (+ fake-indexeddb), Playwright.

## Installation & local development

```bash
git clone <this-repo> proofpocket && cd proofpocket
npm install
npm run dev        # http://localhost:5173
```

Production build:

```bash
npm run build      # outputs dist/
npm run preview    # serve the production build
```

**Normal-user install (no programming):** run `npm run build`, then serve `dist/` with any static file server (e.g. `npx serve dist`) and open the URL. Everything still runs locally in your browser. A Tauri desktop wrapper was investigated but deferred — it is not required; the browser version is fully functional and is the supported distribution.

## How data is stored

IndexedDB in the browser profile of the browser you open ProofPocket in (Chrome/Edge/Firefox/Safari). Attachments are stored as `Blob`s. `navigator.storage.persist()` is requested where supported, but **persistence is not guaranteed** — browsers may clear IndexedDB (e.g. storage pressure, profile reset). That is why backups exist.

**Privacy limitation:** ordinary browser storage is **not encrypted** against someone with access to your laptop/browser profile. Use an OS/device password, keep backup files in a safe place, and do not store secrets here. There is intentionally no PIN lock — a PIN screen alone would not encrypt data, and ProofPocket does not pretend otherwise.

## Backups & moving to another laptop

1. On the old laptop: **Backup & Restore → Complete ZIP backup** (or JSON).
2. Copy the `.zip` file to the new laptop (USB, etc.).
3. On the new laptop: open ProofPocket → **Backup & Restore → Restore ZIP**, choose **Merge** (keep current data) or **Replace** (wipe current data first).

The ZIP contains `backup.json` (all records + base64 attachments), `manifest.json` (per-table counts + SHA-256 checksums), and a README. Restore validates structure before writing and rejects malformed archives.

The File System Access API (`showSaveFilePicker`) is used where available (Chromium) for “save to a folder…”, with automatic download fallback everywhere else. ProofPocket never accesses files or folders without your explicit choice.

## Testing

```bash
npm test             # Vitest unit/integration (34 tests, >80% line coverage on tested lib code)
npm run test:coverage
npm run test:e2e     # Playwright (Chromium) — fresh browser profile per test
```

Covered: CRUD, IndexedDB persistence, complaint↔purchase relationships, timeline ordering, warranty math, file validation, backup validation, ZIP/JSON round-trips, corrupted-backup rejection, quota errors, PDF generation, purchase persistence across page reload (E2E).

## Known browser limitations

- IndexedDB quota varies by browser/device; very large evidence libraries may hit storage limits — export backups and prune old files.
- No background notifications while the browser is closed.
- Safari/Firefox do not support `showSaveFilePicker` — downloads are used instead.
- Playwright’s pinned version (1.48) is chosen because newer releases dropped support for older macOS; E2E requires that version’s Chromium.

## Contribution

Fork, branch (`feat/…`, `fix/…`), run `npm test && npm run build`, and open a PR. Conventional commits (`feat:`, `fix:`, `test:`, `docs:`…). Never commit user data, test databases, or secrets.

## Licence

MIT.
