import { test, expect, Page } from '@playwright/test'

function uniqueEmail() {
  const ts = Date.now()
  return `e2e+tabs+${ts}@studyapp.dev`
}

async function signUpAndGotoDashboard(page: Page, email: string, password: string) {
  await page.goto('/signup')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('Your password').fill(password)
  await page.getByPlaceholder('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

async function createSubject(page: Page, name: string) {
  const inline = page.getByPlaceholder('e.g. Linear Algebra')
  if (await inline.count()) {
    await expect(inline.first()).toBeVisible()
    await inline.first().fill(name)
    await page.getByRole('button', { name: /^(?:\+\s*)?Create(?: Subject)?$/ }).click()
    await expect(page.getByText(name)).toBeVisible()
    return
  }
  // Fallback to modal tile
  const addTile = page.getByText('+ Add space')
  await addTile.click()
  const modalInput = page.getByPlaceholder('e.g. Linear Algebra')
  await modalInput.fill(name)
  await page.getByRole('button', { name: /^Create Subject$/ }).click()
  await expect(page.getByText(name)).toBeVisible()
}

async function openSubjectMenu(page: Page, subjectName: string) {
  const cardLink = page.getByRole('link', { name: new RegExp(subjectName) }).first()
  await expect(cardLink).toBeVisible()
  const menuButton = cardLink.getByRole('button', { name: 'Subject actions' })
  await menuButton.click()
}

test.describe('Dashboard Tabs & Card Actions', () => {
  test('Tabs show correct sets; Star and Archive actions move cards to expected tabs', async ({ page, context }) => {
    await context.clearCookies()

    const email = uniqueEmail()
    const password = 'password123'

    await signUpAndGotoDashboard(page, email, password)

    const A = `Subject A ${Date.now()}`
    const B = `Subject B ${Date.now()}`
    const C = `Subject C ${Date.now()}`

    await createSubject(page, A)
    await createSubject(page, B)
    await createSubject(page, C)

    // Star A
    await openSubjectMenu(page, A)
    await page.getByRole('menuitem', { name: 'Star' }).click()
    await expect(page.getByText(A)).toBeVisible()

    // Archive B (accept confirm)
    page.once('dialog', (d) => d.accept())
    await openSubjectMenu(page, B)
    await page.getByRole('menuitem', { name: 'Archive' }).click()

    // Starred tab -> only A
    await page.getByRole('button', { name: 'Starred' }).click()
    await expect(page.getByText(A)).toBeVisible()
    await expect(page.getByText(B)).toHaveCount(0)
    await expect(page.getByText(C)).toHaveCount(0)

    // Archived tab -> only B
    await page.getByRole('button', { name: 'Archived' }).click()
    await expect(page.getByText(B)).toBeVisible()
    await expect(page.getByText(A)).toHaveCount(0)
    await expect(page.getByText(C)).toHaveCount(0)

    // All tab -> A and C (non-archived)
    await page.getByRole('button', { name: 'All' }).click()
    await expect(page.getByText(A)).toBeVisible()
    await expect(page.getByText(C)).toBeVisible()
    await expect(page.getByText(B)).toHaveCount(0)

    // Recent tab -> A and C (non-archived, created now)
    await page.getByRole('button', { name: 'Recent' }).click()
    await expect(page.getByText(A)).toBeVisible()
    await expect(page.getByText(C)).toBeVisible()
    await expect(page.getByText(B)).toHaveCount(0)
  })
})
