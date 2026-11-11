import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('mobile layout: nav and key actions usable on small viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('link', { name: /Open ProofPocket/i }).click()
  await page.getByRole('button', { name: /Go to Dashboard/i }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await page.getByRole('link', { name: /Purchase Vault/i }).first().click()
  await expect(page.getByRole('heading', { name: /Purchase Vault/i })).toBeVisible()
  await page.getByRole('button', { name: /Add purchase/i }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('slow/offline: app works with no network after load', async ({ page, context }) => {
  await page.getByRole('link', { name: /Open ProofPocket/i }).click()
  await page.getByRole('button', { name: /Go to Dashboard/i }).click()
  await context.setOffline(true)
  await page.getByRole('link', { name: /Purchase Vault/i }).first().click()
  await expect(page.getByRole('heading', { name: /Purchase Vault/i })).toBeVisible()
  await page.getByRole('button', { name: /Add purchase/i }).first().click()
  await page.getByLabel(/Product name/i).fill('Offline Item')
  await page.getByLabel(/Brand/i).fill('Brand')
  await page.getByLabel('Category *', { exact: true }).fill('Cat')
  await page.getByLabel(/Seller/i).fill('Seller')
  await page.getByLabel(/Price/i).fill('100')
  await page.getByRole('dialog').getByRole('button', { name: 'Add purchase', exact: true }).click()
  await expect(page.getByText('Offline Item')).toBeVisible()
  await context.setOffline(false)
})

test('input validation: rejects invalid purchase and shows errors', async ({ page }) => {
  await page.getByRole('link', { name: /Open ProofPocket/i }).click()
  await page.getByRole('button', { name: /Go to Dashboard/i }).click()
  await page.getByRole('link', { name: /Purchase Vault/i }).first().click()
  await page.getByRole('button', { name: /Add purchase/i }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Add purchase', exact: true }).click()
  await expect(page.getByText(/Required/i).first()).toBeVisible()
})

test('break attempts: corrupted backup rejected safely', async ({ page }) => {
  await page.getByRole('link', { name: /Open ProofPocket/i }).click()
  await page.getByRole('button', { name: /Go to Dashboard/i }).click()
  await page.getByRole('link', { name: /Backup & Restore/i }).first().click()
  const fileInput = page.locator('input[type="file"][accept=".json,application/json"]')
  await fileInput.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{not json') })
  await expect(page.getByRole('alert')).toBeVisible()
})
