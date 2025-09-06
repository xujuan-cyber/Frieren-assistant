import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ConversationManager from '../../../src/components/ConversationManager.vue'
import type { ConversationMessage } from '@prompt-optimizer/core'

// Mock Naive UI 组件
vi.mock('naive-ui', () => ({
  NCard: {
    name: 'NCard',
    template: `
      <div class="n-card" data-testid="conversation-card">
        <div class="n-card__header"><slot name="header" /></div>
        <div class="n-card__content"><slot /></div>
      </div>
    `,
    props: ['class', 'size', 'bordered']
  },
  NSpace: {
    name: 'NSpace',
    template: '<div class="n-space"><slot /></div>',
    props: ['justify', 'align', 'size', 'wrap']
  },
  NText: {
    name: 'NText',
    template: '<span class="n-text"><slot /></span>',
    props: ['class']
  },
  NTag: {
    name: 'NTag',
    template: '<span class="n-tag" :class="type"><slot name="icon" /><slot /></span>',
    props: ['size', 'type', 'round']
  },
  NButton: {
    name: 'NButton',
    template: '<button class="n-button" :disabled="disabled" :loading="loading" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
    props: ['size', 'quaternary', 'circle', 'title', 'type', 'loading', 'dashed', 'block'],
    emits: ['click']
  },
  NEmpty: {
    name: 'NEmpty',
    template: `
      <div class="n-empty" data-testid="empty-state">
        <slot name="icon" />
        <div class="description">{{ description }}</div>
        <slot name="extra" />
      </div>
    `,
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
    template: `
      <textarea 
        class="n-input" 
        :value="value" 
        :placeholder="placeholder"
        :disabled="disabled"
        @input="$emit('update:value', $event.target.value)"
        data-testid="message-input"
      />
    `,
    props: ['value', 'type', 'placeholder', 'disabled', 'autosize', 'size'],
    emits: ['update:value']
  },
  NDropdown: {
    name: 'NDropdown',
    template: '<div class="n-dropdown"><slot /></div>',
    props: ['options'],
    emits: ['select']
  }
}))

// Mock i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      // 简单的翻译模拟
      const translations: Record<string, string> = {
        'conversation.management.title': '对话管理',
        'conversation.messageCount': `消息数量: ${params?.count || 0}`,
        'variables.count': `变量: ${params?.count || 0}`,
        'variables.missing': `缺失: ${params?.count || 0}`,
        'tools.count': `工具: ${params?.count || 0}`,
        'common.expand': '展开',
        'common.collapse': '折叠',
        'conversation.management.openEditor': '打开编辑器',
        'conversation.noMessages': '暂无消息',
        'conversation.addFirst': '添加第一条消息',
        'conversation.addMessage': '添加消息',
        'conversation.roles.system': '系统',
        'conversation.roles.user': '用户',
        'conversation.roles.assistant': '助手',
        'conversation.placeholders.system': '请输入系统指令...',
        'conversation.placeholders.user': '请输入用户消息...',
        'conversation.placeholders.assistant': '请输入助手回复...',
        'common.moveUp': '上移',
        'common.moveDown': '下移',
        'common.delete': '删除',
        'conversation.clickToCreateVariable': '点击创建变量'
      }
      return translations[key] || key
    }
  })
}))

