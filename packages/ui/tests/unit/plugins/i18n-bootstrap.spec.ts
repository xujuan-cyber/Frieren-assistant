import { describe, expect, it } from 'vitest'

import { resolveDefaultLocale, sanitizeSupportedLocale } from '../../../src/plugins/i18n'

describe('i18n bootstrap helpers', () => {
  it('defaults to en-US when browser language is missing', () => {
    expect(resolveDefaultLocale(undefined)).toBe('en-US')
    expect(resolveDefaultLocale('')).toBe('en-US')
  })

  it('defaults to en-US even when browser language is Chinese', () => {
    expect(resolveDefaultLocale('zh-CN')).toBe('en-US')
    expect(resolveDefaultLocale('zh-TW')).toBe('en-US')
    expect(resolveDefaultLocale('zh-HK')).toBe('en-US')
  })

  it('keeps supported saved locales', () => {
    expect(sanitizeSupportedLocale('zh-CN')).toBe('zh-CN')
    expect(sanitizeSupportedLocale('zh-TW')).toBe('zh-TW')
    expect(sanitizeSupportedLocale('en-US')).toBe('en-US')
  })

  it('falls back to en-US for unsupported saved locales', () => {
    expect(sanitizeSupportedLocale('ja-JP')).toBe('en-US')
    expect(sanitizeSupportedLocale('')).toBe('en-US')
    expect(sanitizeSupportedLocale(undefined)).toBe('en-US')
  })
})
