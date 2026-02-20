import { test as setup, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORAGE_STATE_PATH = path.join(__dirname, '..', '.auth', 'e2e-user.json')

/**
 * Authenticate via Cognito login page and save storage state.
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.CEI_E2E_EMAIL || 'e2e-test@cei-dev.local'
  const password = process.env.CEI_E2E_PASSWORD || ''

  if (!password) {
    throw new Error('CEI_E2E_PASSWORD env var is required')
  }

  const authDir = path.dirname(STORAGE_STATE_PATH)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  await page.goto('/')

  // Should show login page
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible({ timeout: 15_000 })

  // Fill credentials
  await page.getByLabel(/username|email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for authenticated app shell (home page loads)
  await expect(page.locator('.cei-app-layout')).toBeVisible({ timeout: 20_000 })

  await page.context().storageState({ path: STORAGE_STATE_PATH })
})

export { STORAGE_STATE_PATH }
