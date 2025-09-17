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

async function createSubjectViaInlineOrModal(page: Page, name: string) {
  const inline = page.getByPlaceholder('e.g. Linear Algebra')
  const form = page.locator('form').filter({ has: inline.first() }).first()
  await expect(form).toBeVisible({ timeout: 30000 })
  await inline.first().scrollIntoViewIfNeeded()
  await inline.first().fill(name)
  await form.locator('button[type="submit"]').click()
  await expect(page.getByRole('link', { name: new RegExp(`${name}\\s+Open workspace`) })).toBeVisible()
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
    await createSubjectViaInlineOrModal(page, 'Biology')
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
