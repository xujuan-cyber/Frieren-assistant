import { describe, expect, it, vi, afterEach } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import { beforeRouteSwitch, parseSubModeKey } from '../../../src/router/guards'

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
    })

    it('returns null for invalid sub mode paths', () => {
      expect(parseSubModeKey('/pro/system')).toBeNull()
      expect(parseSubModeKey('/image/unknown')).toBeNull()
      expect(parseSubModeKey('/other/path')).toBeNull()
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
  })
})
