import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('landing page shows tagline and CTA', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Your purchases/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Open ProofPocket/i })).toBeVisible()
})

test('onboarding gates the app until completed', async ({ page }) => {
  await page.getByRole('link', { name: /Open ProofPocket/i }).click()
  await expect(page.getByRole('heading', { name: /Welcome to ProofPocket/i })).toBeVisible()
  await page.getByRole('button', { name: /Go to Dashboard/i }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('add a purchase and verify it persists after reload', async ({ page }) => {
  await page.getByRole('link', { name: /Open ProofPocket/i }).click()
  await page.getByRole('button', { name: /Go to Dashboard/i }).click()
  await page.getByRole('link', { name: /Purchase Vault/i }).first().click()
  await page.getByRole('button', { name: /Add purchase/i }).first().click()
  await page.getByLabel(/Product name/i).fill('Samsung Galaxy M34')
  await page.getByLabel(/Brand/i).fill('Samsung')
  await page.getByLabel('Category *', { exact: true }).fill('Electronics')
  await page.getByLabel(/Seller/i).fill('Amazon India')
  await page.getByLabel(/Price/i).fill('18999')
  await page.getByLabel(/Warranty period/i).fill('12')
  await page.getByRole('dialog').getByRole('button', { name: 'Add purchase', exact: true }).click()
  await expect(page.getByText('Samsung Galaxy M34')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Samsung Galaxy M34')).toBeVisible()

  await page.getByRole('link', { name: /Warranties/i }).first().click()
  await expect(page.getByText('Samsung Galaxy M34')).toBeVisible()
})

test('create a complaint and add a timeline entry', async ({ page }) => {
  await page.getByRole('link', { name: /Open ProofPocket/i }).click()
  await page.getByRole('button', { name: /Go to Dashboard/i }).click()
  await page.getByRole('link', { name: /^Complaints$/i }).first().click()
  await page.getByRole('button', { name: /New complaint/i }).click()
  await page.getByLabel(/Company/i).fill('Samsung Support')
  await page.getByLabel(/Product \/ service/i).fill('Galaxy M34')
  await page.getByLabel(/Complaint number/i).fill('CMP/2026/001')
  await page.getByLabel(/Issue description/i).fill('Screen flickers after update')
  await page.getByRole('dialog').getByRole('button', { name: 'Create complaint' }).click()
  await expect(page.getByText('Samsung Support')).toBeVisible()

  await page.getByRole('button', { name: /Timeline & evidence/i }).click()
  await page.getByLabel(/Timeline description/i).fill('Called support, promised callback')
  await page.getByRole('button', { name: /Add timeline entry/i }).click()
  await expect(page.getByText('Called support, promised callback')).toBeVisible()
})

test('backup page loads and lists storage', async ({ page }) => {
  await page.getByRole('link', { name: /Open ProofPocket/i }).click()
  await page.getByRole('button', { name: /Go to Dashboard/i }).click()
  await page.getByRole('link', { name: /Backup & Restore/i }).first().click()
  await expect(page.getByRole('heading', { name: /Backup & Restore/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Complete ZIP backup/i })).toBeVisible()
})
