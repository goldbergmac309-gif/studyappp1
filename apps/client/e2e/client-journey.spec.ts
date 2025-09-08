import { test, expect, Page } from '@playwright/test'

function uniqueEmail() {
  const ts = Date.now()
  return `e2e+${ts}@studyapp.dev`
}

async function clearClientState(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear()
    } catch {}
  })
}

test.describe('Client Gauntlet', () => {
  test('The New User Gauntlet (First Five Minutes)', async ({ page, context }) => {
    const email = uniqueEmail()
    const password = 'password123'

    await context.clearCookies()
    await clearClientState(page)

    await page.goto('/signup')
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByPlaceholder('Your password').fill(password)
    await page.getByPlaceholder('Confirm password').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByText('Account created')).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByText('No subjects yet')).toBeVisible()

    await page.getByPlaceholder('e.g. Linear Algebra').fill('Biology')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText('Biology')).toBeVisible()
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
    // Create a unique subject to avoid multiple matches
    await page.getByPlaceholder('e.g. Linear Algebra').fill(subjectName)
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText(subjectName)).toBeVisible()
    await page.getByRole('link', { name: new RegExp(subjectName) }).first().click()

    await page.getByRole('tab', { name: 'Documents' }).click()
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('e2e/fixtures/sample.pdf')

    // Wait for the new document row to appear
    const row = page.locator('div.flex.border, div[role="row"]').filter({ hasText: 'sample.pdf' }).first()
    await expect(row).toBeVisible()

    // Wait up to 90s for the status to become COMPLETED
    await expect(row.getByText('COMPLETED')).toBeVisible({ timeout: 90_000 })
  })
})
