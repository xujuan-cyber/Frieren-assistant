import { resolve } from 'node:path'

import { test, expect } from '../fixtures'
import { navigateToMode } from '../helpers/common'

test.describe('Image MultiImage - Session Persistence', () => {
  test('refresh keeps prompt, uploaded image count and test column selection', async ({ page }) => {
    await navigateToMode(page, 'image', 'multiimage')

    const workspace = page.locator('[data-mode="image-multiimage"]').first()
    await expect(workspace).toBeVisible({ timeout: 20000 })

    const promptInput = workspace.locator('textarea').first()
    await promptInput.fill('请把图1的人物放到图2的城市背景里，保持电影感')

    const fileInput = workspace.locator('input[type="file"]').first()
    await fileInput.setInputFiles([
      resolve(process.cwd(), 'tests/e2e/fixtures/images/text2image-output.png'),
      resolve(process.cwd(), 'packages/desktop/icons/app-icon.png'),
    ])

    await expect(workspace.getByText('图1', { exact: true })).toBeVisible({ timeout: 20000 })
    await expect(workspace.getByText('图2', { exact: true })).toBeVisible({ timeout: 20000 })

    await workspace.getByTestId('image-multiimage-columns-3').click()
    await expect(workspace.getByRole('radio', { name: '3' })).toBeChecked()

    await page.reload()
    await page.waitForLoadState('networkidle')

    const workspaceAfter = page.locator('[data-mode="image-multiimage"]').first()
    await expect(workspaceAfter).toBeVisible({ timeout: 20000 })

    await expect(workspaceAfter.locator('textarea').first()).toHaveValue('请把图1的人物放到图2的城市背景里，保持电影感')
    await expect(workspaceAfter.getByText('图1', { exact: true })).toBeVisible({ timeout: 20000 })
    await expect(workspaceAfter.getByText('图2', { exact: true })).toBeVisible({ timeout: 20000 })
    await expect(workspaceAfter.getByRole('radio', { name: '3' })).toBeChecked()
  })
})
