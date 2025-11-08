import { test, expect } from '@playwright/test'
import { signUpAndGotoDashboard, clearClientState, uniqueEmail } from './helpers'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

test.describe('Global Aggregated Search UX', () => {
  test('Dashboard search navigates to /search and renders categorized results', async ({ page, context }) => {
    const email = uniqueEmail('globalsearch')
    const password = 'password123'

    await context.clearCookies()
    await clearClientState(page)

    // Sign up and land on dashboard
    await signUpAndGotoDashboard(page, email, password, { verifyToast: 'soft' })

    // Intercept GET /search to return mocked aggregated results
    await page.route(`${API_BASE.replace(/\/$/, '')}/search**`, async (route) => {
      const url = new URL(route.request().url())
      const q = (url.searchParams.get('q') || '').toLowerCase()
      const body = {
        notes: q ? [{ id: 'n-1', subjectId: 's-1', title: `Note matching ${q}`, updatedAt: new Date().toISOString() }] : [],
        documents: q ? [{ id: 'd-1', subjectId: 's-1', filename: `${q}-doc.pdf`, createdAt: new Date().toISOString() }] : [],
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    })

    // Use dashboard search form
    const input = page.getByPlaceholder('Search your knowledge')
    await expect(input).toBeVisible({ timeout: 15000 })
    await input.fill('Matrix')
    await page.getByRole('button', { name: /^Search$/ }).click()

    await expect(page).toHaveURL(/\/search\?q=Matrix/i)

    // Results page shows sections
    await expect(page.getByRole('heading', { name: /^Notes$/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Documents$/ })).toBeVisible()

    // Mocked items appear
    await expect(page.getByText(/Note matching matrix/i)).toBeVisible()
    await expect(page.getByText(/matrix-doc.pdf/i)).toBeVisible()

    // Header search input has been decommissioned
    await expect(page.getByPlaceholder('Search (⌘K)')).toHaveCount(0)
  })
})
