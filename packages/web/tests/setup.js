import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// 模拟 window 对象
const windowMock = {
  localStorage: {
    store: new Map(),
    getItem: vi.fn((key) => {
      return windowMock.localStorage.store.get(key) || null;
    }),
    setItem: vi.fn((key, value) => {
      windowMock.localStorage.store.set(key, value);
    }),
    removeItem: vi.fn((key) => {
      windowMock.localStorage.store.delete(key);
    }),
    clear: vi.fn(() => {
      windowMock.localStorage.store.clear();
    })
  },
  navigator: {
    clipboard: {
      writeText: vi.fn()
    }
  },
  // 添加事件监听相关功能
  eventListeners: new Map(),
  addEventListener: vi.fn((event, handler) => {
    if (!windowMock.eventListeners.has(event)) {
      windowMock.eventListeners.set(event, new Set());
    }
    windowMock.eventListeners.get(event).add(handler);
  }),
  removeEventListener: vi.fn((event, handler) => {
    if (windowMock.eventListeners.has(event)) {
      windowMock.eventListeners.get(event).delete(handler);
    }
  }),
  dispatchEvent: vi.fn((event) => {
    if (windowMock.eventListeners.has(event.type)) {
      windowMock.eventListeners.get(event.type).forEach(handler => handler(event));
    }
    return true;
  })
};

// 全局注入 window mock
Object.defineProperty(global, 'window', {
  value: windowMock,
  writable: true,
  configurable: true
});

// 全局注入 localStorage
Object.defineProperty(global, 'localStorage', {
  value: windowMock.localStorage,
  writable: true,
  configurable: true
});

// 全局注入 navigator
Object.defineProperty(global, 'navigator', {
  value: windowMock.navigator,
  writable: true,
  configurable: true
});

// 模拟 Teleport 组件
config.global.stubs = {
  Teleport: {
    template: '<div><slot /></div>'
  }
}

// 在每个测试之前重置 mock 状态
beforeEach(() => {
  windowMock.localStorage.store.clear();
  windowMock.eventListeners.clear();
  vi.clearAllMocks();
}); 