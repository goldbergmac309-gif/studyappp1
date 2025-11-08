import { test, expect, Page } from '@playwright/test'
// Access process.env in TS without @types/node
declare const process: any
import { signUpAndGotoDashboard, clearClientState } from './helpers'
import fs from 'node:fs/promises'
import path from 'node:path'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

function uniqueEmail() {
  const ts = Date.now()
  return `e2e+consent+${ts}@studyapp.dev`
}

// clearClientState is imported from ./helpers

async function getAuthToken(page: Page, fallback: { email: string; password: string }): Promise<string> {
  const raw = await page.evaluate(() => localStorage.getItem('studyapp-auth'))
  if (raw) {
    const obj = JSON.parse(raw)
    const token = (obj?.state && (obj.state as { token?: string }).token) || obj?.token
    if (token) return token as string
  }
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: fallback.email, password: fallback.password }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
  const data = (await res.json()) as { accessToken?: string }
  if (!data?.accessToken) throw new Error('Login response missing accessToken')
  return data.accessToken
}

async function createSubject(token: string, name: string): Promise<string> {
  const createRes = await fetch(`${API_BASE}/subjects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  })
  if (!createRes.ok) throw new Error(`Create subject failed: ${createRes.status}`)
  const created = (await createRes.json()) as { id: string }
  return created.id
}

test.describe('AI Consent Flow', () => {
  test('Modal blocks AI usage until consent, then persists', async ({ page, context }) => {
    await context.clearCookies()
    await clearClientState(page)

    const email = uniqueEmail()
    const password = 'password123'

    // Sign up (robust helper ensures arrival at /dashboard)
    await signUpAndGotoDashboard(page, email, password, { verifyToast: 'soft' })

    const token = await getAuthToken(page, { email, password })

    // Create subject and navigate to canvas
    const subjectId = await createSubject(token, `Consent Flow ${Date.now()}`)
    await page.goto(`/subjects/${subjectId}/canvas`)

    // Trigger AI search by typing 2+ chars; expect modal to appear
    const input = page.getByPlaceholder(/Search your subject semantically/i)
    await input.fill('algebra')
    // Explicit click to trigger immediate search
    const btn = page.getByRole('button', { name: /^Search$/ })
    if (await btn.isEnabled()) await btn.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('AI Features Consent')).toBeVisible()

    // Agree to consent and expect the blocker to appear while the API is in flight
    await dialog.getByRole('button', { name: 'I Understand and Agree' }).click()
    const blocker = page.locator('[data-testid="consent-blocker"]')
    await expect(blocker).toBeVisible()
    // And then it must disappear once the consent API completes
    await expect(blocker).toBeHidden({ timeout: 30000 })
    // The consent dialog itself must now be closed
    const consentDialog = page.getByRole('dialog').filter({ hasText: 'AI Features Consent' })
    await expect(consentDialog).toBeHidden({ timeout: 10000 })

    // Refresh page – consent should persist
    await page.reload()
    // Attach debug snapshot (before wait)
    const before = await page.evaluate(() => ({
      localAuth: localStorage.getItem('studyapp-auth'),
      sessionCooldown: sessionStorage.getItem('ai-consent-cooldown-until'),
    }))
    try {
      const outDir = path.resolve(__dirname, '../test-results')
      await fs.mkdir(outDir, { recursive: true })
      await fs.writeFile(path.join(outDir, `consent-before-${Date.now()}.json`), JSON.stringify(before, null, 2))
    } catch {}
    // Explicitly wait until the persisted auth state reflects consent, to avoid hydration race
    try {
      await page.waitForFunction(() => {
        try {
          const raw = localStorage.getItem('studyapp-auth')
          if (!raw) return false
          const obj = JSON.parse(raw)
          const st = obj?.state || obj
          return st?.user?.hasConsentedToAi === true
        } catch { return false }
      }, { timeout: 15000 })
    } catch (err) {
      // Capture snapshot inline in error and to disk to guarantee availability even if page closes
      let after: any = {}
      try {
        after = await page.evaluate(() => ({
          localAuth: localStorage.getItem('studyapp-auth'),
          sessionCooldown: sessionStorage.getItem('ai-consent-cooldown-until'),
        }))
      } catch {}
      try {
        const outDir = path.resolve(__dirname, '../test-results')
        await fs.mkdir(outDir, { recursive: true })
        await fs.writeFile(path.join(outDir, `consent-after-${Date.now()}.json`), JSON.stringify(after, null, 2))
      } catch {}
      await test.info().attach('consent-storage-after-wait', { body: JSON.stringify(after, null, 2), contentType: 'application/json' })
      throw new Error('CONSENT_PERSIST_DEBUG ' + JSON.stringify(after))
    }
    const consentModal = page.getByRole('dialog').filter({ hasText: 'AI Features Consent' })
    await expect(consentModal).toBeHidden({ timeout: 10000 })

    // Try another search; modal should not block now
    await input.fill('calculus')
    if (await btn.isEnabled()) await btn.click()
    await expect(consentModal).toBeHidden({ timeout: 10000 })
  })
})
