/**
 * 全局测试设置文件
 * 为所有测试提供通用的 mock 和环境配置
 */

import { vi } from 'vitest'

// Mock navigator.clipboard API (JSDOM doesn't provide this)
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue('mocked clipboard content')
  }
})

// Mock document.execCommand for fallback clipboard functionality
Object.assign(document, {
  execCommand: vi.fn().mockReturnValue(true)
})

// Mock window.getComputedStyle (sometimes needed for DOM tests)
Object.assign(window, {
  getComputedStyle: vi.fn().mockReturnValue({
    getPropertyValue: vi.fn().mockReturnValue('')
  })
})

// Mock ResizeObserver (commonly used in modern components)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver (used for lazy loading and scroll detection)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia (used for responsive design)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock scrollTo methods
Object.assign(window, {
  scrollTo: vi.fn(),
  scroll: vi.fn(),
})

Object.assign(Element.prototype, {
  scrollTo: vi.fn(),
  scroll: vi.fn(),
  scrollIntoView: vi.fn(),
})

console.log('[Test Setup] Global browser API mocks initialized')