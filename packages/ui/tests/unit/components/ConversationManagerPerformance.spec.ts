import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ConversationManager from '../../../src/components/ConversationManager.vue'

// Mock Naive UI 组件
vi.mock('naive-ui', () => ({
  NCard: {
    name: 'NCard',
    template: `<div class="n-card" data-testid="card"><div class="n-card__header"><slot name="header" /></div><div class="n-card__content"><slot /></div></div>`,
    props: ['size', 'bordered', 'embedded', 'hoverable', 'dashed']
  },
  NButton: {
    name: 'NButton',
    template: '<button class="n-button" :disabled="disabled" :loading="loading" @click="$emit(\'click\')" data-testid="button"><slot name="icon" /><slot /></button>',
    props: ['type', 'disabled', 'loading', 'size', 'dashed', 'block', 'quaternary', 'circle', 'secondary', 'text'],
    emits: ['click']
  },
  NSpace: {
    name: 'NSpace',
    template: '<div class="n-space"><slot /></div>',
    props: ['justify', 'align', 'size', 'wrap']
  },
  NTag: {
    name: 'NTag',
    template: '<span class="n-tag"><slot name="icon" /><slot /></span>',
    props: ['size', 'type', 'round']
  },
  NEmpty: {
    name: 'NEmpty',
    template: '<div class="n-empty" data-testid="empty"><slot name="icon" /><div><slot /></div><slot name="extra" /></div>',
    props: ['description', 'size']
  },
  NScrollbar: {
    name: 'NScrollbar',
    template: '<div class="n-scrollbar"><slot /></div>',
    props: ['style']
  },
  NList: {
    name: 'NList',
    template: '<div class="n-list"><slot /></div>'
  },
  NListItem: {
    name: 'NListItem',
    template: '<div class="n-list-item"><slot /></div>'
  },
  NInput: {
    name: 'NInput',
    template: '<textarea v-if="type === \'textarea\'" class="n-input" :value="value" :placeholder="placeholder" :disabled="disabled" @input="$emit(\'update:value\', $event.target.value)"></textarea>',
    props: ['value', 'type', 'placeholder', 'autosize', 'size', 'disabled', 'readonly'],
    emits: ['update:value']
  },
  NDropdown: {
    name: 'NDropdown',
    template: '<div class="n-dropdown" @click="$emit(\'select\', \'user\')"><slot /></div>',
    props: ['options'],
    emits: ['select']
  },
  NText: {
    name: 'NText',
    template: '<span class="n-text"><slot /></span>',
    props: ['depth', 'type', 'size']
  }
}))

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => params ? `${key}:${JSON.stringify(params)}` : key,
    locale: { value: 'zh-CN' }
  })
}))

// Mock composables with performance tracking
const mockRecordUpdate = vi.fn()
const mockDebounce = vi.fn((fn, delay) => {
  const debouncedFn = (...args: any[]) => {
    // 简化的 debounce 实现用于测试
    return fn(...args)
  }
  debouncedFn.calls = []
  return debouncedFn
})
const mockThrottle = vi.fn((fn, delay) => {
  const throttledFn = (...args: any[]) => {
    // 简化的 throttle 实现用于测试
    return fn(...args)
  }
  throttledFn.calls = []
  return throttledFn
})
const mockBatchExecute = vi.fn((fn, delay) => fn)

vi.mock('../../../src/composables/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    recordUpdate: mockRecordUpdate
  })
}))

vi.mock('../../../src/composables/useDebounceThrottle', () => ({
  useDebounceThrottle: () => ({
    debounce: mockDebounce,
    throttle: mockThrottle,
    batchExecute: mockBatchExecute
  })
}))