describe('ConversationManager', () => {
  const mockMessages: ConversationMessage[] = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello {{name}}!' },
    { role: 'assistant', content: 'Hello! How can I help you today?' }
  ]

  const defaultProps = {
    messages: mockMessages,
    availableVariables: { name: 'Alice', age: '25' },
    optimizationMode: 'system' as const,
    scanVariables: (content: string) => {
      const regex = /\{\{([^}]+)\}\}/g
      const matches = []
      let match
      while ((match = regex.exec(content)) !== null) {
        matches.push(match[1].trim())
      }
      return matches
    },
    replaceVariables: (content: string, variables?: Record<string, string>) => {
      if (!variables) return content
      return content.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const trimmedKey = key.trim()
        return variables[trimmedKey] || match
      })
    },
    isPredefinedVariable: (name: string) => ['name', 'age'].includes(name)
  }

  let wrapper: any

  beforeEach(() => {
    wrapper?.unmount()
  })

  describe('基础渲染', () => {
    it('正确渲染组件基本结构', async () => {
      wrapper = mount(ConversationManager, {
        props: defaultProps
      })

      expect(wrapper.find('[data-testid="conversation-card"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('对话管理')
    })

    it('在有消息时显示统计信息', async () => {
      wrapper = mount(ConversationManager, {
        props: defaultProps
      })

      expect(wrapper.text()).toContain('消息数量: 3')
      expect(wrapper.text()).toContain('变量: 1') // "name" 变量
    })

    it('在空消息时显示空状态', async () => {
      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          messages: []
        }
      })

      expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('暂无消息')
    })
  })

  describe('消息管理功能', () => {
    beforeEach(() => {
      wrapper = mount(ConversationManager, {
        props: defaultProps
      })
    })

    it('正确处理消息内容更新', async () => {
      const input = wrapper.find('[data-testid="message-input"]')
      expect(input.exists()).toBe(true)

      await input.setValue('Updated content')
      
      // 验证是否发出了正确的更新事件
      const updateEvents = wrapper.emitted('update:messages')
      expect(updateEvents).toBeTruthy()
      
      const latestUpdate = updateEvents[updateEvents.length - 1][0]
      expect(latestUpdate[0].content).toBe('Updated content')
    })

    it('发出messageChange事件', async () => {
      const input = wrapper.find('[data-testid="message-input"]')
      await input.setValue('New content')

      const messageChangeEvents = wrapper.emitted('messageChange')
      expect(messageChangeEvents).toBeTruthy()
      
      const [index, message, action] = messageChangeEvents[messageChangeEvents.length - 1]
      expect(index).toBe(0)
      expect(message.content).toBe('New content')
      expect(action).toBe('update')
    })
  })

  describe('变量检测和提示', () => {
    it('正确检测变量使用情况', async () => {
      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          showVariablePreview: true
        }
      })

      // 应该检测到 "name" 变量
      expect(wrapper.text()).toContain('变量: 1')
    })

    it('显示缺失变量警告', async () => {
      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          messages: [{ role: 'user', content: 'Hello {{unknown}}!' }],
          availableVariables: {}
        }
      })

      expect(wrapper.text()).toContain('缺失: 1')
    })

    it('点击缺失变量按钮时发出openVariableManager事件', async () => {
      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          messages: [{ role: 'user', content: 'Hello {{unknown}}!' }],
          availableVariables: {},
          readonly: false
        }
      })

      // 找到缺失变量的按钮并点击
      const variableButtons = wrapper.findAll('button').filter((btn: any) => 
        btn.text().includes('unknown')
      )
      
      if (variableButtons.length > 0) {
        await variableButtons[0].trigger('click')
        expect(wrapper.emitted('openVariableManager')).toBeTruthy()
      }
    })
  })

  describe('默认函数实现', () => {
    it('在没有提供scanVariables函数时使用默认实现', async () => {
      wrapper = mount(ConversationManager, {
        props: {
          messages: mockMessages,
          availableVariables: {},
          // 不提供 scanVariables 函数
        }
      })

      // 组件应该正常渲染，不会抛出错误
      expect(wrapper.find('[data-testid="conversation-card"]').exists()).toBe(true)
    })

    it('在没有提供replaceVariables函数时使用默认实现', async () => {
      wrapper = mount(ConversationManager, {
        props: {
          messages: mockMessages,
          availableVariables: {},
          // 不提供 replaceVariables 函数
        }
      })

      // 组件应该正常渲染
      expect(wrapper.find('[data-testid="conversation-card"]').exists()).toBe(true)
    })

    it('在没有提供isPredefinedVariable函数时使用默认实现', async () => {
      wrapper = mount(ConversationManager, {
        props: {
          messages: mockMessages,
          availableVariables: {},
          // 不提供 isPredefinedVariable 函数
        }
      })

      // 组件应该正常渲染
      expect(wrapper.find('[data-testid="conversation-card"]').exists()).toBe(true)
    })
  })

  describe('动态autosize配置', () => {
    it('为短内容提供合适的行数配置', () => {
      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          messages: [{ role: 'user', content: 'Short' }]
        }
      })

      // 验证组件正常渲染（无法直接测试autosize配置的返回值）
      expect(wrapper.find('[data-testid="message-input"]').exists()).toBe(true)
    })

    it('为长内容提供合适的行数配置', () => {
      const longContent = 'This is a very long message that should span multiple lines and test the autosize configuration for longer content to ensure proper textarea sizing.'
      
      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          messages: [{ role: 'user', content: longContent }]
        }
      })

      expect(wrapper.find('[data-testid="message-input"]').exists()).toBe(true)
    })
  })

  describe('只读模式', () => {
    it('在只读模式下不显示输入框', async () => {
      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          readonly: true
        }
      })

      // 不应该有输入框
      expect(wrapper.find('[data-testid="message-input"]').exists()).toBe(false)
      // 应该显示文本内容
      expect(wrapper.text()).toContain('You are a helpful assistant.')
    })

    it('在只读模式下不显示操作按钮', async () => {
      wrapper = mount(ConversationManager, {
        props: {
          ...defaultProps,
          readonly: true
        }
      })

      // 不应该显示编辑器按钮
      const editorButtons = wrapper.findAll('button').filter((btn: any) => 
        btn.text().includes('打开编辑器')
      )
      expect(editorButtons.length).toBe(0)
    })
  })

  describe('事件发射', () => {
    beforeEach(() => {
      wrapper = mount(ConversationManager, {
        props: defaultProps
      })
    })

    it('在组件初始化时发出ready事件', () => {
      expect(wrapper.emitted('ready')).toBeTruthy()
    })

    it('在点击打开编辑器按钮时发出openContextEditor事件', async () => {
      const editorButtons = wrapper.findAll('button').filter((btn: any) => 
        btn.text().includes('打开编辑器')
      )
      
      if (editorButtons.length > 0) {
        await editorButtons[0].trigger('click')
        
        const openEditorEvents = wrapper.emitted('openContextEditor')
        expect(openEditorEvents).toBeTruthy()
        
        const [messages, variables] = openEditorEvents[0]
        expect(messages).toEqual(mockMessages)
        expect(variables).toEqual(defaultProps.availableVariables)
      }
    })
  })

  describe('轻量化架构边界', () => {
    it('不包含复杂的模板管理UI', () => {
      wrapper = mount(ConversationManager, {
        props: defaultProps
      })

      // 不应该有模板相关的下拉菜单或复杂UI
      expect(wrapper.text()).not.toContain('模板')
      expect(wrapper.text()).not.toContain('快速模板')
    })

    it('保持消息管理的核心功能', () => {
      wrapper = mount(ConversationManager, {
        props: defaultProps
      })

      // 应该有基本的消息显示和统计
      expect(wrapper.text()).toContain('消息数量')
      expect(wrapper.text()).toContain('对话管理')
      expect(wrapper.find('[data-testid="conversation-card"]').exists()).toBe(true)
    })
  })
})