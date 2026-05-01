import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ImageResult } from '@prompt-optimizer/core'

import { createTestPinia } from '../../utils/pinia-test-helpers'
import SaveTestResultExampleButton from '../../../src/components/SaveTestResultExampleButton.vue'
import { useBasicSystemSession } from '../../../src/stores/session/useBasicSystemSession'
import { useImageMultiImageSession } from '../../../src/stores/session/useImageMultiImageSession'

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  warning: vi.fn(),
}))

vi.mock('../../../src/composables/ui/useToast', () => ({
  useToast: () => toastMock,
}))

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
    template:
      '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>',
    props: ['disabled', 'size', 'quaternary', 'circle'],
    emits: ['click'],
  },
  NIcon: {
    name: 'NIcon',
    template: '<span><slot /></span>',
  },
  NTooltip: {
    name: 'NTooltip',
    template: '<span><slot name="trigger" /><slot /></span>',
    props: ['trigger'],
  },
}

const mountButton = (
  pinia: ReturnType<typeof createTestPinia>['pinia'],
  handleSaveFavorite: ReturnType<typeof vi.fn>,
  props: Record<string, unknown>,
) => mount(SaveTestResultExampleButton, {
  props: {
    testId: 'save-example',
    ...props,
  },
  global: {
    plugins: [pinia],
    provide: {
      handleSaveFavorite,
    },
    stubs: naiveStubs,
  },
})

describe('SaveTestResultExampleButton', () => {
  beforeEach(() => {
    toastMock.error.mockClear()
    toastMock.warning.mockClear()
  })

  it('opens save favorite with a text test result example draft', async () => {
    const { pinia } = createTestPinia()
    const handleSaveFavorite = vi.fn()
    const session = useBasicSystemSession(pinia)

    session.prompt = 'Original {{topic}}'
    session.optimizedPrompt = 'Optimized {{topic}}'
    session.testContent = 'Input about {{topic}}'
    session.testVariants = [
      { id: 'a', version: 'workspace', modelKey: 'text-model' },
      { id: 'b', version: 'workspace', modelKey: '' },
      { id: 'c', version: 'workspace', modelKey: '' },
      { id: 'd', version: 'workspace', modelKey: '' },
    ]
    session.testVariantResults = {
      a: { result: 'Saved output', reasoning: 'brief reasoning' },
      b: { result: '', reasoning: '' },
      c: { result: '', reasoning: '' },
      d: { result: '', reasoning: '' },
    }

    const wrapper = mountButton(pinia, handleSaveFavorite, {
      subModeKey: 'basic-system',
      variantId: 'a',
      content: 'Optimized {{topic}}',
      originalContent: 'Original {{topic}}',
      functionMode: 'basic',
      optimizationMode: 'system',
    })

    await wrapper.get('[data-testid="save-example"]').trigger('click')

    expect(handleSaveFavorite).toHaveBeenCalledTimes(1)
    const payload = handleSaveFavorite.mock.calls[0][0]
    expect(payload).toMatchObject({
      content: 'Optimized {{topic}}',
      originalContent: 'Original {{topic}}',
      prefill: {
        functionMode: 'basic',
        optimizationMode: 'system',
        reproducibilityDraft: {
          variables: [],
          examples: [
            {
              text: 'Input about {{topic}}',
              outputText: 'Saved output',
              metadata: {
                modelKey: 'text-model',
              },
            },
          ],
        },
      },
    })
  })

  it('preserves image input and output refs when saving a multiimage result example', async () => {
    const { pinia } = createTestPinia()
    const handleSaveFavorite = vi.fn()
    const session = useImageMultiImageSession(pinia)

    session.originalPrompt = 'Generate {{scene}}'
    session.optimizedPrompt = 'Generate vivid {{scene}}'
    session.temporaryVariables = { scene: 'city' }
    session.inputImages = [
      {
        id: 'runtime-1',
        assetId: null,
        b64: 'INPUT_B64',
        mimeType: 'image/png',
      },
    ]
    session.testVariants = [
      { id: 'a', version: 'workspace', modelKey: 'image-model' },
      { id: 'b', version: 'workspace', modelKey: '' },
      { id: 'c', version: 'workspace', modelKey: '' },
      { id: 'd', version: 'workspace', modelKey: '' },
    ]
    session.testVariantResults = {
      a: {
        images: [{ _type: 'image-ref', id: 'output-asset' }],
        text: 'Image output note',
        metadata: {
          providerId: 'provider',
          modelId: 'model',
          configId: 'image-model',
        },
      } as unknown as ImageResult,
      b: null,
      c: null,
      d: null,
    }

    const wrapper = mountButton(pinia, handleSaveFavorite, {
      subModeKey: 'image-multiimage',
      variantId: 'a',
      content: 'Generate vivid {{scene}}',
      originalContent: 'Generate {{scene}}',
      functionMode: 'image',
      imageSubMode: 'multiimage',
    })

    await wrapper.get('[data-testid="save-example"]').trigger('click')

    expect(handleSaveFavorite).toHaveBeenCalledTimes(1)
    const draft = handleSaveFavorite.mock.calls[0][0].prefill.reproducibilityDraft
    expect(draft.variables).toEqual([
      {
        name: 'scene',
        required: false,
        options: [],
        source: 'test-run',
      },
    ])
    expect(draft.examples[0]).toMatchObject({
      parameters: { scene: 'city' },
      outputText: 'Image output note',
      inputImages: ['data:image/png;base64,INPUT_B64'],
      imageAssetIds: ['output-asset'],
      metadata: {
        modelKey: 'image-model',
      },
    })
  })

  it('warns instead of opening the save dialog when the selected variant has no result', async () => {
    const { pinia } = createTestPinia()
    const handleSaveFavorite = vi.fn()
    const session = useBasicSystemSession(pinia)

    session.optimizedPrompt = 'Optimized prompt'
    session.testContent = 'Input'
    session.testVariants = [
      { id: 'a', version: 'workspace', modelKey: 'text-model' },
      { id: 'b', version: 'workspace', modelKey: '' },
      { id: 'c', version: 'workspace', modelKey: '' },
      { id: 'd', version: 'workspace', modelKey: '' },
    ]
    session.testVariantResults = {
      a: { result: '', reasoning: '' },
      b: { result: '', reasoning: '' },
      c: { result: '', reasoning: '' },
      d: { result: '', reasoning: '' },
    }

    const wrapper = mountButton(pinia, handleSaveFavorite, {
      subModeKey: 'basic-system',
      variantId: 'a',
      content: 'Optimized prompt',
      functionMode: 'basic',
      optimizationMode: 'system',
    })

    await wrapper.get('[data-testid="save-example"]').trigger('click')

    expect(handleSaveFavorite).not.toHaveBeenCalled()
    expect(toastMock.warning).toHaveBeenCalledWith('favorites.dialog.reproducibility.noTestResultToSave')
  })
})
