import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

import type { FavoriteCategory, FavoritePrompt } from '@prompt-optimizer/core'

import FavoriteManager from '../../../src/components/FavoriteManager.vue'

const toastMock = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}

vi.mock('../../../src/composables/ui/useToast', () => ({
  useToast: () => toastMock,
}))

vi.mock('../../../src/composables/storage/useFavoriteInitializer', () => ({
  useFavoriteInitializer: () => ({
    ensureDefaultCategories: vi.fn().mockResolvedValue(undefined),
  }),
}))

const naiveStubs = {
  NModal: {
    name: 'NModal',
    template: '<div v-if="show" class="n-modal"><slot /><slot name="action" /></div>',
    props: ['show', 'style', 'title', 'preset', 'size', 'bordered', 'segmented', 'maskClosable'],
    emits: ['update:show'],
  },
  NCard: {
    name: 'NCard',
    template: '<section class="n-card"><header class="n-card-header"><slot name="header" /></header><div class="n-card-content"><slot /></div><footer class="n-card-footer"><slot name="footer" /></footer></section>',
    props: ['size', 'segmented', 'title'],
  },
  NScrollbar: {
    name: 'NScrollbar',
    template: '<div class="n-scrollbar"><slot /></div>',
    props: ['class'],
  },
  NSpace: {
    name: 'NSpace',
    template: '<div class="n-space"><slot /></div>',
    props: ['vertical', 'size', 'align', 'justify', 'wrap', 'class'],
  },
  NInput: {
    name: 'NInput',
    template: `
      <label class="n-input">
        <slot name="prefix" />
        <input :value="value" @input="$emit('update:value', $event.target.value)" />
      </label>
    `,
    props: ['value', 'placeholder', 'clearable', 'type', 'autosize', 'class'],
    emits: ['update:value'],
  },
  NSelect: {
    name: 'NSelect',
    template: `
      <select
        class="n-select"
        multiple
        @change="$emit('update:value', Array.from($event.target.selectedOptions).map((option) => option.value))"
      >
        <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    `,
    props: ['value', 'options', 'placeholder', 'multiple', 'clearable', 'filterable', 'maxTagCount', 'class'],
    emits: ['update:value'],
  },
  NDropdown: {
    name: 'NDropdown',
    template: `
      <div class="n-dropdown">
        <slot />
        <button
          v-for="option in normalizedOptions"
          :key="option.key"
          class="n-dropdown-option"
          :data-key="option.key"
          @click="$emit('select', option.key)"
        >
          {{ option.key }}
        </button>
      </div>
    `,
    props: ['options'],
    emits: ['select'],
    computed: {
      normalizedOptions() {
        return (this.options || []).filter((option: any) => !option.type)
      },
    },
  },
  NButton: {
    name: 'NButton',
    template: '<button class="n-button" :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>',
    emits: ['click'],
  },
  NIcon: {
    name: 'NIcon',
    template: '<i class="n-icon"><slot /></i>',
    props: ['size'],
  },
  NEmpty: {
    name: 'NEmpty',
    template: '<div class="n-empty">{{ description }}<slot name="extra" /></div>',
    props: ['description', 'size'],
  },
  NPagination: {
    name: 'NPagination',
    template: '<div class="n-pagination" :data-page-size="pageSize"><slot name="prefix" :item-count="itemCount" /></div>',
    props: ['page', 'pageSize', 'itemCount', 'pageSlot'],
    emits: ['update:page'],
  },
  NText: {
    name: 'NText',
    template: '<span class="n-text"><slot /></span>',
    props: ['depth', 'strong'],
  },
  NForm: {
    name: 'NForm',
    template: '<form class="n-form"><slot /></form>',
    props: ['labelPlacement'],
  },
  NFormItem: {
    name: 'NFormItem',
    template: '<div class="n-form-item"><slot /></div>',
    props: ['label'],
  },
  NRadioGroup: {
    name: 'NRadioGroup',
    template: '<div class="n-radio-group"><slot /></div>',
    props: ['value'],
    emits: ['update:value'],
  },
  NRadio: {
    name: 'NRadio',
    template: '<label class="n-radio"><input type="radio" :value="value" @change="$emit(\'update:checked\', value)" /><slot /></label>',
    props: ['value'],
    emits: ['update:checked'],
  },
  NUpload: {
    name: 'NUpload',
    template: '<div class="n-upload"><slot /></div>',
    props: ['max', 'accept', 'defaultUpload', 'fileList'],
    emits: ['change'],
  },
  NUploadDragger: {
    name: 'NUploadDragger',
    template: '<div class="n-upload-dragger"><slot /></div>',
  },
  NThing: {
    name: 'NThing',
    template: '<div class="n-thing"><div><slot name="header" /></div><div><slot name="description" /></div><div><slot /><slot name="footer" /></div></div>',
  },
  CategoryTreeSelect: {
    name: 'CategoryTreeSelect',
    template: `
      <select
        class="category-tree-select"
        :value="modelValue"
        @change="$emit('update:modelValue', $event.target.value); $emit('change', $event.target.value)"
      >
        <option value="">all</option>
        <option value="category-a">category-a</option>
        <option value="category-b">category-b</option>
      </select>
    `,
    props: ['modelValue', 'placeholder', 'showAllOption'],
    emits: ['update:modelValue', 'change', 'category-updated'],
  },
  FavoriteWorkspaceListItem: {
    name: 'FavoriteWorkspaceListItem',
    template: `
      <article class="favorite-list-item-stub" :data-selected="isSelected ? 'yes' : 'no'">
        <button class="favorite-card-select" @click="$emit('select', favorite)">{{ favorite.title }}</button>
        <button class="favorite-card-edit" @click="$emit('edit', favorite)">edit</button>
        <button class="favorite-card-delete" @click="$emit('delete', favorite)">delete</button>
      </article>
    `,
    props: ['favorite', 'category', 'isSelected'],
    emits: ['select', 'delete', 'edit'],
  },
  FavoriteDetailPanel: {
    name: 'FavoriteDetailPanel',
    template: `
      <div
        class="favorite-detail-panel-stub"
        data-testid="favorite-detail-panel"
        :data-favorite-id="favorite?.id || ''"
        :data-show-back="showBack ? 'yes' : 'no'"
      >
        <button v-if="showBack" class="favorite-detail-back" @click="$emit('back')">back</button>
        <span class="favorite-detail-title">{{ favorite?.title || 'empty' }}</span>
      </div>
    `,
    props: ['favorite', 'category', 'showBack'],
    emits: ['back', 'use', 'copy', 'edit', 'delete', 'fullscreen', 'favorite-updated'],
  },
  FavoriteEditorForm: {
    name: 'FavoriteEditorForm',
    template: `
      <div class="favorite-editor-form-stub" :data-mode="mode">
        <button class="favorite-editor-cancel" @click="$emit('cancel')">cancel</button>
        <button class="favorite-editor-save" @click="$emit('saved', favorite?.id || 'created-id')">save</button>
      </div>
    `,
    props: ['mode', 'favorite', 'embedded'],
    emits: ['cancel', 'saved'],
  },
  FavoriteImportPanel: {
    name: 'FavoriteImportPanel',
    template: `
      <div class="favorite-import-panel-stub">
        <button class="favorite-import-cancel" @click="$emit('cancel')">cancel</button>
        <button class="favorite-import-confirm" @click="$emit('imported')">import</button>
      </div>
    `,
    emits: ['cancel', 'imported'],
  },
  OutputDisplayFullscreen: {
    name: 'OutputDisplayFullscreen',
    template: '<div class="output-display-fullscreen"><slot /><slot name="extra-content" /></div>',
    props: ['modelValue', 'title', 'content', 'originalContent', 'reasoning', 'mode', 'enabledActions'],
    emits: ['update:modelValue', 'copy'],
  },
  FavoriteMediaPreviewPanel: {
    name: 'FavoriteMediaPreviewPanel',
    template: '<div class="favorite-media-preview-panel"></div>',
    props: ['favorite'],
  },
  FavoritePreviewExtensionHost: {
    name: 'FavoritePreviewExtensionHost',
    template: '<div class="favorite-preview-extension-host"></div>',
    props: ['favorite'],
    emits: ['favorite-updated'],
  },
  CategoryManager: {
    name: 'CategoryManager',
    template: '<div class="category-manager"></div>',
    emits: ['category-updated'],
  },
  TagManager: {
    name: 'TagManager',
    template: '<div class="tag-manager"></div>',
    props: ['show'],
    emits: ['update:show', 'updated'],
  },
  ToastUI: {
    name: 'ToastUI',
    template: '<div class="toast-ui"><slot /></div>',
  },
}

