import { test, expect, Page } from '@playwright/test'

function uniqueEmail() {
  const ts = Date.now()
  return `e2e+sidebar+${ts}@studyapp.dev`
}

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('Your password').fill(password)
  await page.getByPlaceholder('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test.describe('Sidebar collapse and tooltips', () => {
  test('Collapses/expands and shows tooltips in rail mode', async ({ page, context }) => {
    await context.clearCookies()

    const email = uniqueEmail()
    const password = 'password123'

    await signUp(page, email, password)

    // Initially expanded: brand shows full text
    await expect(page.getByText('Synapse OS')).toBeVisible()

    // Collapse via header trigger (scope to header to avoid rail ambiguity)
    await page.locator('header').getByRole('button', { name: 'Toggle Sidebar' }).click()

    // Collapsed: brand reduces to single letter 'S' and full text is hidden
    await expect(page.getByText('Synapse OS')).toHaveCount(0)
    await expect(page.getByText(/^S$/)).toBeVisible()

    // Hover the Dashboard nav icon and assert tooltip appears
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' })
    await dashboardLink.hover()
    // Tooltip may not always have a name; check generic tooltip visibility and text
    const tooltip = page.getByRole('tooltip')
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toContainText('Dashboard')

    // Expand again
    await page.locator('header').getByRole('button', { name: 'Toggle Sidebar' }).click()
    await expect(page.getByText('Synapse OS')).toBeVisible()
  })
})
