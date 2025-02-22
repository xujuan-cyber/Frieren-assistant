import { vi } from 'vitest'

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

// 全局注入 localStorage
global.localStorage = localStorageMock;

// 在每个测试之前重置 mock 状态
beforeEach(() => {
  localStorageMock.store.clear();
  vi.clearAllMocks();
}); 