const categories: FavoriteCategory[] = [
  {
    id: 'category-a',
    name: 'Alpha',
    createdAt: Date.now(),
    sortOrder: 1,
  },
  {
    id: 'category-b',
    name: 'Beta',
    createdAt: Date.now(),
    sortOrder: 2,
  },
]

const createFavorite = (index: number, overrides: Partial<FavoritePrompt> = {}): FavoritePrompt => ({
  id: `favorite-${index}`,
  title: `Favorite ${index}`,
  content: `Prompt content ${index}`,
  description: `Description ${index}`,
  createdAt: Date.now() - index * 1000,
  updatedAt: Date.now() - index * 1000,
  tags: index % 2 === 0 ? ['shared', 'alpha'] : ['shared', 'beta'],
  category: index % 2 === 0 ? 'category-a' : 'category-b',
  useCount: index,
  functionMode: index % 2 === 0 ? 'basic' : 'image',
  optimizationMode: index % 2 === 0 ? 'system' : undefined,
  imageSubMode: index % 2 === 0 ? undefined : 'text2image',
  ...overrides,
})

const createServices = (favorites: FavoritePrompt[]) => ({
  favoriteManager: {
    getFavorites: vi.fn().mockResolvedValue(favorites),
    getCategories: vi.fn().mockResolvedValue(categories),
    importFavorites: vi.fn().mockResolvedValue({ imported: 0, skipped: 0, errors: [] }),
    incrementUseCount: vi.fn().mockResolvedValue(undefined),
    deleteFavorite: vi.fn().mockResolvedValue(undefined),
    deleteFavorites: vi.fn().mockResolvedValue(undefined),
    exportFavorites: vi.fn().mockResolvedValue('{}'),
  },
})

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
  window.dispatchEvent(new Event('resize'))
}

