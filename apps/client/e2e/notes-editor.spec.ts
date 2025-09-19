import { test, expect, Page } from '@playwright/test'

function uniqueEmail() {
  const ts = Date.now()
  return `e2e+${ts}@studyapp.dev`
}

async function clearClientState(page: Page) {
  await page.evaluate(() => {
    try { localStorage.clear() } catch {}
  })
}

test.use({ video: 'on' })

test.describe('Notes Editor (End-to-End)', () => {
  test('Create, edit with formatting, autosave, refresh persistence, rename, delete', async ({ page, context }) => {
    // Signup and land on dashboard
    const email = uniqueEmail()
    const password = 'password123'

    await context.clearCookies()
    await clearClientState(page)

    await page.goto('/signup')
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByPlaceholder('Your password').fill(password)
    await page.getByPlaceholder('Confirm password').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL(/\/dashboard$/)

    // Create a subject via modal
    const subjectName = `Notes E2E ${Date.now()}`
    // Open Subject creation modal (works for both empty and non-empty dashboards)
    const modalButton = page.getByRole('button', { name: /\+?\s*Create Subject/i })
    const count = await modalButton.count()
    if (count > 0) {
      await modalButton.first().click()
    } else {
      await page.getByText(/\+?\s*Add space/i).first().click()
    }
    const nameInput = page.getByPlaceholder('e.g. Linear Algebra')
    await expect(nameInput).toBeVisible({ timeout: 30000 })
    await nameInput.fill(subjectName)
    const colorInput = page.getByPlaceholder('#4F46E5')
    await colorInput.fill('#4F46E5')
    await page.getByRole('button', { name: /^Continue$/ }).click()
    await page.getByRole('button', { name: /^Create Subject$/ }).click()
    // Should navigate to subject workspace automatically
    await expect(page).toHaveURL(/\/subjects\//)

    // Go to Notes tab and remember URL for later
    await page.getByRole('tab', { name: /^Notes$/ }).click()
    await expect(page).toHaveURL(/tab=notes/)
    const notesUrl = page.url()

    // Empty state visible
    await expect(page.getByText('No notes yet — create your first note.')).toBeVisible()

    // Create a new note (click the sidebar header button)
    const postPromise = page.waitForResponse((res) => /\/subjects\/[^/]+\/notes$/.test(res.url()) && res.request().method() === 'POST' && res.status() >= 200 && res.status() < 300)
    await page.getByTestId('notes-new').click()
    await postPromise

    // Sidebar shows the note entry: empty state disappears and editor becomes available
    await expect(page.getByText('No notes yet — create your first note.')).toBeHidden({ timeout: 10000 })

    // Wait for editor panel title input to appear
    await expect(page.getByTestId('note-title')).toBeVisible({ timeout: 15000 })
    // Type content and apply formatting via floating toolbar
    const editorRoot = page.getByTestId('tiptap-editor')
    await expect(editorRoot).toBeVisible({ timeout: 15000 })
    const editor = editorRoot.locator('.ProseMirror')
    await expect(editor).toBeVisible({ timeout: 15000 })
    await editor.click()
    await editor.type('Bold text')
    // Select paragraph
    await editor.click({ clickCount: 3 })
    // Bold
    await page.getByRole('button', { name: /^B$/ }).click()
    // Newline and heading text
    await page.keyboard.press('Enter')
    await editor.type('My heading')
    // Select heading line and set H2
    await editor.click({ clickCount: 3 })
    await page.getByRole('button', { name: /^H2$/ }).click()
    // Newline and list item using input rule
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await editor.type('- First item')

    // Pause to allow autosave debounce (2s) to fire and complete
    // ("Saving…" may be brief; we assert that "Saved" appears.)
    await page.waitForTimeout(2500)
    await expect(page.getByTestId('saving-indicator')).toContainText('Saved', { timeout: 5000 })

    // Refresh and verify persistence (persist auth localStorage for reload)
    const authState = await page.evaluate(() => localStorage.getItem('studyapp-auth'))
    await context.addInitScript((state) => {
      try { if (state) localStorage.setItem('studyapp-auth', state as string) } catch {}
    }, authState)
    await page.reload()
    await page.goto(notesUrl)
    // Ensure Notes tab is active after reload
    await page.getByRole('tab', { name: /^Notes$/ }).click()
    await expect(page).toHaveURL(/tab=notes/)
    // Wait for editor panel to mount
    await expect(page.getByTestId('note-title')).toBeVisible({ timeout: 15000 })
    const editorRoot2 = page.getByTestId('tiptap-editor')
    const editor2 = editorRoot2.locator('.ProseMirror')
    await expect(editorRoot2).toBeVisible({ timeout: 15000 })
    await expect(editor2).toBeVisible({ timeout: 15000 })
    await expect(editor2.locator('li').first()).toContainText(/First/i)

    // Rename the note
    const titleInput = page.getByTestId('note-title')
    await expect(titleInput).toBeVisible()
    await titleInput.fill('Renamed note')
    await page.waitForTimeout(800) // title debounce 600ms
    await expect(page.getByTestId('saving-indicator')).toContainText('Saved', { timeout: 5000 })

    // Delete the note via editor Delete button
    page.once('dialog', async (dialog) => { await dialog.accept() })
    await page.getByRole('button', { name: /^Delete$/ }).click()

    // Verify empty state is back
    await expect(page.getByText('No notes yet — create your first note.')).toBeVisible()
  })
})
