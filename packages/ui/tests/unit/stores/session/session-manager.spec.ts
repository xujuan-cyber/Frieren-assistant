import { describe, it, expect, vi } from 'vitest'

import { createTestPinia, createPreferenceServiceStub } from '../../../utils/pinia-test-helpers'
import { useSessionManager } from '../../../../src/stores/session/useSessionManager'

describe('SessionManager', () => {
  it('cleans only the oversized session key when restore fails with session snapshot overflow', async () => {
    const deleteMock = vi.fn(async () => {})

    const { pinia, services } = createTestPinia({
      preferenceService: createPreferenceServiceStub({
        get: vi.fn(async () => {
          throw {
            code: 'error.storage.read',
            params: {
              reason: 'session_snapshot_too_large',
              key: 'session/v1/image-multiimage',
            },
          }
        }),
        delete: deleteMock,
      }),
      imageStorageService: {
        getImage: vi.fn(async () => null),
      } as any,
    })

    const manager = useSessionManager(pinia)

    await manager.restoreSubModeSession('image-multiimage')

    expect(deleteMock).toHaveBeenCalledTimes(1)
    expect(deleteMock).toHaveBeenCalledWith('session/v1/image-multiimage')
    expect(services.preferenceService.get).toHaveBeenCalledWith(
      'session/v1/image-multiimage',
      null,
    )
  })
})
