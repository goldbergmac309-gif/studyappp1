import { test, expect, Page } from '@playwright/test'
import { signUpAndGotoDashboard, clearClientState, createSubjectViaInlineOrModal, getAuthToken, createSubjectApi } from './helpers'

function uniqueEmail() {
  const ts = Date.now()
  return `e2e+${ts}@studyapp.dev`
}

// clearClientState imported from helpers

// use shared helper

test.describe('Client Gauntlet', () => {
  test('The New User Gauntlet (First Five Minutes)', async ({ page, context }) => {
    const email = uniqueEmail()
    const password = 'password123'

    await context.clearCookies()
    await clearClientState(page)

    await signUpAndGotoDashboard(page, email, password, { verifyToast: 'soft' })
    // Prefer API creation to avoid brittle UI state; then open workspace
    const token = await getAuthToken(page, { email, password })
    const subjectId = await createSubjectApi(token, 'Biology')
    await page.goto(`/subjects/${subjectId}`)
    await expect(page).toHaveURL(new RegExp(`/subjects/${subjectId}`))
  })

  test('The Unauthorized Access Gauntlet (Security)', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/') // redirect to /login
    await page.evaluate(() => localStorage.removeItem('studyapp-auth'))

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login(\?.*)?$/)

    await page.goto('/subjects/some-id')
    await expect(page).toHaveURL(/\/login(\?.*)?$/)
  })

  test('The Asynchronous Pipeline Gauntlet (Full Loop)', async ({ page }) => {
    if (!process.env.E2E_FULL) {
      test.skip(true, 'Set E2E_FULL=1 to run the full async pipeline gauntlet')
    }
    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill('admin@studyapp.dev')
    await page.getByPlaceholder('Your password').fill('admin12345')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Welcome back!')).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard$/)

    const subjectName = `Biology E2E ${Date.now()}`
    await createSubjectViaInlineOrModal(page, subjectName)
    await page.getByRole('link', { name: new RegExp(subjectName) }).first().click()

    await page.getByRole('tab', { name: /^Resources$/ }).click()
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('e2e/fixtures/sample.pdf')

    // Wait for the new document row to appear (list items are buttons)
    const row = page.getByRole('button', { name: /sample\.pdf/ }).first()
    await expect(row).toBeVisible({ timeout: 60_000 })

    // Wait up to 90s for the status to become COMPLETED
    await expect(row.getByText('COMPLETED')).toBeVisible({ timeout: 90_000 })
  })
})
