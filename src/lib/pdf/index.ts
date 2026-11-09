import { jsPDF } from 'jspdf'
import type { Complaint, Purchase, TimelineEntry, Attachment } from '@/types'
import { formatDateIN, formatINR } from '@/lib/utils'

export async function generateComplaintReport(complaint: Complaint, purchase: Purchase | null, timeline: TimelineEntry[], attachments: Attachment[]): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 15
  const width = 210 - margin * 2
  let y = 20

  const line = (text: string, size = 11, bold = false, gap = 6) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, width)
    doc.text(lines, margin, y)
    y += lines.length * (size * 0.45) + gap
    if (y > 270) { doc.addPage(); y = 20 }
  }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(10, 10, 10)
  doc.text('ProofPocket', margin, y); y += 8
  doc.setFontSize(13); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
  doc.text('Complaint Report — Your purchases. Your evidence. Your control.', margin, y); y += 12
  doc.setDrawColor(200, 200, 200); doc.line(margin, y, margin + width, y); y += 10

  line(`Generated: ${formatDateIN(new Date().toISOString())}`, 10, false, 10)
  line(`Company: ${complaint.companyName}`, 13, true)
  line(`Product / Service: ${complaint.productService}`)
  line(`Complaint No.: ${complaint.complaintNumber ?? '—'}`)
  line(`Registered: ${formatDateIN(complaint.registrationDate)}`)
  line(`Expected resolution: ${formatDateIN(complaint.expectedResolutionDate)}`)
  line(`Priority: ${complaint.priority}    Status: ${complaint.status}`)

  line('Issue description', 12, true)
  line(complaint.issueDescription)

  if (purchase) {
    line('Linked purchase', 12, true)
    line(`${purchase.productName} (${purchase.brand}) — ${purchase.seller}`)
    line(`Purchased: ${formatDateIN(purchase.purchaseDate)}    Price: ${formatINR(purchase.price)}`)
    if (purchase.invoiceNumber) line(`Invoice: ${purchase.invoiceNumber}`)
    if (purchase.orderId) line(`Order ID: ${purchase.orderId}`)
    if (purchase.serialNumber) line(`Serial: ${purchase.serialNumber}`)
  }

  line('Timeline', 12, true)
  if (timeline.length === 0) line('No timeline entries recorded.')
  for (const e of timeline) {
    line(`${formatDateIN(e.dateTime)} — ${e.type}: ${e.description}`, 10)
  }

  if (complaint.resolutionDetails) {
    line('Resolution details', 12, true)
    line(complaint.resolutionDetails)
  }

  line('Evidence index', 12, true)
  if (attachments.length === 0) line('No evidence attachments linked.')
  attachments.forEach((a, i) => line(`${i + 1}. ${a.originalName} (${a.mimeType}, ${(a.size / 1024).toFixed(1)} KB)`))

  line('This report was generated locally on your device. No data was sent to any server.', 9, false, 4)
  return doc.output('blob') as Blob
}
