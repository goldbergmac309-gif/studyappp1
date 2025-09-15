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
  if (await inline.count()) {
    await inline.first().fill(name)
    await page.getByRole('button', { name: /^(?:\+\s*)?Create(?: Subject)?$/ }).click()
    await expect(page.getByText(name)).toBeVisible()
    return
  }
  // Fallback to modal tile
  const addTile = page.getByText('+ Add space')
  await addTile.click()
  // Wait for dialog and fill step 1
  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()
  const modalInput = modal.getByPlaceholder('e.g. Linear Algebra')
  await modalInput.fill(name)
  // Step 1 -> Continue
  await modal.getByRole('button', { name: /^Continue$/ }).click()
  // Step 2 -> Create Subject
  await modal.getByRole('button', { name: /^Create Subject$/ }).click()
  await expect(page.getByText(name)).toBeVisible()
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
