import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import {
  PROMPT_MODEL_SCHEMA_VERSION,
  createPromptContract,
  type FavoritePrompt,
} from '@prompt-optimizer/core'

const resolveAssetIdToDataUrlMock = vi.fn()
const persistImageSourceAsAssetIdMock = vi.fn()

vi.mock('../../../src/utils/image-asset-storage', () => ({
  resolveAssetIdToDataUrl: (...args: unknown[]) => resolveAssetIdToDataUrlMock(...args),
  persistImageSourceAsAssetId: (...args: unknown[]) => persistImageSourceAsAssetIdMock(...args),
}))

vi.mock('../../../src/composables/ui/useTagSuggestions', () => ({
  useTagSuggestions: () => ({
    filterTags: () => [],
    loadTags: vi.fn(async () => {}),
  }),
}))

vi.mock('../../../src/composables/ui/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
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

import FavoriteEditorForm from '../../../src/components/FavoriteEditorForm.vue'

const naiveStubs = {
  NAlert: {
    name: 'NAlert',
    template: '<div class="n-alert"><slot /></div>',
    props: ['type', 'showIcon', 'class'],
  },
  NAutoComplete: {
    name: 'NAutoComplete',
    template: '<input class="n-auto-complete" :value="value" />',
    props: ['value', 'options', 'placeholder', 'getShow', 'clearable'],
  },
  NButton: {
    name: 'NButton',
    template: '<button class="n-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'loading', 'type', 'secondary', 'size', 'quaternary'],
    emits: ['click'],
  },
  NCard: {
    name: 'NCard',
    template: '<section class="n-card"><header>{{ title }}</header><slot /><footer><slot name="footer" /></footer></section>',
    props: ['title', 'size', 'segmented', 'class'],
  },
  NForm: {
    name: 'NForm',
    template: '<form class="n-form"><slot /></form>',
    props: ['labelPlacement'],
  },
  NFormItem: {
    name: 'NFormItem',
    template: '<label class="n-form-item">{{ label }}<slot /></label>',
    props: ['label', 'required'],
  },
  NGrid: {
    name: 'NGrid',
    template: '<div class="n-grid"><slot /></div>',
    props: ['cols', 'xGap'],
  },
  NGridItem: {
    name: 'NGridItem',
    template: '<div class="n-grid-item"><slot /></div>',
  },
  NInput: {
    name: 'NInput',
    template: '<textarea v-if="type === \'textarea\'" class="n-input" :value="value" /><input v-else class="n-input" :value="value" />',
    props: ['value', 'type', 'placeholder', 'autosize', 'maxlength', 'showCount'],
  },
  NScrollbar: {
    name: 'NScrollbar',
    template: '<div class="n-scrollbar"><slot /></div>',
    props: ['class'],
  },
  NSelect: {
    name: 'NSelect',
    template: '<select class="n-select" :value="value"></select>',
    props: ['value', 'options', 'placeholder', 'disabled'],
  },
  NSpace: {
    name: 'NSpace',
    template: '<div class="n-space"><slot /></div>',
    props: ['vertical', 'size', 'justify', 'align', 'wrap', 'class'],
  },
  NTag: {
    name: 'NTag',
    template: '<span class="n-tag"><slot /></span>',
    props: ['type', 'closable', 'size', 'bordered'],
  },
  NText: {
    name: 'NText',
    template: '<span class="n-text"><slot /></span>',
    props: ['depth'],
  },
  NUpload: {
    name: 'NUpload',
    template: '<div class="n-upload" @click="onBeforeUpload && onBeforeUpload({ file: { file: testBlob } })"><slot /></div>',
    props: ['accept', 'multiple', 'defaultUpload', 'showFileList', 'disabled', 'onBeforeUpload'],
    emits: ['before-upload'],
    data: () => ({
      testBlob: new Blob(['upload'], { type: 'image/png' }),
    }),
  },
  Upload: {
    name: 'Upload',
    template: '<div class="n-upload" @click="onBeforeUpload && onBeforeUpload({ file: { file: testBlob } })"><slot /></div>',
    props: ['accept', 'multiple', 'defaultUpload', 'showFileList', 'disabled', 'onBeforeUpload'],
    emits: ['before-upload'],
    data: () => ({
      testBlob: new Blob(['upload'], { type: 'image/png' }),
    }),
  },
  CategoryTreeSelect: {
    name: 'CategoryTreeSelect',
    template: '<div class="category-tree-select"></div>',
    props: ['modelValue', 'placeholder', 'showAllOption'],
  },
  FavoriteReproducibilityEditor: {
    name: 'FavoriteReproducibilityEditor',
    template: '<div class="favorite-reproducibility-editor"></div>',
    props: ['variables', 'examples', 'examplePreviews', 'panelMode', 'addedExampleIds'],
    emits: ['update:variables', 'update:examples', 'add-image-to-media'],
  },
  AppPreviewImage: {
    name: 'AppPreviewImage',
    template: '<img class="app-preview-image" :src="src" :alt="alt" />',
    props: ['src', 'alt', 'objectFit', 'class'],
  },
  AppPreviewImageGroup: {
    name: 'AppPreviewImageGroup',
    template: '<div class="app-preview-image-group"><slot /></div>',
  },
}

const createFavorite = (id: string, coverAssetId: string): FavoritePrompt => ({
  id,
  title: `Favorite ${id}`,
  content: `Content ${id}`,
  description: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tags: [],
  category: '',
  useCount: 0,
  functionMode: 'image',
  imageSubMode: 'text2image',
  metadata: {
    media: {
      coverAssetId,
      assetIds: [],
      urls: [],
    },
  },
})

const createFavoriteWithoutMedia = (id: string): FavoritePrompt => ({
  id,
  title: `Favorite ${id}`,
  content: `Content ${id}`,
  description: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tags: [],
  category: '',
  useCount: 0,
  functionMode: 'image',
  imageSubMode: 'text2image',
  metadata: {},
})

const createDeferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

describe('FavoriteEditorForm', () => {
  beforeEach(() => {
    resolveAssetIdToDataUrlMock.mockReset()
    persistImageSourceAsAssetIdMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('ignores stale media hydration after switching edited favorites', async () => {
    const firstCover = createDeferred<string | null>()
    const secondCover = createDeferred<string | null>()
    const firstFavorite = createFavorite('first', 'asset-first')
    const secondFavorite = createFavorite('second', 'asset-second')
    const updateFavorite = vi.fn(async () => {})

    resolveAssetIdToDataUrlMock.mockImplementation((assetId: string) => {
      if (assetId === 'asset-first') return firstCover.promise
      if (assetId === 'asset-second') return secondCover.promise
      return Promise.resolve(null)
    })
    persistImageSourceAsAssetIdMock.mockImplementation(({ source }: { source: string }) =>
      source.includes('second') ? 'persisted-second' : 'persisted-first',
    )

    const wrapper = mount(FavoriteEditorForm, {
      props: {
        mode: 'edit',
        favorite: firstFavorite,
      },
      global: {
        stubs: naiveStubs,
        provide: {
          services: ref({
            favoriteImageStorageService: {},
            imageStorageService: {},
            favoriteManager: {
              getAllTags: vi.fn(async () => []),
              addTag: vi.fn(async () => {}),
              updateFavorite,
            },
          } as any),
        },
      },
    })

    await flushPromises()
    await wrapper.setProps({ favorite: secondFavorite })
    await flushPromises()

    secondCover.resolve('data:image/png;base64,second')
    await flushPromises()
    firstCover.resolve('data:image/png;base64,first')
    await flushPromises()

    await wrapper.findAll('button').at(-1)?.trigger('click')
    await flushPromises()

    expect(updateFavorite).toHaveBeenCalledWith('second', expect.objectContaining({
      metadata: expect.objectContaining({
        media: expect.objectContaining({
          coverAssetId: 'persisted-second',
        }),
      }),
    }))
    expect(updateFavorite).not.toHaveBeenCalledWith('second', expect.objectContaining({
      metadata: expect.objectContaining({
        media: expect.objectContaining({
          coverAssetId: 'persisted-first',
        }),
      }),
    }))
  })

  it('ignores stale image uploads after switching edited favorites', async () => {
    const readers: Array<{
      result: string
      onload: null | (() => void)
      onerror: null | (() => void)
      readAsDataURL: ReturnType<typeof vi.fn>
    }> = []
    class TestFileReader {
      result = ''
      onload: null | (() => void) = null
      onerror: null | (() => void) = null
      readAsDataURL = vi.fn(() => {
        readers.push(this)
      })
    }
    vi.stubGlobal('FileReader', TestFileReader)

    const secondCover = createDeferred<string | null>()
    const firstFavorite = createFavoriteWithoutMedia('first')
    const secondFavorite = createFavorite('second', 'asset-second')
    const updateFavorite = vi.fn(async () => {})

    resolveAssetIdToDataUrlMock.mockImplementation((assetId: string) => {
      if (assetId === 'asset-second') return secondCover.promise
      return Promise.resolve(null)
    })
    persistImageSourceAsAssetIdMock.mockImplementation(({ source }: { source: string }) =>
      source.includes('stale-upload') ? 'persisted-stale-upload' : 'persisted-second',
    )

    const wrapper = mount(FavoriteEditorForm, {
      props: {
        mode: 'edit',
        favorite: firstFavorite,
      },
      global: {
        stubs: naiveStubs,
        provide: {
          services: ref({
            favoriteImageStorageService: {},
            imageStorageService: {},
            favoriteManager: {
              getAllTags: vi.fn(async () => []),
              addTag: vi.fn(async () => {}),
              updateFavorite,
            },
          } as any),
        },
      },
    })

    await flushPromises()

    await wrapper.find('.n-upload').trigger('click')
    await flushPromises()
    expect(readers).toHaveLength(1)

    await wrapper.setProps({ favorite: secondFavorite })
    await flushPromises()

    secondCover.resolve('data:image/png;base64,second')
    await flushPromises()

    readers[0].result = 'data:image/png;base64,stale-upload'
    readers[0].onload?.()
    await flushPromises()

    await wrapper.findAll('button').at(-1)?.trigger('click')
    await flushPromises()

    expect(persistImageSourceAsAssetIdMock).not.toHaveBeenCalledWith(expect.objectContaining({
      source: 'data:image/png;base64,stale-upload',
    }))
    expect(updateFavorite).toHaveBeenCalledWith('second', expect.objectContaining({
      metadata: expect.objectContaining({
        media: expect.objectContaining({
          coverAssetId: 'persisted-second',
          assetIds: ['persisted-second'],
        }),
      }),
    }))
  })

  it('persists reproducibility example images as favorite asset ids on save', async () => {
    const favorite: FavoritePrompt = {
      ...createFavoriteWithoutMedia('manual-examples'),
      metadata: {
        reproducibility: {
          variables: [],
          examples: [
            {
              id: 'case-1',
              parameters: { style: 'ink' },
              images: ['data:image/png;base64,output-image'],
              imageAssetIds: ['existing-output-asset'],
              inputImages: ['data:image/png;base64,input-image'],
              inputImageAssetIds: ['existing-input-asset'],
            },
          ],
        },
      },
    }
    const updateFavorite = vi.fn(async () => {})

    persistImageSourceAsAssetIdMock.mockImplementation(({ source }: { source: string }) => {
      if (source.includes('output-image')) return 'persisted-output-asset'
      if (source.includes('input-image')) return 'persisted-input-asset'
      return null
    })

    const wrapper = mount(FavoriteEditorForm, {
      props: {
        mode: 'edit',
        favorite,
      },
      global: {
        stubs: naiveStubs,
        provide: {
          services: ref({
            favoriteImageStorageService: {},
            imageStorageService: {},
            favoriteManager: {
              getAllTags: vi.fn(async () => []),
              addTag: vi.fn(async () => {}),
              updateFavorite,
            },
          } as any),
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').at(-1)?.trigger('click')
    await flushPromises()

    const savedMetadata = updateFavorite.mock.calls[0]?.[1]?.metadata as Record<string, any>
    const savedExample = savedMetadata.reproducibility.examples[0]

    expect(savedExample.imageAssetIds).toEqual(['existing-output-asset', 'persisted-output-asset'])
    expect(savedExample.inputImageAssetIds).toEqual(['existing-input-asset', 'persisted-input-asset'])
    expect(JSON.stringify(savedExample)).not.toContain('data:image/png;base64')
  })

  it('hydrates reproducibility example asset previews without writing them into editable url fields', async () => {
    const favorite: FavoritePrompt = {
      ...createFavoriteWithoutMedia('preview-examples'),
      metadata: {
        reproducibility: {
          variables: [],
          examples: [
            {
              id: 'case-preview',
              parameters: {},
              images: [],
              imageAssetIds: ['asset-output'],
              inputImages: [],
              inputImageAssetIds: ['asset-input'],
            },
          ],
        },
      },
    }

    resolveAssetIdToDataUrlMock.mockImplementation((assetId: string) => {
      if (assetId === 'asset-output') return Promise.resolve('data:image/png;base64,output-preview')
      if (assetId === 'asset-input') return Promise.resolve('data:image/png;base64,input-preview')
      return Promise.resolve(null)
    })

    const wrapper = mount(FavoriteEditorForm, {
      props: {
        mode: 'edit',
        favorite,
      },
      global: {
        stubs: naiveStubs,
        provide: {
          services: ref({
            favoriteImageStorageService: {},
            imageStorageService: {},
            favoriteManager: {
              getAllTags: vi.fn(async () => []),
              addTag: vi.fn(async () => {}),
              updateFavorite: vi.fn(async () => {}),
            },
          } as any),
        },
      },
    })

    await flushPromises()

    const editor = wrapper.findComponent({ name: 'FavoriteReproducibilityEditor' })
    expect(editor.props('examples')).toEqual([
      expect.objectContaining({
        images: [],
        imageAssetIds: ['asset-output'],
        inputImages: [],
        inputImageAssetIds: ['asset-input'],
      }),
    ])
    expect(editor.props('examplePreviews')).toEqual([
      {
        images: [{ assetId: 'asset-output', source: 'data:image/png;base64,output-preview' }],
        inputImages: [{ assetId: 'asset-input', source: 'data:image/png;base64,input-preview' }],
      },
    ])
  })

  it('adds an example image to the favorite image list only when explicitly requested', async () => {
    const favorite = createFavoriteWithoutMedia('promote-example-image')
    const updateFavorite = vi.fn(async () => {})
    persistImageSourceAsAssetIdMock.mockImplementation(({ source }: { source: string }) =>
      source.includes('example-output') ? 'persisted-example-output' : null,
    )

    const wrapper = mount(FavoriteEditorForm, {
      props: {
        mode: 'edit',
        favorite,
      },
      global: {
        stubs: naiveStubs,
        provide: {
          services: ref({
            favoriteImageStorageService: {},
            imageStorageService: {},
            favoriteManager: {
              getAllTags: vi.fn(async () => []),
              addTag: vi.fn(async () => {}),
              updateFavorite,
            },
          } as any),
        },
      },
    })

    await flushPromises()

    const editors = wrapper.findAllComponents({ name: 'FavoriteReproducibilityEditor' })
    editors[1].vm.$emit('add-image-to-media', {
      exampleIndex: 0,
      field: 'images',
      source: 'data:image/png;base64,example-output',
    })
    editors[1].vm.$emit('add-image-to-media', {
      exampleIndex: 0,
      field: 'images',
      source: 'data:image/png;base64,example-output',
    })
    await flushPromises()

    await wrapper.findAll('button').at(-1)?.trigger('click')
    await flushPromises()

    const savedMetadata = updateFavorite.mock.calls[0]?.[1]?.metadata as Record<string, any>
    expect(persistImageSourceAsAssetIdMock).toHaveBeenCalledTimes(1)
    expect(savedMetadata.media).toEqual({
      coverAssetId: 'persisted-example-output',
      assetIds: ['persisted-example-output'],
      urls: [],
    })
  })

  it('persists an explicit empty reproducibility draft when clearing prompt asset examples', async () => {
    const favorite: FavoritePrompt = {
      ...createFavoriteWithoutMedia('clear-reproducibility'),
      functionMode: 'context',
      optimizationMode: 'user',
      metadata: {
        promptAsset: {
          schemaVersion: PROMPT_MODEL_SCHEMA_VERSION,
          id: 'asset-clear-reproducibility',
          title: 'Prompt asset with examples',
          tags: [],
          contract: createPromptContract('pro-variable', {
            variables: [{ name: 'topic', required: false }],
          }),
          currentVersionId: 'version-1',
          versions: [
            {
              id: 'version-1',
              version: 1,
              content: { kind: 'text', text: 'Write about {{topic}}' },
              createdAt: 1,
            },
          ],
          examples: [
            {
              id: 'example-1',
              basedOnVersionId: 'version-1',
              input: { parameters: { topic: 'old' } },
            },
          ],
          createdAt: 1,
          updatedAt: 2,
        },
      },
    }
    const updateFavorite = vi.fn(async () => {})

    const wrapper = mount(FavoriteEditorForm, {
      props: {
        mode: 'edit',
        favorite,
      },
      global: {
        stubs: naiveStubs,
        provide: {
          services: ref({
            favoriteImageStorageService: {},
            imageStorageService: {},
            favoriteManager: {
              getAllTags: vi.fn(async () => []),
              addTag: vi.fn(async () => {}),
              updateFavorite,
            },
          } as any),
        },
      },
    })

    await flushPromises()

    const editor = wrapper.findComponent({ name: 'FavoriteReproducibilityEditor' })
    expect(editor.props('variables')).toHaveLength(1)
    expect(editor.props('examples')).toHaveLength(1)

    editor.vm.$emit('update:variables', [])
    editor.vm.$emit('update:examples', [])
    await flushPromises()

    await wrapper.findAll('button').at(-1)?.trigger('click')
    await flushPromises()

    const savedMetadata = updateFavorite.mock.calls[0]?.[1]?.metadata as Record<string, any>
    expect(savedMetadata.reproducibility).toEqual({
      variables: [],
      examples: [],
    })
  })

  it('defaults test result updates to appending examples without replacing favorite content', async () => {
    const favorite: FavoritePrompt = {
      ...createFavoriteWithoutMedia('append-example-only'),
      functionMode: 'context',
      optimizationMode: 'user',
      content: 'Existing favorite content',
      metadata: {
        media: {
          coverAssetId: 'existing-cover',
          assetIds: ['existing-cover'],
          urls: [],
        },
        reproducibility: {
          variables: [{ name: 'topic', required: false }],
          examples: [
            {
              id: 'existing-example',
              parameters: { topic: 'old' },
            },
          ],
        },
      },
    }
    const updateFavorite = vi.fn(async () => {})

    const wrapper = mount(FavoriteEditorForm, {
      props: {
        mode: 'edit',
        favorite,
        content: 'Incoming test result content',
        applyIncomingContentOnEdit: true,
        prefill: {
          functionMode: 'basic',
          optimizationMode: 'system',
          updateIntent: 'examples',
          reproducibilityDraft: {
            variables: [],
            examples: [
              {
                id: 'test-run:implicit:image-text2image:test:b',
                parameters: { topic: 'new' },
                images: [],
                imageAssetIds: [],
                inputImages: [],
                inputImageAssetIds: [],
              },
            ],
          },
        },
      },
      global: {
        stubs: naiveStubs,
        provide: {
          services: ref({
            favoriteImageStorageService: {},
            imageStorageService: {},
            favoriteManager: {
              getAllTags: vi.fn(async () => []),
              addTag: vi.fn(async () => {}),
              updateFavorite,
            },
          } as any),
        },
      },
    })

    await flushPromises()

    expect(wrapper.find('.favorite-surface-section--changed').exists()).toBe(true)
    const editor = wrapper.findComponent({ name: 'FavoriteReproducibilityEditor' })
    expect(editor.props('panelMode')).toBe('review')
    expect(editor.props('addedExampleIds')).toEqual(['ex-002'])

    await wrapper.findAll('button').at(-1)?.trigger('click')
    await flushPromises()

    expect(updateFavorite).toHaveBeenCalledWith('append-example-only', expect.objectContaining({
      content: 'Existing favorite content',
      functionMode: 'context',
      optimizationMode: 'user',
    }))
    const savedMetadata = updateFavorite.mock.calls[0]?.[1]?.metadata as Record<string, any>
    expect(savedMetadata.media).toEqual({
      coverAssetId: 'existing-cover',
      assetIds: ['existing-cover'],
      urls: [],
    })
    expect(savedMetadata.reproducibility.examples.map((example: any) => example.id)).toEqual([
      'existing-example',
      'ex-002',
    ])
  })
})
