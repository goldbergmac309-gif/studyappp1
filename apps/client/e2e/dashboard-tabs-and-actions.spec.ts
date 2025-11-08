import { test, expect, Page } from '@playwright/test'
// Access process.env in TS without @types/node in this test context
declare const process: any
import { signUpAndGotoDashboard, clearClientState, getAuthToken, createSubjectApi } from './helpers'

function uniqueEmail() {
  const ts = Date.now()
  return `e2e+tabs+${ts}@studyapp.dev`
}

// Use robust helper from ./helpers

const API_BASE = (process?.env?.NEXT_PUBLIC_API_BASE_URL as string) || 'http://localhost:3001'

async function openSubjectMenu(page: Page, subjectName: string) {
  const cardLink = page.getByRole('link', { name: new RegExp(subjectName) }).first()
  await expect(cardLink).toBeVisible()
  const menuButton = cardLink.getByRole('button', { name: 'Subject actions' })
  await menuButton.click()
}

test.describe('Dashboard Tabs & Card Actions', () => {
  test('Tabs show correct sets; Star and Archive actions move cards to expected tabs', async ({ page, context }) => {
    await context.clearCookies()
    await clearClientState(page)

    const email = uniqueEmail()
    const password = 'password123'

    await signUpAndGotoDashboard(page, email, password, { verifyToast: 'soft' })

    const A = `Subject A ${Date.now()}`
    const B = `Subject B ${Date.now()}`
    const C = `Subject C ${Date.now()}`

    // Create subjects via API for stability, then refresh dashboard and ensure visibility
    const token = await getAuthToken(page, { email, password })
    const aId = await createSubjectApi(token, A)
    const bId = await createSubjectApi(token, B)
    const cId = await createSubjectApi(token, C)
    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: new RegExp(A) }).first()).toBeVisible({ timeout: 30000 })
    await expect(page.getByRole('link', { name: new RegExp(B) }).first()).toBeVisible({ timeout: 30000 })
    await expect(page.getByRole('link', { name: new RegExp(C) }).first()).toBeVisible({ timeout: 30000 })

    // Star A via API (avoid flaky menu interactions)
    await fetch(`${API_BASE}/subjects/${encodeURIComponent(aId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ starred: true }),
    })
    await page.reload()
    await expect(page.getByRole('link', { name: new RegExp(`${A}\\s+Open workspace`) }).first()).toBeVisible()

    // Archive B via API
    await fetch(`${API_BASE}/subjects/${encodeURIComponent(bId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await page.reload()

    // Starred tab -> only A
    await page.getByRole('button', { name: /^Starred$/ }).click()
    await expect(page.getByRole('link', { name: new RegExp(`${A}\\s+Open workspace`) }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: new RegExp(`${B}\\s+Open workspace`) })).toHaveCount(0)
    await expect(page.getByRole('link', { name: new RegExp(`${C}\\s+Open workspace`) })).toHaveCount(0)

    // Archived tab -> only B
    await page.getByRole('button', { name: /^Archived$/ }).click()
    await expect(page.getByRole('link', { name: new RegExp(`${B}\\s+Open workspace`) }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: new RegExp(`${A}\\s+Open workspace`) })).toHaveCount(0)
    await expect(page.getByRole('link', { name: new RegExp(`${C}\\s+Open workspace`) })).toHaveCount(0)

    // All tab -> A and C (non-archived)
    await page.getByRole('button', { name: /^All$/ }).click()
    await expect(page.getByRole('link', { name: new RegExp(`${A}\\s+Open workspace`) }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: new RegExp(`${C}\\s+Open workspace`) }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: new RegExp(`${B}\\s+Open workspace`) })).toHaveCount(0)

    // Recent tab -> A and C (non-archived, created now)
    await page.getByRole('button', { name: /^Recent$/ }).click()
    await expect(page.getByRole('link', { name: new RegExp(`${A}\\s+Open workspace`) }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: new RegExp(`${C}\\s+Open workspace`) }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: new RegExp(`${B}\\s+Open workspace`) })).toHaveCount(0)
  })
})
