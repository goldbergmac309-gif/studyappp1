import { test, expect } from '@playwright/test'
import { uniqueEmail, signUpAndGotoDashboard } from './helpers'

test.describe('Sidebar collapse and tooltips', () => {
  test('Collapses/expands and shows tooltips in rail mode', async ({ page, context }) => {
    await context.clearCookies()

    const email = uniqueEmail('e2e+sidebar')
    const password = 'password123'

    await signUpAndGotoDashboard(page, email, password, { verifyToast: 'soft' })

    // Initially expanded: sidebar brand shows full text 'Synapse'
    const sidebar = page.locator('nav')
    await expect(sidebar).toBeVisible()
    await expect(sidebar.getByText('Synapse')).toBeVisible()

    // Collapse via header trigger (scope to header to avoid rail ambiguity)
    await page.locator('header').getByRole('button', { name: 'Toggle Sidebar' }).click()

    // Collapsed: sidebar brand reduces to single letter 'S' and full text is hidden in sidebar
    await expect(sidebar.getByText('Synapse')).toHaveCount(0)
    await expect(sidebar.getByText(/^S$/)).toBeVisible()

    // Hover the Dashboard nav icon and assert tooltip appears
    const dashboardLink = sidebar.getByRole('link', { name: 'Dashboard' })
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
