import { afterEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

import {
  setupVCRForTest,
  throwIfCurrentTestHasVCRFailure,
  waitForConditionOrVCRFailure,
} from '../../../../../tests/e2e/helpers/vcr'

const sanitizeFixtureSegment = (name: string) =>
  name
    .replace(/\\/g, '-')
    .replace(/[^\u4e00-\u9fa5a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

const createFakeRoute = (body: Record<string, unknown>) => {
  const abort = vi.fn(async () => {})
  const continueFn = vi.fn(async () => {})
  const fulfill = vi.fn(async () => {})

  return {
    abort,
    continue: continueFn,
    fulfill,
    request: () => ({
      url: () => 'https://api.deepseek.com/v1/chat/completions',
      method: () => 'POST',
      postData: async () => JSON.stringify(body),
      headers: () => ({}),
    }),
  }
}

describe('E2E VCR auto replay behavior', () => {
  let fixtureDir = ''

  afterEach(async () => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()

    if (fixtureDir) {
      await fs.rm(fixtureDir, { recursive: true, force: true })
      fixtureDir = ''
    }
  })

  it('fails fast with a deterministic mock API error when a fixture file exists but the current interaction hash is missing', async () => {
    fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prompt-optimizer-vcr-'))

    vi.stubEnv('E2E_VCR_MODE', 'auto')
    vi.stubEnv('E2E_VCR_FIXTURE_DIR', fixtureDir)

    const testName = 'test\\image-text2image-generate.spec.ts'
    const testCase = '切换到 SiliconFlow 图像模型并生成图片（对比模式）'

    const fixturePath = path.join(
      fixtureDir,
      sanitizeFixtureSegment(testName),
      `${sanitizeFixtureSegment(testCase)}.json`
    )

    await fs.mkdir(path.dirname(fixturePath), { recursive: true })
    await fs.writeFile(
      fixturePath,
      JSON.stringify(
        {
          testName,
          testCase,
          interactions: [
            {
              provider: 'deepseek',
              url: 'https://api.deepseek.com/v1/chat/completions',
              method: 'POST',
              requestBody: { model: 'deepseek-chat', messages: [{ role: 'user', content: 'old body' }] },
              requestHash: 'fixture-only-hash',
              rawBody: 'data: [DONE]\n\n',
              responseHeaders: { 'content-type': 'text/event-stream' },
              responseBody: null,
              duration: 10,
              status: 200,
            },
          ],
        },
        null,
        2
      ),
      'utf8'
    )

    const handlers: Array<(route: any) => Promise<void>> = []
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const page = {
      route: vi.fn(async (_pattern: unknown, handler: (route: any) => Promise<void>) => {
        handlers.push(handler)
      }),
    }

    await setupVCRForTest(page as any, testName, testCase)

    const deepseekHandler = handlers[0]
    expect(deepseekHandler).toBeTypeOf('function')

    const route = createFakeRoute({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'new body' }],
      stream: true,
    })

    await deepseekHandler(route as any)

    expect(() => throwIfCurrentTestHasVCRFailure()).toThrowError(
      /Fixture interaction not found for test:/
    )
    await expect(
      waitForConditionOrVCRFailure(async () => false, {
        timeoutMs: 5000,
        intervalMs: 10,
        description: 'should stop immediately on VCR failure',
      }),
    ).rejects.toThrow(/Fixture interaction not found for test:/)

    expect(route.abort).not.toHaveBeenCalled()
    expect(route.continue).not.toHaveBeenCalled()
    expect(route.fulfill).toHaveBeenCalledOnce()
    expect(route.fulfill).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
        }),
      }),
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[VCR] ❌ Fixture interaction not found for test:')
    )
  })
})
