import { test, expect } from '../fixtures'
import { navigateToMode } from '../helpers/common'

const MODE = 'image-text2image' as const

test.describe('Image Text2Image - 工作区入口', () => {
  test('文生图工作区不提供单独的提示词分析按钮', async ({ page }) => {
    await navigateToMode(page, 'image', 'text2image')

    const workspace = page.locator(`[data-testid="workspace"][data-mode="${MODE}"]`).first()
    await expect(workspace).toBeVisible()
    await expect(workspace.getByTestId(`${MODE}-analyze-button`)).toHaveCount(0)
  })
})
