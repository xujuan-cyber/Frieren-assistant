import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

vi.mock('naive-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('naive-ui')>()
  return {
    ...actual,
    NSpace: defineComponent({
      name: 'NSpace',
      setup(_, { slots }) {
        return () => h('div', { 'data-testid': 'core-nav-space' }, slots.default?.())
      },
    }),
  }
})

const routerPush = vi.hoisted(() => vi.fn())

vi.mock('../../../src/router', () => ({
  router: {
    currentRoute: {
      value: {
        path: '/favorites',
      },
    },
    push: routerPush,
  },
}))

// AssistantSwitcher（头部助手切换器）在 setup 阶段调用 vue-router 的
// useRoute/useRouter；本用例不安装 router 插件，必须 mock 掉，
// 否则注入失败导致其 <component :is> 收到 undefined，Vue 警告会使用例判负。
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/favorites' }),
  useRouter: () => ({ push: routerPush }),
}))

import AppCoreNav from '../../../src/components/app-layout/AppCoreNav.vue'

const stubs = {
  FunctionModeSelector: defineComponent({
    name: 'FunctionModeSelector',
    props: ['modelValue', 'allowReselect'],
    emits: ['change'],
    setup(props, { emit }) {
      return () =>
        h('button', {
          'data-testid': 'function-mode',
          'data-value': props.modelValue,
          'data-allow-reselect': String(props.allowReselect),
          onClick: () => emit('change', props.modelValue),
        })
    },
  }),
  OptimizationModeSelectorUI: defineComponent({
    name: 'OptimizationModeSelectorUI',
    props: ['modelValue', 'functionMode', 'allowReselect'],
    emits: ['change'],
    setup(props, { emit }) {
      return () =>
        h('button', {
          'data-testid': 'optimization-mode',
          'data-value': props.modelValue,
          'data-function-mode': props.functionMode,
          'data-allow-reselect': String(props.allowReselect),
          onClick: () => emit('change', props.modelValue),
        })
    },
  }),
  ImageModeSelector: defineComponent({
    name: 'ImageModeSelector',
    props: ['modelValue', 'allowReselect'],
    emits: ['change'],
    setup(props, { emit }) {
      return () =>
        h('button', {
          'data-testid': 'image-mode',
          'data-value': props.modelValue,
          'data-allow-reselect': String(props.allowReselect),
          onClick: () => emit('change', props.modelValue),
        })
    },
  }),
}

describe('AppCoreNav', () => {
  beforeEach(() => {
    routerPush.mockClear()
  })

  it('uses the provided workspace path as active context on non-workspace routes', () => {
    const wrapper = mount(AppCoreNav, {
      props: {
        workspacePath: '/image/multiimage',
      },
      global: {
        // AssistantSwitcher 依赖 Pinia store（useGlobalSettings），必须安装
        plugins: [createPinia()],
        stubs,
      },
    })

    expect(wrapper.find('[data-testid="function-mode"]').attributes('data-value')).toBe('image')
    expect(wrapper.find('[data-testid="image-mode"]').attributes('data-value')).toBe('multiimage')
    expect(wrapper.find('[data-testid="optimization-mode"]').exists()).toBe(false)
  })

  it('navigates back to the active workspace when the current image sub mode is reselected', async () => {
    const wrapper = mount(AppCoreNav, {
      props: {
        workspacePath: '/image/text2image',
        allowWorkspaceReselect: true,
      },
      global: {
        // AssistantSwitcher 依赖 Pinia store（useGlobalSettings），必须安装
        plugins: [createPinia()],
        stubs,
      },
    })

    expect(wrapper.find('[data-testid="image-mode"]').attributes('data-allow-reselect')).toBe('true')

    await wrapper.find('[data-testid="image-mode"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/image/text2image')
  })

  it('can leave Favorites by selecting a different core workspace mode', async () => {
    const wrapper = mount(AppCoreNav, {
      props: {
        workspacePath: '/image/text2image',
        allowWorkspaceReselect: true,
      },
      global: {
        // AssistantSwitcher 依赖 Pinia store（useGlobalSettings），必须安装
        plugins: [createPinia()],
        stubs,
      },
    })

    wrapper.findComponent({ name: 'FunctionModeSelector' }).vm.$emit('change', 'basic')

    expect(routerPush).toHaveBeenCalledWith('/basic/system')
  })

  it('can leave Favorites by selecting a different submode in the active workspace group', async () => {
    const wrapper = mount(AppCoreNav, {
      props: {
        workspacePath: '/basic/system',
        allowWorkspaceReselect: true,
      },
      global: {
        // AssistantSwitcher 依赖 Pinia store（useGlobalSettings），必须安装
        plugins: [createPinia()],
        stubs,
      },
    })

    wrapper.findComponent({ name: 'OptimizationModeSelectorUI' }).vm.$emit('change', 'user')

    expect(routerPush).toHaveBeenCalledWith('/basic/user')
  })
})
