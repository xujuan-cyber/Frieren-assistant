import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CompareRoleConfigDialog from '../../../src/components/evaluation/CompareRoleConfigDialog.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (!params) return key
      return `${key}:${JSON.stringify(params)}`
    },
  }),
}))

const naiveStubs = {
  NModal: {
    name: 'NModal',
    template: '<div v-if="show" class="n-modal"><slot /></div>',
    props: ['show', 'preset', 'title', 'style', 'maskClosable'],
  },
  NFlex: {
    name: 'NFlex',
    template: '<div class="n-flex"><slot /></div>',
    props: ['vertical', 'size', 'justify', 'wrap'],
  },
  NAlert: {
    name: 'NAlert',
    template: '<div class="n-alert"><slot /></div>',
    props: ['type', 'showIcon'],
  },
  NText: {
    name: 'NText',
    template: '<span><slot /></span>',
    props: ['depth', 'strong'],
  },
  NTag: {
    name: 'NTag',
    template: '<span class="n-tag"><slot /></span>',
    props: ['size', 'type', 'bordered'],
  },
  NSelect: {
    name: 'NSelect',
    template: `
      <select
        class="n-select"
        :value="value ?? ''"
        @change="$emit('update:value', $event.target.value || null)"
      >
        <option value="">{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    `,
    props: ['value', 'options', 'size', 'clearable', 'placeholder'],
    emits: ['update:value'],
  },
  NButton: {
    name: 'NButton',
    template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['type', 'disabled', 'quaternary'],
    emits: ['click'],
  },
}

const createEntries = () => ([
  {
    id: 'a',
    label: 'A',
    promptRef: { kind: 'workspace', label: 'Workspace A' },
    promptRefLabel: 'Workspace A',
    promptText: 'Prompt current',
    modelKey: 'qwen3-32b',
    versionLabel: 'workspace',
    inferredRole: 'target',
  },
  {
    id: 'b',
    label: 'B',
    promptRef: { kind: 'version', version: 1, label: 'v1' },
    promptRefLabel: 'v1',
    promptText: 'Prompt previous',
    modelKey: 'qwen3-32b',
    versionLabel: 'v1',
    inferredRole: 'baseline',
  },
])

describe('CompareRoleConfigDialog', () => {
  it('emits only explicit manual overrides on confirm', async () => {
    const wrapper = mount(CompareRoleConfigDialog, {
      props: {
        modelValue: true,
        entries: createEntries(),
        manualRoles: {},
      },
      global: {
        stubs: naiveStubs,
      },
    })

    const buttons = wrapper.findAll('button')
    await buttons[buttons.length - 1].trigger('click')

    expect(wrapper.emitted('confirm')).toEqual([[{}]])
  })

  it('blocks confirm when singleton role conflicts would make the structured plan ambiguous', async () => {
    const wrapper = mount(CompareRoleConfigDialog, {
      props: {
        modelValue: true,
        entries: createEntries(),
        manualRoles: {
          a: 'target',
          b: 'target',
        },
      },
      global: {
        stubs: naiveStubs,
      },
    })

    const buttons = wrapper.findAll('button')
    const confirmButton = buttons[buttons.length - 1]

    expect(confirmButton.attributes('disabled')).toBeDefined()
    await confirmButton.trigger('click')
    expect(wrapper.emitted('confirm')).toBeFalsy()
  })

  it('shows workspace review warnings when a saved workspace role needs reconfirmation', () => {
    const wrapper = mount(CompareRoleConfigDialog, {
      props: {
        modelValue: true,
        entries: [
          {
            ...createEntries()[0],
            workspaceChangedManualRole: 'target',
          },
          createEntries()[1],
        ],
        manualRoles: {
          a: 'target',
        },
      },
      global: {
        stubs: naiveStubs,
      },
    })

    expect(wrapper.text()).toContain('evaluation.compareConfig.workspaceChangedSummary')
    expect(wrapper.text()).toContain('evaluation.compareConfig.workspaceChangedTag')
  })
})
