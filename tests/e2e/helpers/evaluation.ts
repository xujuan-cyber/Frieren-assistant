import { expect, type Locator } from '@playwright/test'

export async function clickEvaluateButtonWithin(container: Locator): Promise<void> {
  let lastError: unknown = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const button = container.getByTestId('focus-analyze-main')
    await expect(button).toBeVisible({ timeout: 15000 })
    await expect(button).toBeEnabled({ timeout: 15000 })

    try {
      await button.click({ timeout: 15000 })
      return
    } catch (error) {
      lastError = error
      await container.page().waitForTimeout(500)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export async function getScoreBadgeValue(
  container: Locator,
  type: 'result' | 'compare',
): Promise<number> {
  const badge = container.getByTestId(`score-badge-${type}`)
  await expect(badge).toBeVisible({ timeout: 90000 })
  await expect(badge).not.toHaveClass(/loading/, { timeout: 60000 })

  const scoreValue = badge.getByTestId('score-value')
  await expect(scoreValue).toBeVisible({ timeout: 10000 })

  const text = (await scoreValue.textContent())?.trim() || '0'
  const score = Number.parseInt(text, 10)

  expect(score).toBeGreaterThan(0)
  expect(score).toBeLessThanOrEqual(100)

  return score
}
