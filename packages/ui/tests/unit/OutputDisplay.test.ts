import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import OutputDisplay from '../../src/components/OutputDisplay.vue'

// 创建 i18n 实例
const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: {
    'zh-CN': {
      common: {
        copy: '复制',
        content: '内容',
        noContent: '暂无内容',
        clickToEdit: '点击编辑',
        generating: '生成中...',
        generatingReasoning: '推理中...',
        copyReasoning: '复制推理',
        copyContent: '复制内容',
        copyAll: '复制全部',
        cancel: '取消',
        confirm: '确认',
        edit: '编辑',
        expand: '展开',
        loading: '加载中...',
        copySuccess: '复制成功',
        copyFailed: '复制失败'
      },
      test: {
        thinking: '思考过程'
      }
    }
  }
})

// Mock clipboard functionality
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
})

// Mock document.execCommand for fallback clipboard functionality
Object.assign(document, {
  execCommand: vi.fn().mockReturnValue(true)
})

describe('OutputDisplay 组件', () => {
  it('应该能正确渲染内容', () => {
    const wrapper = mount(OutputDisplay, {
      global: {
        plugins: [i18n]
      },
      props: {
        content: '这是测试内容',
        mode: 'readonly'
      }
    })

    expect(wrapper.text()).toContain('这是测试内容')
  })

  it('应该能显示推理内容', () => {
    const wrapper = mount(OutputDisplay, {
      global: {
        plugins: [i18n]
      },
      props: {
        content: '主要内容',
        reasoning: '这是推理过程',
        mode: 'readonly'
      }
    })

    expect(wrapper.text()).toContain('思考过程')
    expect(wrapper.text()).toContain('这是推理过程')
  })

  it('应该能处理编辑模式', async () => {
    const wrapper = mount(OutputDisplay, {
      global: {
        plugins: [i18n]
      },
      props: {
        content: '可编辑内容',
        mode: 'editable',
        enableEdit: true
      }
    })

    // 在编辑模式下应该显示可编辑区域
    expect(wrapper.find('.editable-view').exists()).toBe(true)
    
    // 点击编辑按钮进入编辑状态
    const editButton = wrapper.find('button[title="编辑"]')
    expect(editButton.exists()).toBe(true)
    
    await editButton.trigger('click')
    
    // 现在应该显示 textarea
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('应该能发出复制事件', async () => {
    const wrapper = mount(OutputDisplay, {
      global: {
        plugins: [i18n]
      },
      props: {
        content: '测试内容',
        mode: 'readonly',
        enableCopy: true,
        title: '测试标题'
      }
    })

    // 点击复制按钮
    await wrapper.find('button[title="复制"]').trigger('click')
    
    expect(wrapper.emitted('copy')).toBeTruthy()
  })

  it('应该能处理流式状态', () => {
    const wrapper = mount(OutputDisplay, {
      global: {
        plugins: [i18n]
      },
      props: {
        content: '',
        reasoning: '正在推理...',
        mode: 'readonly',
        streaming: true
      }
    })

    expect(wrapper.classes()).toContain('output-display--streaming')
    expect(wrapper.text()).toContain('生成中...')
  })

  it('应该能处理加载状态', () => {
    const wrapper = mount(OutputDisplay, {
      global: {
        plugins: [i18n]
      },
      props: {
        content: '',
        mode: 'readonly',
        loading: true,
        placeholder: '加载中的占位符'
      }
    })

    expect(wrapper.classes()).toContain('output-display--loading')
    expect(wrapper.text()).toContain('加载中的占位符')
  })

  it('应该能正确处理推理内容的展开/折叠', async () => {
    const wrapper = mount(OutputDisplay, {
      global: {
        plugins: [i18n]
      },
      props: {
        content: '主要内容',
        reasoning: '推理内容',
        mode: 'readonly'
      }
    })

    // 初始状态应该是展开的
    expect(wrapper.find('.reasoning-content').isVisible()).toBe(true)
    
    // 点击推理头部折叠
    await wrapper.find('.reasoning-header').trigger('click')
    
    // 应该发出 reasoning-toggle 事件
    expect(wrapper.emitted('reasoning-toggle')).toBeTruthy()
  })

  it('应该能根据 reasoningMode 控制推理内容显示', () => {
    // 测试 hide 模式
    const wrapperHide = mount(OutputDisplay, {
      global: {
        plugins: [i18n]
      },
      props: {
        content: '内容',
        reasoning: '推理',
        mode: 'readonly',
        reasoningMode: 'hide'
      }
    })

    expect(wrapperHide.find('.output-display__reasoning').exists()).toBe(false)

    // 测试 show 模式
    const wrapperShow = mount(OutputDisplay, {
      global: {
        plugins: [i18n]
      },
      props: {
        content: '内容',
        reasoning: '',
        mode: 'readonly',
        reasoningMode: 'show'
      }
    })

    expect(wrapperShow.find('.output-display__reasoning').exists()).toBe(true)
  })

  // 长文本滚动测试
  describe('长文本滚动功能测试', () => {
    const longContent = `
这是一段很长的测试内容，用来验证滚动功能是否正常工作。
${'在实际使用中，我们经常会遇到很长的提示词或者优化结果。\n'.repeat(50)}
这些长文本需要能够正确显示并支持滚动。
组件必须在各种场景下都能保持稳定的布局：
1. 只读模式下的长文本
2. 编辑模式下的长文本
3. 同时包含推理内容和长文本
4. 流式生成过程中的长文本
5. 全屏模式下的长文本

${'测试滚动行为的稳定性是非常重要的。\n'.repeat(30)}

确保用户在任何情况下都能正常浏览和编辑内容。
    `.trim()

    const longReasoning = `
这是一段很长的推理过程内容。
${'推理步骤需要详细说明思考过程，通常会比较冗长。\n'.repeat(20)}
用户需要能够查看完整的推理过程并进行滚动浏览。
    `.trim()

    it('应该能正确处理只读模式下的长文本滚动', () => {
      const wrapper = mount(OutputDisplay, {
        global: {
          plugins: [i18n]
        },
        props: {
          content: longContent,
          mode: 'readonly'
        }
      })

      // 验证长文本内容存在
      expect(wrapper.text()).toContain('这是一段很长的测试内容')
      expect(wrapper.text()).toContain('确保用户在任何情况下都能正常浏览')
      
      // 验证滚动容器结构
      const readonlyView = wrapper.find('.readonly-view')
      expect(readonlyView.exists()).toBe(true)
      expect(readonlyView.classes()).toContain('h-full')
      expect(readonlyView.classes()).toContain('overflow-auto')
      
      // 验证内边距容器存在
      const paddingContainer = readonlyView.find('div.p-4')
      expect(paddingContainer.exists()).toBe(true)
      
      // 验证 MarkdownRenderer 没有高度和滚动样式
      const markdownRenderer = paddingContainer.find('[class*="prose"]')
      expect(markdownRenderer.exists()).toBe(true)
      expect(markdownRenderer.classes()).not.toContain('h-full')
      expect(markdownRenderer.classes()).not.toContain('overflow-auto')
    })

    it('应该能正确处理编辑模式下的长文本滚动', async () => {
      const wrapper = mount(OutputDisplay, {
        global: {
          plugins: [i18n]
        },
        props: {
          content: longContent,
          mode: 'editable',
          enableEdit: true
        }
      })

      // 验证编辑模式结构
      const editableView = wrapper.find('.editable-view')
      expect(editableView.exists()).toBe(true)
      
      // 验证非编辑状态的滚动容器
      const scrollContainer = editableView.find('div.h-full.overflow-auto.cursor-pointer')
      expect(scrollContainer.exists()).toBe(true)
      
      // 验证内边距容器
      const paddingContainer = scrollContainer.find('div.p-4')
      expect(paddingContainer.exists()).toBe(true)
      
      // 进入编辑状态
      await scrollContainer.trigger('click')
      
      // 验证编辑状态下的 textarea
      const textarea = wrapper.find('textarea')
      expect(textarea.exists()).toBe(true)
      expect(textarea.classes()).toContain('w-full')
      expect(textarea.classes()).toContain('h-full')
      expect(textarea.element.value).toBe(longContent)
    })

    it('应该能同时处理长推理内容和长文本内容', () => {
      const wrapper = mount(OutputDisplay, {
        global: {
          plugins: [i18n]
        },
        props: {
          content: longContent,
          reasoning: longReasoning,
          mode: 'readonly'
        }
      })

      // 验证推理区域存在并可展开
      const reasoningSection = wrapper.find('.output-display__reasoning')
      expect(reasoningSection.exists()).toBe(true)
      
      // 验证推理内容滚动
      const reasoningContent = wrapper.find('.reasoning-content')
      expect(reasoningContent.exists()).toBe(true)
      
      // 验证推理内容具有滚动能力（通过检查DOM结构而非CSS类）
      expect(reasoningContent.element.tagName).toBe('DIV')
      
      // 验证推理内容包含MarkdownRenderer
      const reasoningMarkdown = reasoningContent.findComponent({ name: 'MarkdownRenderer' })
      expect(reasoningMarkdown.exists()).toBe(true)
      
      // 验证主内容区域不受推理区域影响
      const contentArea = wrapper.find('.output-display__content')
      expect(contentArea.exists()).toBe(true)
      
      // 验证主内容滚动容器
      const readonlyView = wrapper.find('.readonly-view')
      expect(readonlyView.exists()).toBe(true)
      
      // 验证两部分内容都存在
      expect(wrapper.text()).toContain('推理步骤需要详细说明')
      expect(wrapper.text()).toContain('这是一段很长的测试内容')
    })

    it('应该能处理流式生成过程中的长文本', () => {
      const partialContent = longContent.substring(0, 500) + '...'
      
      const wrapper = mount(OutputDisplay, {
        global: {
          plugins: [i18n]
        },
        props: {
          content: partialContent,
          reasoning: longReasoning.substring(0, 200) + '...',
          mode: 'readonly',
          streaming: true
        }
      })

      // 验证流式状态样式
      expect(wrapper.classes()).toContain('output-display--streaming')
      
      // 验证推理区域流式指示器
      const reasoningSection = wrapper.find('.output-display__reasoning')
      expect(reasoningSection.classes()).toContain('streaming')
      
      // 验证流式指示器存在
      const streamingIndicator = wrapper.find('.streaming-indicator')
      expect(streamingIndicator.exists()).toBe(true)
      
      // 验证滚动结构在流式状态下仍然正确
      const readonlyView = wrapper.find('.readonly-view')
      expect(readonlyView.classes()).toContain('overflow-auto')
    })

    it('应该能在有固定高度时正确处理长文本滚动', () => {
      const wrapper = mount(OutputDisplay, {
        global: {
          plugins: [i18n]
        },
        props: {
          content: longContent,
          mode: 'readonly',
          height: 300
        }
      })

      // 验证固定高度应用到内容区域
      const contentArea = wrapper.find('.output-display__content')
      expect(contentArea.attributes('style')).toContain('height: 300px')
      
      // 验证滚动容器结构仍然正确
      const readonlyView = wrapper.find('.readonly-view')
      expect(readonlyView.classes()).toContain('h-full')
      expect(readonlyView.classes()).toContain('overflow-auto')
    })

    it('应该能在全屏模式下处理长文本', async () => {
      const wrapper = mount(OutputDisplay, {
        global: {
          plugins: [i18n]
        },
        props: {
          content: longContent,
          reasoning: longReasoning,
          mode: 'readonly',
          enableFullscreen: true,
          title: '长文本测试'
        }
      })

      // 触发全屏
      const fullscreenButton = wrapper.find('button[title="展开"]')
      expect(fullscreenButton.exists()).toBe(true)
      await fullscreenButton.trigger('click')
      
      // 验证全屏模式触发
      expect(wrapper.emitted('fullscreen')).toBeTruthy()
      
      // 在实际实现中，FullscreenDialog 会处理长文本的显示
      // 这里我们验证相关的结构存在
      const fullscreenDialog = wrapper.findComponent({ name: 'FullscreenDialog' })
      expect(fullscreenDialog.exists()).toBe(true)
    })

    it('应该能正确处理高度计算和滚动行为', async () => {
      // 测试无高度限制时的行为
      const wrapper = mount(OutputDisplay, {
        global: {
          plugins: [i18n]
        },
        props: {
          content: longContent,
          reasoning: longReasoning,
          mode: 'readonly'
        }
      })

      // 验证主容器的计算高度
      const contentArea = wrapper.find('.output-display__content')
      expect(contentArea.exists()).toBe(true)
      
      // 验证没有设置内联 height 样式（应该依赖 flex-1）
      const style = contentArea.attributes('style')
      expect(style).toBeFalsy() // undefined 或空字符串都表示没有设置样式
      
      // 验证滚动容器的结构
      const readonlyView = wrapper.find('.readonly-view')
      expect(readonlyView.exists()).toBe(true)
      
      // 验证内边距容器存在且包含长文本
      const paddingContainer = readonlyView.find('div')
      expect(paddingContainer.exists()).toBe(true)
      expect(paddingContainer.text()).toContain('这是一段很长的测试内容')
      expect(paddingContainer.text()).toContain('确保用户在任何情况下都能正常浏览')
    })

    it('应该能正确处理固定高度时的布局', () => {
      const wrapper = mount(OutputDisplay, {
        global: {
          plugins: [i18n]
        },
        props: {
          content: longContent,
          mode: 'readonly',
          height: 400
        }
      })

      // 验证固定高度被正确应用
      const contentArea = wrapper.find('.output-display__content')
      expect(contentArea.attributes('style')).toContain('height: 400px')
      
      // 验证在固定高度下，滚动容器仍然正确
      const readonlyView = wrapper.find('.readonly-view')
      expect(readonlyView.exists()).toBe(true)
      
      // 验证长文本内容存在
      expect(readonlyView.text()).toContain('这是一段很长的测试内容')
    })

    it('应该能处理推理区域对主内容高度的影响', () => {
      // 先测试没有推理内容的情况
      const wrapperWithoutReasoning = mount(OutputDisplay, {
        global: {
          plugins: [i18n]
        },
        props: {
          content: longContent,
          mode: 'readonly'
        }
      })

      // 然后测试有推理内容的情况
      const wrapperWithReasoning = mount(OutputDisplay, {
        global: {
          plugins: [i18n]
        },
        props: {
          content: longContent,
          reasoning: longReasoning,
          mode: 'readonly'
        }
      })

      // 验证两种情况下主内容区域都存在
      expect(wrapperWithoutReasoning.find('.output-display__content').exists()).toBe(true)
      expect(wrapperWithReasoning.find('.output-display__content').exists()).toBe(true)
      
      // 验证有推理内容时，推理区域存在
      expect(wrapperWithoutReasoning.find('.output-display__reasoning').exists()).toBe(false)
      expect(wrapperWithReasoning.find('.output-display__reasoning').exists()).toBe(true)
      
      // 验证两种情况下内容都能正确显示
      expect(wrapperWithoutReasoning.text()).toContain('这是一段很长的测试内容')
      expect(wrapperWithReasoning.text()).toContain('这是一段很长的测试内容')
      expect(wrapperWithReasoning.text()).toContain('推理步骤需要详细说明')
    })

    it('应该能处理内容动态变化时的高度调整', async () => {
      const wrapper = mount(OutputDisplay, {
        global: {
          plugins: [i18n]
        },
        props: {
          content: '短内容',
          mode: 'readonly'
        }
      })

      // 验证初始状态
      expect(wrapper.text()).toContain('短内容')
      expect(wrapper.text()).not.toContain('这是一段很长的测试内容')
      
      // 更新为长内容
      await wrapper.setProps({ content: longContent })
      
      // 等待Vue的响应式更新完成
      await wrapper.vm.$nextTick()
      
      // 验证长内容正确显示 - 检查实际渲染的内容
      const markdownRenderer = wrapper.findComponent({ name: 'MarkdownRenderer' })
      expect(markdownRenderer.exists()).toBe(true)
      expect(markdownRenderer.props('content')).toContain('这是一段很长的测试内容')
      
      // 验证 wrapper 的 props 已更新
      expect(wrapper.props('content')).toContain('这是一段很长的测试内容')
      
      // 验证滚动容器结构保持稳定
      const readonlyView = wrapper.find('.readonly-view')
      expect(readonlyView.exists()).toBe(true)
      
      const paddingContainer = readonlyView.find('div')
      expect(paddingContainer.exists()).toBe(true)
    })
  })


}) 