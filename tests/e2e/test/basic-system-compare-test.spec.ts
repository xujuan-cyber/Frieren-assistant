import { test, expect } from '../fixtures'
import { navigateToMode } from '../helpers/common'
import { clickEvaluateButtonWithin, getScoreBadgeValue } from '../helpers/evaluation'
import {
  fillOriginalPrompt,
  clickOptimizeButton,
  expectOptimizedResultNotEmpty,
  expectOutputByTestIdNotEmpty,
} from '../helpers/optimize'

const MODE = 'basic-system' as const

async function openHoverCardFromBadge(badge: import('@playwright/test').Locator) {
  await badge.click()
  await expect(badge.page().getByTestId('evaluation-hover-re-evaluate')).toBeVisible()
}

test.describe('Basic System - 测试（对比模式）', () => {
  test('先优化，再在对比模式下测试，原始/优化结果都非空', async ({ page }) => {
    test.setTimeout(240000)

    await navigateToMode(page, 'basic', 'system')

    // 1) 左侧优化
    await fillOriginalPrompt(page, MODE, '你是一个诗人')
    await clickOptimizeButton(page, MODE)
    await expectOptimizedResultNotEmpty(page, MODE)

    // 2) 右侧测试输入
    const testInput = page.getByTestId('basic-system-test-input').locator('textarea')
    await testInput.fill('写一首小诗，表达ai时代的迷茫')

    // 3) 确保列数为 2（避免默认列数变化导致额外请求，影响 VCR fixture 匹配）
    const workspace = page.locator('[data-testid="workspace"][data-mode="basic-system"]').first()
    // Naive UI 的 radio button 真实可点元素是 label；若 value=2 已默认选中，click 会因拦截重试而超时。
    await workspace.getByRole('radio', { name: '2' }).check()

    // 4) 点击 Run All（触发 A=Original + B=Latest 两列测试）
    await page.getByTestId('basic-system-test-run-all').click()

    // 5) 断言两份输出均非空
    await expectOutputByTestIdNotEmpty(page, 'basic-system-test-original-output')
    await expectOutputByTestIdNotEmpty(page, 'basic-system-test-optimized-output')
  })

  test('测试后可触发单结果评估与对比评估', async ({ page }) => {
    test.setTimeout(240000)

    await navigateToMode(page, 'basic', 'system')

    await fillOriginalPrompt(page, MODE, '你是一个诗人')
    await clickOptimizeButton(page, MODE)
    await expectOptimizedResultNotEmpty(page, MODE)

    const testInput = page.getByTestId('basic-system-test-input').locator('textarea')
    await testInput.fill('写一首小诗，表达ai时代的迷茫')

    const workspace = page.locator('[data-testid="workspace"][data-mode="basic-system"]').first()
    await workspace.getByRole('radio', { name: '2' }).check()

    await page.getByTestId('basic-system-test-run-all').click()

    await expectOutputByTestIdNotEmpty(page, 'basic-system-test-original-output')
    await expectOutputByTestIdNotEmpty(page, 'basic-system-test-optimized-output')

    const originalOutput = page.locator('[data-testid="basic-system-test-original-output"]:visible').first()
    await clickEvaluateButtonWithin(originalOutput)
    await getScoreBadgeValue(originalOutput, 'result')

    const testToolbar = workspace.locator('.test-area-top').first()
    await clickEvaluateButtonWithin(testToolbar)
    await getScoreBadgeValue(testToolbar, 'compare')
  })

  test('测试文本清空后旧评估仍可查看且 result/compare 都不能重跑', async ({ page }) => {
    test.setTimeout(300000)

    await navigateToMode(page, 'basic', 'system')

    await fillOriginalPrompt(page, MODE, '你是一个诗人')
    await clickOptimizeButton(page, MODE)
    await expectOptimizedResultNotEmpty(page, MODE)

    const testInput = page.getByTestId('basic-system-test-input').locator('textarea')
    await testInput.fill('写一首小诗，表达ai时代的迷茫')

    const workspace = page.locator('[data-testid="workspace"][data-mode="basic-system"]').first()
    await workspace.getByRole('radio', { name: '2' }).check()

    await page.getByTestId('basic-system-test-run-all').click()
    await expectOutputByTestIdNotEmpty(page, 'basic-system-test-original-output')
    await expectOutputByTestIdNotEmpty(page, 'basic-system-test-optimized-output')

    const originalOutput = page.locator('[data-testid="basic-system-test-original-output"]:visible').first()
    await clickEvaluateButtonWithin(originalOutput)
    await getScoreBadgeValue(originalOutput, 'result')

    const testToolbar = workspace.locator('.test-area-top').first()
    await clickEvaluateButtonWithin(testToolbar)
    await getScoreBadgeValue(testToolbar, 'compare')

    await testInput.fill('')

    const resultBadge = originalOutput.getByTestId('score-badge-result')
    const compareBadge = workspace.locator('[data-testid="score-badge-compare"]')

    await expect(resultBadge).toBeVisible()
    await expect(compareBadge).toBeVisible()
    await expect(resultBadge).toHaveClass(/evaluation-score-badge-btn--stale/)
    await expect(compareBadge).toHaveClass(/evaluation-score-badge-btn--stale/)

    await openHoverCardFromBadge(resultBadge)
    await expect(page.getByTestId('evaluation-hover-re-evaluate')).toBeDisabled()
    await expect(
      page.getByText(/当前测试配置或工作区内容已变更|The test configuration or workspace content has changed/i)
    ).toBeVisible()
    await page.getByTestId('evaluation-hover-view-details').click()

    let drawer = page.locator('.n-drawer:visible').last()
    await expect(drawer).toBeVisible()
    await expect(drawer.getByTestId('evaluation-panel-re-evaluate')).toBeDisabled()
    await drawer.locator('.n-base-close').first().click()

    await openHoverCardFromBadge(compareBadge)
    await expect(page.getByTestId('evaluation-hover-re-evaluate')).toBeDisabled()
    await expect(
      page.getByText(/当前测试配置或工作区内容已变更|The test configuration or workspace content has changed/i)
    ).toBeVisible()
    await page.getByTestId('evaluation-hover-view-details').click()

    drawer = page.locator('.n-drawer:visible').last()
    await expect(drawer).toBeVisible()
    await expect(drawer.getByTestId('evaluation-panel-re-evaluate')).toBeDisabled()
  })
})
