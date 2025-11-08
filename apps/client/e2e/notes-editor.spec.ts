import { test, expect, Page } from '@playwright/test'
import { signUpAndGotoDashboard, clearClientState, getAuthToken, createSubjectApi } from './helpers'

function uniqueEmail() {
  const ts = Date.now()
  return `e2e+${ts}@studyapp.dev`
}

// Use shared clearClientState from helpers

test.use({ video: 'on' })

test.describe('Notes Editor (End-to-End)', () => {
  test('Create, edit with formatting, autosave, refresh persistence, rename, delete', async ({ page, context }) => {
    // Signup and land on dashboard
    const email = uniqueEmail()
    const password = 'password123'

    await context.clearCookies()
    await clearClientState(page)

    await signUpAndGotoDashboard(page, email, password, { verifyToast: 'soft' })

    // Create subject via API for stability and navigate directly
    const subjectName = `Notes E2E ${Date.now()}`
    const token = await getAuthToken(page, { email, password })
    const subjectId = await createSubjectApi(token, subjectName)
    await page.goto(`/subjects/${subjectId}`)
    await expect(page).toHaveURL(new RegExp(`/subjects/${subjectId}`))

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
