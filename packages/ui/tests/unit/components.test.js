import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ActionButtonUI, ContentCardUI } from '../../src'

describe('基础UI组件测试', () => {
  describe('ActionButtonUI', () => {
    it('应该正确渲染按钮文本', () => {
      const buttonText = '测试按钮'
      const wrapper = mount(ActionButtonUI, {
        props: {
          text: buttonText,
          icon: '🔄'
        }
      })
      expect(wrapper.text()).toContain(buttonText)
    })

    it('应该正确处理loading状态', async () => {
      const wrapper = mount(ActionButtonUI, {
        props: {
          text: '测试按钮',
          icon: '🔄',
          loading: false
        }
      })
      
      // 初始状态不是loading
      expect(wrapper.props('loading')).toBe(false)
      
      // 修改为loading状态
      await wrapper.setProps({ loading: true })
      expect(wrapper.props('loading')).toBe(true)
    })
  })

  describe('ContentCardUI', () => {
    it('应该正确渲染slot内容', () => {
      const slotContent = '测试内容'
      const wrapper = mount(ContentCardUI, {
        slots: {
          default: slotContent
        }
      })
      expect(wrapper.text()).toContain(slotContent)
    })
  })
}) 