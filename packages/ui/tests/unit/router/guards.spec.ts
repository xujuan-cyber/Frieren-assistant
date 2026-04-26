import { describe, expect, it, vi, afterEach } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import { beforeRouteSwitch, parseSubModeKey } from '../../../src/router/guards'
import { normalizeWorkspacePath, parseWorkspaceRoutePath } from '../../../src/router/workspaceRoutes'

function createRoute(path: string): RouteLocationNormalized {
  return {
    path,
  } as RouteLocationNormalized
}

describe('router guards', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('parseSubModeKey', () => {
    it('parses valid sub mode paths', () => {
      expect(parseSubModeKey('/basic/system')).toBe('basic-system')
      expect(parseSubModeKey('/pro/multi')).toBe('pro-multi')
      expect(parseSubModeKey('/image/text2image')).toBe('image-text2image')
      expect(parseSubModeKey('/image/multiimage')).toBe('image-multiimage')
    })

    it('returns null for invalid sub mode paths', () => {
      expect(parseSubModeKey('/pro/system')).toBeNull()
      expect(parseSubModeKey('/image/unknown')).toBeNull()
      expect(parseSubModeKey('/other/path')).toBeNull()
      expect(parseSubModeKey('/favorites')).toBeNull()
    })
  })

  describe('workspace route helpers', () => {
    it('parses and normalizes workspace routes only', () => {
      expect(parseWorkspaceRoutePath('/basic/system')?.subModeKey).toBe('basic-system')
      expect(normalizeWorkspacePath('/image/text2image')).toBe('/image/text2image')
      expect(normalizeWorkspacePath(['/pro/variable'])).toBe('/pro/variable')
      expect(normalizeWorkspacePath('/favorites')).toBeNull()
      expect(normalizeWorkspacePath('/image/unknown')).toBeNull()
    })
  })

  describe('beforeRouteSwitch', () => {
    it('redirects legacy pro system route to multi mode', () => {
      const result = beforeRouteSwitch(createRoute('/pro/system'), createRoute('/'), undefined as never)

      expect(result).toBe('/pro/multi')
    })

    it('redirects legacy pro user route to variable mode', () => {
      const result = beforeRouteSwitch(createRoute('/pro/user'), createRoute('/'), undefined as never)

      expect(result).toBe('/pro/variable')
    })

    it('redirects invalid image sub mode to the default image route', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = beforeRouteSwitch(createRoute('/image/unknown'), createRoute('/'), undefined as never)

      expect(result).toBe('/image/text2image')
      expect(warnSpy).toHaveBeenCalledOnce()
    })

    it('allows valid routes to continue', () => {
      const result = beforeRouteSwitch(createRoute('/basic/user'), createRoute('/'), undefined as never)

      expect(result).toBe(true)
    })

    it('allows the root route to continue', () => {
      const result = beforeRouteSwitch(createRoute('/'), createRoute('/basic/system'), undefined as never)

      expect(result).toBe(true)
    })

    it('allows the favorites route to continue without workspace redirect', () => {
      const result = beforeRouteSwitch(createRoute('/favorites'), createRoute('/basic/system'), undefined as never)

      expect(result).toBe(true)
    })
  })
})
