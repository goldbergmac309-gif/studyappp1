import { expect, Page } from '@playwright/test'
// Access process.env in TS without @types/node in this test-only file
declare const process: any

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
const IS_MOCK = !!process.env.MOCK_CORE
const CLIENT_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'

export function uniqueEmail(prefix: string = 'e2e') {
  const ts = Date.now()
  return `${prefix}+${ts}@studyapp.dev`
}

export async function getAuthToken(page: Page, fallback: { email: string; password: string }): Promise<string> {
  const raw = await page.evaluate(() => localStorage.getItem('studyapp-auth'))
  if (raw) {
    try {
      const obj = JSON.parse(raw)
      const token = (obj?.state && (obj.state as { token?: string }).token) || obj?.token
      if (token) return token as string
    } catch {}
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

export async function createSubjectApi(token: string, name: string): Promise<string> {
  const createRes = await fetch(`${API_BASE}/subjects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  })
  if (!createRes.ok) throw new Error(`Create subject failed: ${createRes.status}`)
  const created = (await createRes.json()) as { id: string }
  return created.id
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

async function waitForClientReady(attempts = 120, delayMs = 1000) {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(CLIENT_BASE, { method: 'GET' })
      if (res.ok) return
    } catch (e) {
      lastErr = e
    }
    await new Promise((r) => setTimeout(r, delayMs))
  }
  throw lastErr || new Error('Client did not become ready')
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
    try { await waitForClientReady(60, 500) } catch {}
    const token = `test-token-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await page.addInitScript((t) => {
      try {
        ;(window as any).__E2E_AUTH__ = true
        // Provide a dummy refresh cookie so any silent refresh calls in test mode succeed
        try { document.cookie = 'refresh_token=1; path=/' } catch {}
        const key = 'studyapp-auth'
        const existingRaw = window.localStorage.getItem(key)
        if (existingRaw) {
          try {
            const obj = JSON.parse(existingRaw)
            if (obj && typeof obj === 'object') {
              if (obj.state && typeof obj.state === 'object') {
                obj.state = { ...obj.state, token: t }
              } else {
                obj.token = t
              }
              window.localStorage.setItem(key, JSON.stringify(obj))
              return
            }
          } catch {}
        }
        // Fallback: create minimal shape without clobbering potential future user
        const base = existingRaw ? existingRaw : JSON.stringify({})
        let prevUser: any = null
        try {
          const prevObj = JSON.parse(base)
          const prevState = (prevObj && (prevObj.state || prevObj)) || {}
          prevUser = (prevState && (prevState.user || prevObj?.user)) || null
        } catch {}
        const next = { token: t, state: { token: t, ...(prevUser ? { user: prevUser } : {}) } }
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {}
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
      try {
        ;(window as any).__E2E_AUTH__ = true
        // Provide a dummy refresh cookie so any silent refresh calls in test mode succeed
        try { document.cookie = 'refresh_token=1; path=/' } catch {}
        const key = 'studyapp-auth'
        const prevRaw = window.localStorage.getItem(key)
        const prevObj = prevRaw ? JSON.parse(prevRaw) : null
        const prevState = (prevObj && (prevObj.state || prevObj)) || {}
        const prevUser = (prevState && (prevState.user || prevObj?.user)) || null
        const next = { token: t, state: { token: t, ...(prevUser ? { user: prevUser } : {}) } }
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {}
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
      // If a color or required field exists, fill it to enable Continue
      try {
        const colorInput = page.getByPlaceholder('#4F46E5')
        if ((await colorInput.count()) > 0) {
          await colorInput.fill('#4F46E5')
        }
      } catch {}
      // Avoid relying on Continue; proceed to Create Subject when available
      const createBtn = page.getByRole('button', { name: /^Create Subject$/ })
      if ((await createBtn.count()) > 0) {
        // Wait a tick in case enablement is delayed by debounce
        try { await expect(createBtn).toBeEnabled({ timeout: 3000 }) } catch {}
        await createBtn.click()
      }
    } else {
      // 3) Last resort: "+ Add space" tile
      const addTile = page.getByText(/\+?\s*Add space/i).first()
      await addTile.scrollIntoViewIfNeeded()
      await addTile.click()
      const nameInput = page.getByPlaceholder('e.g. Linear Algebra')
      await expect(nameInput).toBeVisible({ timeout: 30000 })
      await nameInput.fill(name)
      // Try enablement fields if present
      try {
        const colorInput = page.getByPlaceholder('#4F46E5')
        if ((await colorInput.count()) > 0) {
          await colorInput.fill('#4F46E5')
        }
      } catch {}
      // Skip Continue path; rely on Create Subject if present
      const createBtn = page.getByRole('button', { name: /^Create Subject$/ })
      if ((await createBtn.count()) > 0) {
        try { await expect(createBtn).toBeEnabled({ timeout: 3000 }) } catch {}
        await createBtn.click()
      }
    }
  }

  // Assert card appears
  const link = page.getByRole('link', { name: new RegExp(`${escapeRegExp(name)}\\s+Open workspace`) })
  await expect(link).toBeVisible({ timeout: 30000 })
}
