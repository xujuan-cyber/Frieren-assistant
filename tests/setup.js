import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// 模拟 Teleport 组件
config.global.stubs = {
  Teleport: {
    template: '<div><slot /></div>'
  }
}

// 模拟 localStorage
const localStorageMock = {
  store: new Map(),
  getItem: vi.fn((key) => {
    return localStorageMock.store.get(key) || null;
  }),
  setItem: vi.fn((key, value) => {
    localStorageMock.store.set(key, value);
  }),
  removeItem: vi.fn((key) => {
    localStorageMock.store.delete(key);
  }),
  clear: vi.fn(() => {
    localStorageMock.store.clear();
  })
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
});

// 在每个测试之前重置 localStorage
beforeEach(() => {
  localStorageMock.store.clear();
  vi.clearAllMocks();
});

// 模拟 clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn()
  }
}) 