const mountComponent = async (favorites: FavoritePrompt[]) => {
  const services = createServices(favorites)
  const wrapper = mount(FavoriteManager, {
    props: {
      show: true,
    },
    global: {
      stubs: naiveStubs,
      provide: {
        services: ref(services as any),
      },
    },
  })

  await flushPromises()
  return { wrapper, services }
}

describe('FavoriteManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
    toastMock.warning.mockReset()
    toastMock.info.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders desktop master-detail layout and updates the detail selection', async () => {
    setViewportWidth(1400)
    const favorites = Array.from({ length: 4 }, (_, index) => createFavorite(index + 1))
    const { wrapper } = await mountComponent(favorites)

    expect(wrapper.find('[data-testid="favorites-manager-workspace"]').exists()).toBe(true)
    expect(wrapper.findAll('.favorite-list-item-stub')).toHaveLength(4)
    expect(wrapper.find('[data-testid="favorite-detail-panel"]').attributes('data-favorite-id')).toBe('favorite-1')

    await wrapper.findAll('.favorite-card-select')[1].trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="favorite-detail-panel"]').attributes('data-favorite-id')).toBe('favorite-2')
  })

  it('reloads favorites when the manager is reopened after an external save', async () => {
    setViewportWidth(1400)
    const favorites = [createFavorite(1)]
    const { wrapper, services } = await mountComponent(favorites)

    expect(wrapper.findAll('.favorite-list-item-stub')).toHaveLength(1)

    await wrapper.setProps({ show: false })
    await flushPromises()

    services.favoriteManager.getFavorites.mockResolvedValueOnce([
      ...favorites,
      createFavorite(2),
    ])
    await wrapper.setProps({ show: true })
    await flushPromises()

    expect(services.favoriteManager.getFavorites).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('.favorite-list-item-stub')).toHaveLength(2)
  })

  it('uses a mobile list-detail flow with a back action', async () => {
    setViewportWidth(640)
    const favorites = Array.from({ length: 3 }, (_, index) => createFavorite(index + 1))
    const { wrapper } = await mountComponent(favorites)

    expect(wrapper.find('[data-testid="favorite-detail-panel"]').exists()).toBe(false)
    expect(wrapper.findAll('.favorite-list-item-stub')).toHaveLength(3)

    await wrapper.findAll('.favorite-card-select')[0].trigger('click')
    await flushPromises()

    const detailPanel = wrapper.find('[data-testid="favorite-detail-panel"]')
    expect(detailPanel.exists()).toBe(true)
    expect(detailPanel.attributes('data-show-back')).toBe('yes')

    await wrapper.find('.favorite-detail-back').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="favorite-detail-panel"]').exists()).toBe(false)
    expect(wrapper.findAll('.favorite-list-item-stub')).toHaveLength(3)
  })

  it('filters before pagination and hides pagination when the result fits on one page', async () => {
    setViewportWidth(1400)
    const favorites = Array.from({ length: 7 }, (_, index) =>
      createFavorite(index + 1, {
        title: index === 0 ? 'Alpha landing' : `Favorite ${index + 1}`,
      }),
    )
    const { wrapper } = await mountComponent(favorites)

    expect(wrapper.find('[data-testid="favorites-manager-pagination"]').exists()).toBe(true)

    await wrapper.find('.n-input input').setValue('Alpha')
    await flushPromises()

    expect(wrapper.findAll('.favorite-list-item-stub')).toHaveLength(1)
    expect(wrapper.find('[data-testid="favorites-manager-pagination"]').exists()).toBe(false)
  })

  it('keeps import and add actions visible and does not show an optimize action in the empty state', async () => {
    setViewportWidth(1400)
    const { wrapper } = await mountComponent([])

    expect(wrapper.text()).toContain('No favorites yet')
    expect(wrapper.text()).not.toContain('Optimize')
    expect(wrapper.find('[data-testid="favorites-manager-import"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="favorites-manager-add"]').exists()).toBe(true)
  })

  it('switches create and import flows into the right-side task panel', async () => {
    setViewportWidth(1400)
    const favorites = Array.from({ length: 2 }, (_, index) => createFavorite(index + 1))
    const { wrapper } = await mountComponent(favorites)

    await wrapper.find('[data-testid="favorites-manager-add"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.favorite-editor-form-stub').attributes('data-mode')).toBe('create')

    await wrapper.find('.favorite-editor-cancel').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="favorite-detail-panel"]').exists()).toBe(true)

    await wrapper.find('[data-testid="favorites-manager-import"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.favorite-import-panel-stub').exists()).toBe(true)
  })
})
