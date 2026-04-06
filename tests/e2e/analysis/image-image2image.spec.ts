import { test, expect } from '../fixtures'
import { navigateToMode } from '../helpers/common'

const MODE = 'image-image2image' as const

test.describe('Image Image2Image - 工作区入口', () => {
  test('单图生图工作区不提供单独的提示词分析按钮', async ({ page }) => {
    await navigateToMode(page, 'image', 'image2image')

    const workspace = page.locator(`[data-testid="workspace"][data-mode="${MODE}"]`).first()
    await expect(workspace).toBeVisible()
    await expect(workspace.getByTestId(`${MODE}-analyze-button`)).toHaveCount(0)
  })
})