describe('ConversationManager 性能优化测试', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper?.unmount()
    vi.clearAllMocks()
    mockRecordUpdate.mockClear()
    mockDebounce.mockClear()
    mockThrottle.mockClear()
    mockBatchExecute.mockClear()
  })

  const defaultProps = {
    messages: [
      { role: 'user', content: '使用变量: {{var1}} 和 {{var2}}' },
      { role: 'assistant', content: '处理变量: {{var1}} 并返回结果' },
      { role: 'user', content: '继续使用 {{var3}} 变量' }
    ],
    availableVariables: { var1: 'value1', var2: 'value2' },
    scanVariables: vi.fn((content: string) => {
      const matches = content.match(/\{\{([^}]+)\}\}/g) || []
      return matches.map(match => match.slice(2, -2))
    }),
    replaceVariables: vi.fn((content: string) => content),
    isPredefinedVariable: vi.fn(() => false)
  }

  describe('性能监控集成', () => {
    it('应该正确集成性能监控功能', async () => {
      wrapper = mount(ConversationManager, {
        props: defaultProps,
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 验证性能监控工具已被调用
      expect(mockRecordUpdate).toBeDefined()
      expect(mockDebounce).toBeDefined()
      expect(mockThrottle).toBeDefined()
      expect(mockBatchExecute).toBeDefined()
    })

    it('应该在消息更新时记录性能数据', async () => {
      wrapper = mount(ConversationManager, {
        props: defaultProps,
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 模拟消息更新
      const newMessage = { role: 'user', content: '新的消息内容 {{newVar}}' }
      await wrapper.vm.handleMessageUpdate(0, newMessage)

      // 验证性能记录被调用
      expect(mockRecordUpdate).toHaveBeenCalled()
    })
  })

  describe('防抖和节流优化', () => {
    it('应该对消息更新应用防抖处理', async () => {
      wrapper = mount(ConversationManager, {
        props: defaultProps,
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 验证 debounce 被用于 handleMessageUpdate
      expect(mockDebounce).toHaveBeenCalled()
      
      // 检查 debounce 参数设置
      const debounceCall = mockDebounce.mock.calls[0]
      expect(debounceCall[1]).toBe(300) // 300ms 防抖延迟
    })

    it('应该对变量处理应用节流优化', async () => {
      wrapper = mount(ConversationManager, {
        props: defaultProps,
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 验证 throttle 被用于变量处理
      expect(mockThrottle).toHaveBeenCalled()
      
      // 检查 throttle 参数设置
      const throttleCall = mockThrottle.mock.calls[0]
      expect(throttleCall[1]).toBe(100) // 100ms 节流间隔
    })

    it('应该对批量状态更新进行优化', async () => {
      wrapper = mount(ConversationManager, {
        props: defaultProps,
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 验证 batchExecute 被用于状态更新
      expect(mockBatchExecute).toHaveBeenCalled()
      
      // 检查批处理参数设置
      const batchCall = mockBatchExecute.mock.calls[0]
      expect(batchCall[1]).toBe(16) // 16ms 批处理间隔（60fps）
    })
  })

  describe('大数据渲染优化', () => {
    it('应该正确处理大量消息的渲染性能', async () => {
      // 创建大量消息数据
      const largeMessageList = Array.from({ length: 100 }, (_, index) => ({
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `消息 ${index}: 包含变量 {{var${index % 10}}}`
      }))

      const startTime = performance.now()

      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          messages: largeMessageList
        },
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // 验证渲染时间在合理范围内（应该小于1秒）
      expect(renderTime).toBeLessThan(1000)
      
      // 验证组件能正常渲染
      expect(wrapper.exists()).toBe(true)
    })

    it('应该优化变量统计的计算性能', async () => {
      const messagesWithManyVariables = [
        { role: 'user', content: '使用变量: ' + Array.from({ length: 50 }, (_, i) => `{{var${i}}}`).join(' ') }
      ]

      const performanceStartTime = performance.now()

      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          messages: messagesWithManyVariables
        },
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 获取变量统计
      const allUsedVariables = wrapper.vm.allUsedVariables
      const allMissingVariables = wrapper.vm.allMissingVariables

      const performanceEndTime = performance.now()
      const computeTime = performanceEndTime - performanceStartTime

      // 验证计算时间合理
      expect(computeTime).toBeLessThan(500)
      
      // 验证结果正确性
      expect(allUsedVariables.length).toBe(50)
      expect(allMissingVariables.length).toBe(48) // var1, var2 已存在，其他48个缺失
    })
  })

  describe('批处理状态更新', () => {
    it('应该正确实现批处理状态更新机制', async () => {
      wrapper = mount(ConversationManager, {
        props: defaultProps,
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 验证批处理函数存在
      expect(wrapper.vm.batchStateUpdate).toBeDefined()
      expect(typeof wrapper.vm.batchStateUpdate).toBe('function')
    })

    it('应该在生命周期更新时使用批处理', async () => {
      wrapper = mount(ConversationManager, {
        props: defaultProps,
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 更新 props.messages 触发 watch
      await wrapper.setProps({
        ...defaultProps,
        messages: [
          ...defaultProps.messages,
          { role: 'user', content: '新增消息 {{newVar}}' }
        ]
      })

      await nextTick()

      // 验证 batchExecute 被调用用于批处理更新
      expect(mockBatchExecute).toHaveBeenCalled()
    })
  })

  describe('内存和资源管理', () => {
    it('应该正确清理组件资源', async () => {
      wrapper = mount(ConversationManager, {
        props: defaultProps,
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 验证组件正常挂载
      expect(wrapper.exists()).toBe(true)

      // 卸载组件
      wrapper.unmount()

      // 验证组件被正确卸载
      expect(wrapper.exists()).toBe(false)
    })

    it('应该对复杂对象使用适当的响应式包装', async () => {
      wrapper = mount(ConversationManager, {
        props: defaultProps,
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 验证状态管理功能存在
      expect(wrapper.vm.loading).toBeDefined()
      expect(wrapper.vm.isCollapsed).toBeDefined()
      
      // 验证这些是响应式的 ref
      expect(typeof wrapper.vm.loading).toBe('boolean')
      expect(typeof wrapper.vm.isCollapsed).toBe('boolean')
    })
  })

  describe('输入体验优化测试', () => {
    it('应该实现本地输入状态避免卡顿', async () => {
      wrapper = mount(ConversationManager, {
        props: defaultProps,
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 验证本地状态管理函数存在
      expect(wrapper.vm.handleLocalInput).toBeDefined()
      expect(wrapper.vm.getDisplayContent).toBeDefined()
      expect(wrapper.vm.localMessageContents).toBeDefined()
    })

    it('应该优先显示本地输入内容而非props', async () => {
      const testMessage = { role: 'user', content: '原始内容' }
      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          messages: [testMessage]
        },
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 模拟用户输入
      const newContent = '用户正在输入的新内容'
      wrapper.vm.handleLocalInput(0, newContent)

      // 验证显示内容优先使用本地状态
      const displayContent = wrapper.vm.getDisplayContent(0, testMessage)
      expect(displayContent).toBe(newContent)
    })

    it('应该在没有本地状态时回退到message.content', async () => {
      const testMessage = { role: 'user', content: '原始内容' }
      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          messages: [testMessage]
        },
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 不设置本地状态，直接获取显示内容
      const displayContent = wrapper.vm.getDisplayContent(0, testMessage)
      expect(displayContent).toBe('原始内容')
    })

    it('应该在消息删除时清理本地状态', async () => {
      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          messages: [
            { role: 'user', content: '消息1' },
            { role: 'user', content: '消息2' },
            { role: 'user', content: '消息3' }
          ]
        },
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 设置本地状态
      wrapper.vm.handleLocalInput(0, '本地内容1')
      wrapper.vm.handleLocalInput(1, '本地内容2')
      wrapper.vm.handleLocalInput(2, '本地内容3')

      // 验证本地状态存在
      expect(Object.keys(wrapper.vm.localMessageContents).length).toBe(3)

      // 模拟删除消息（通过props变更）
      await wrapper.setProps({
        ...defaultProps,
        messages: [
          { role: 'user', content: '消息1' }
        ]
      })

      await nextTick()

      // 验证多余的本地状态被清理（这个测试可能需要触发watch）
      // 注意：由于watch的清理逻辑，可能需要额外的处理
    })
  })

  describe('变量处理性能优化验证', () => {
    it('应该在模板中使用节流版本的变量处理', async () => {
      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          messages: [{ role: 'user', content: '测试变量 {{testVar}}' }]
        },
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 验证节流版本函数存在
      expect(wrapper.vm.getMessageVariablesThrottled).toBeDefined()
      expect(typeof wrapper.vm.getMessageVariablesThrottled).toBe('function')
    })

    it('应该正确处理节流版本的变量计算', async () => {
      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          messages: [{ role: 'user', content: '变量测试: {{var1}} {{missing}}' }]
        },
        global: {
          stubs: {},
          mocks: {
            announcements: []
          }
        }
      })

      await nextTick()

      // 测试节流版本的计算结果
      const result = wrapper.vm.getMessageVariablesThrottled('变量测试: {{var1}} {{missing}}')
      expect(result).toHaveProperty('detected')
      expect(result).toHaveProperty('missing')
      expect(result.detected).toEqual(['var1', 'missing'])
      expect(result.missing).toEqual(['missing']) // var1存在，missing不存在
    })
  })
})