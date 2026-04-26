import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import FavoriteReproducibilityEditor from '../../../src/components/FavoriteReproducibilityEditor.vue'

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  }
})

const naiveStubs = {
  NButton: {
    name: 'NButton',
    template: '<button class="n-button" @click="$emit(\'click\', $event)"><slot /></button>',
    emits: ['click'],
  },
  NCard: {
    name: 'NCard',
    template: '<section class="n-card"><slot /></section>',
    props: ['size', 'title', 'segmented'],
  },
  NCheckbox: {
    name: 'NCheckbox',
    template: '<label class="n-checkbox"><input type="checkbox" :checked="checked" @change="$emit(\'update:checked\', $event.target.checked)" /><slot /></label>',
    props: ['checked'],
    emits: ['update:checked'],
  },
  NDivider: {
    name: 'NDivider',
    template: '<hr class="n-divider" />',
  },
  NEmpty: {
    name: 'NEmpty',
    template: '<div class="n-empty">{{ description }}</div>',
    props: ['description', 'size'],
  },
  NGrid: {
    name: 'NGrid',
    template: '<div class="n-grid"><slot /></div>',
    props: ['cols', 'xGap', 'yGap', 'responsive'],
  },
  NGridItem: {
    name: 'NGridItem',
    template: '<div class="n-grid-item"><slot /></div>',
  },
  NInput: {
    name: 'NInput',
    template: '<input class="n-input" :placeholder="placeholder" :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
    props: ['value', 'placeholder', 'type', 'autosize'],
    emits: ['update:value'],
  },
  NSelect: {
    name: 'NSelect',
    template: '<select class="n-select" :value="value" @change="$emit(\'update:value\', $event.target.value)"><option value=""></option><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
    props: ['value', 'options', 'clearable', 'placeholder'],
    emits: ['update:value'],
  },
  NSpace: {
    name: 'NSpace',
    template: '<div class="n-space"><slot /></div>',
    props: ['vertical', 'size'],
  },
  NText: {
    name: 'NText',
    template: '<span class="n-text"><slot /></span>',
    props: ['depth', 'strong'],
  },
}

const mountComponent = () =>
  mount(FavoriteReproducibilityEditor, {
    props: {
      variables: [],
      examples: [],
    },
    global: {
      stubs: naiveStubs,
    },
  })

describe('FavoriteReproducibilityEditor', () => {
  it('lets users add and edit variable configuration', async () => {
    const wrapper = mountComponent()

    await wrapper.findAll('.n-button')[0].trigger('click')
    const nextVariables = wrapper.emitted('update:variables')?.[0]?.[0]

    expect(nextVariables).toEqual([
      {
        name: '',
        required: false,
        options: [],
      },
    ])

    await wrapper.setProps({ variables: nextVariables })
    await wrapper.find('[data-testid="favorite-repro-variable-name"] input').setValue('style')

    expect(wrapper.emitted('update:variables')?.at(-1)?.[0]).toEqual([
      {
        name: 'style',
        required: false,
        options: [],
      },
    ])
  })

  it('lets users add and edit example parameters', async () => {
    const wrapper = mountComponent()

    await wrapper.findAll('.n-button')[1].trigger('click')
    const nextExamples = wrapper.emitted('update:examples')?.[0]?.[0]

    expect(nextExamples).toEqual([
      {
        parameters: {},
        images: [],
        imageAssetIds: [],
        inputImages: [],
        inputImageAssetIds: [],
      },
    ])

    await wrapper.setProps({ examples: nextExamples })
    await wrapper
      .find('[data-testid="favorite-repro-example-parameters"] textarea, [data-testid="favorite-repro-example-parameters"] input')
      .setValue('style=ink\nsize=large')

    expect(wrapper.emitted('update:examples')?.at(-1)?.[0]).toEqual([
      {
        parameters: {
          style: 'ink',
          size: 'large',
        },
        images: [],
        imageAssetIds: [],
        inputImages: [],
        inputImageAssetIds: [],
      },
    ])
  })
})
