import { test, expect } from '../fixtures'

async function waitForWorkspace(page: any, mode: string) {
  const workspace = page
    .locator(`[data-testid="workspace"][data-mode="${mode}"]`)
    .first()
  await expect(workspace).toBeVisible({ timeout: 45000 })
}

test.describe('Root route bootstrap', () => {
  // 本文件专门验证「根路径 → 选择页」这一行为本身，故关闭 fixture 的自动进入
  test.use({ autoEnterPromptAssistant: false })

  test('navigating to / shows the assistant launcher', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 根路径不再自动重定向：先展示助手选择页，两个入口都必须可见
    await expect(page.getByTestId('assistant-launcher')).toBeVisible({ timeout: 45000 })
    await expect(page.getByTestId('launcher-card-prompt')).toBeVisible()
    await expect(page.getByTestId('launcher-card-translate')).toBeVisible()

    // 选择「提示词助手」后进入工作区；干净测试库下 global-settings 默认 basic/system
    await page.getByTestId('launcher-card-prompt').click()
    await waitForWorkspace(page, 'basic-system')
  })

  test('explicit navigation is not overridden by the launcher', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 立即导航到非根路由：选择页不得把用户拦回来。
    // （文件顶部已 test.use 关闭自动进入，因此此处停留在选择页属预期状态）
    await page.goto('/#/image/text2image')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/#\/image\/text2image/)
    await waitForWorkspace(page, 'image-text2image')
  })
})
