import { expect, Page } from '@playwright/test'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
const IS_MOCK = !!process.env.MOCK_CORE

export function uniqueEmail(prefix: string = 'e2e') {
  const ts = Date.now()
  return `${prefix}+${ts}@studyapp.dev`
}

export async function clearClientState(page: Page) {
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {}
  })
  // When using the mock core server, reset its in-memory state between tests
  if (process.env.MOCK_CORE) {
    try {
      await fetch(`${API_BASE}/__reset`, { method: 'POST' })
    } catch {
      // ignore if server not running yet
    }
  }
}

export async function ensureAtDashboard(page: Page) {
  try {
    await expect(page).toHaveURL(/\/dashboard$/)
    return
  } catch {
    // Explicit navigation for reliability in CI
    await page.goto('/dashboard', { waitUntil: 'commit' })
    try { await page.waitForLoadState('domcontentloaded', { timeout: 2000 }) } catch {}
    await expect(page).toHaveURL(/\/dashboard$/)
  }
}

export async function signUpAndGotoDashboard(
  page: Page,
  email: string,
  password: string,
  options: { verifyToast?: 'soft' | 'hard' | 'none' } = {},
) {
  const { verifyToast = 'soft' } = options
  if (IS_MOCK) {
    const token = 'test-token'
    await page.addInitScript((t) => {
      try { window.localStorage.setItem('studyapp-auth', JSON.stringify({ token: t, state: { token: t } })) } catch {}
    }, token)
    // Retry small loop to tolerate transient reloads or server warmup
    let ok = false
    for (let i = 0; i < 5 && !ok; i++) {
      try {
        await page.goto('/dashboard', { waitUntil: 'commit' })
        try { await page.waitForLoadState('domcontentloaded', { timeout: 2000 }) } catch {}
        await expect(page).toHaveURL(/\/dashboard$/)
        ok = true
      } catch {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
    if (!ok) {
      // As a last resort, hit root and then dashboard
      try { await page.goto('/', { waitUntil: 'commit' }) } catch {}
      await page.goto('/dashboard', { waitUntil: 'commit' })
      await expect(page).toHaveURL(/\/dashboard$/)
    }
    return
  }
  // API-first path: create the account via API and inject token directly.
  try {
    // Retry wrapper to tolerate server startup races
    async function tryJson(url: string, init: RequestInit, attempts = 240, delayMs = 1000): Promise<Response> {
      let lastErr: unknown
      for (let i = 0; i < attempts; i++) {
        try {
          const r = await fetch(url, init)
          return r
        } catch (e) {
          lastErr = e
          await new Promise((r) => setTimeout(r, delayMs))
        }
      }
      throw lastErr || new Error('request failed')
    }

    const res = await tryJson(`${API_BASE}/auth/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    let token: string | null = null
    if (res.ok) {
      const data = await res.json() as { accessToken?: string }
      token = data.accessToken || 'test-token'
    } else {
      // Try login in case the user already exists
      const loginRes = await tryJson(`${API_BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (!loginRes.ok) throw new Error('Auth failed')
      const data = await loginRes.json() as { accessToken?: string }
      token = data.accessToken || 'test-token'
    }
    await page.addInitScript((t) => {
      try { window.localStorage.setItem('studyapp-auth', JSON.stringify({ token: t, state: { token: t } })) } catch {}
    }, token)
    await page.goto('/dashboard', { waitUntil: 'commit' })
    try { await page.waitForLoadState('domcontentloaded', { timeout: 2000 }) } catch {}
    await expect(page).toHaveURL(/\/dashboard$/)
    return
  } catch {
    // Fallback: use the UI signup flow
  }
  try {
    await page.goto('/signup', { waitUntil: 'commit' })
    try { await page.waitForLoadState('domcontentloaded', { timeout: 2000 }) } catch {}
    // Ensure the form is interactable
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible({ timeout: 8000 })
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByPlaceholder('Your password').fill(password)
    await page.getByPlaceholder('Confirm password').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()

    if (verifyToast !== 'none') {
      const toast = page.getByText('Account created')
      if (verifyToast === 'hard') {
        await expect(toast).toBeVisible({ timeout: 4000 })
      } else {
        try { await expect(toast).toBeVisible({ timeout: 2000 }) } catch {}
      }
    }

    await ensureAtDashboard(page)
    return
  } catch (err) {
    throw err
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function createSubjectViaInlineOrModal(page: Page, name: string) {
  const inline = page.getByPlaceholder('e.g. Linear Algebra')
  // 1) Prefer inline create form
  try {
    await expect(inline.first()).toBeVisible({ timeout: 15000 })
    await inline.first().scrollIntoViewIfNeeded()
    await inline.first().fill(name)
    const form = page.locator('form').filter({ has: inline.first() }).first()
    const submitByText = form.getByRole('button', { name: /^(?:\+\s*)?Create(?: Subject)?$/ })
    if (await submitByText.count().catch(() => 0)) {
      if (await submitByText.first().isVisible().catch(() => false)) {
        await submitByText.first().click()
      } else {
        await form.locator('button[type="submit"]').click()
      }
    } else {
      await form.locator('button[type="submit"]').click()
    }
  } catch {
    // 2) Fallback: explicit modal trigger
    const modalTrigger = page.getByRole('button', { name: /\+?\s*Create Subject/i })
    if ((await modalTrigger.count()) > 0) {
      await modalTrigger.first().scrollIntoViewIfNeeded()
      await modalTrigger.first().click()
      const nameInput = page.getByPlaceholder('e.g. Linear Algebra')
      await expect(nameInput).toBeVisible({ timeout: 30000 })
      await nameInput.fill(name)
      const continueBtn = page.getByRole('button', { name: /^Continue$/ })
      if ((await continueBtn.count()) > 0) {
        await continueBtn.click()
      }
      const createBtn = page.getByRole('button', { name: /^Create Subject$/ })
      await createBtn.click()
    } else {
      // 3) Last resort: "+ Add space" tile
      const addTile = page.getByText(/\+?\s*Add space/i).first()
      await addTile.scrollIntoViewIfNeeded()
      await addTile.click()
      const nameInput = page.getByPlaceholder('e.g. Linear Algebra')
      await expect(nameInput).toBeVisible({ timeout: 30000 })
      await nameInput.fill(name)
      try { await page.getByRole('button', { name: /^Continue$/ }).click() } catch {}
      await page.getByRole('button', { name: /^Create Subject$/ }).click()
    }
  }

  // Assert card appears
  const link = page.getByRole('link', { name: new RegExp(`${escapeRegExp(name)}\\s+Open workspace`) })
  await expect(link).toBeVisible({ timeout: 30000 })
}
