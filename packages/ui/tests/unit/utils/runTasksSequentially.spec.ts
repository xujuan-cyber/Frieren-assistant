import { describe, expect, it } from 'vitest'

import { runTasksSequentially } from '../../../src/utils/runTasksSequentially'

describe('runTasksSequentially', () => {
  it('按输入顺序依次执行异步任务', async () => {
    const started: number[] = []
    const completed: number[] = []

    const results = await runTasksSequentially([1, 2, 3], async (value) => {
      started.push(value)
      await new Promise((resolve) => setTimeout(resolve, 5))
      completed.push(value)
      return value * 10
    })

    expect(started).toEqual([1, 2, 3])
    expect(completed).toEqual([1, 2, 3])
    expect(results).toEqual([10, 20, 30])
  })
})
