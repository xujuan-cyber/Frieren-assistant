import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

import type { FavoriteCategory, FavoritePrompt } from '@prompt-optimizer/core'

import FavoriteCard from '../../../src/components/FavoriteCard.vue'

const parseFavoriteMediaMetadataMock = vi.fn()
const resolveAssetIdToDataUrlMock = vi.fn()

vi.mock('../../../src/utils/favorite-media', () => ({
  parseFavoriteMediaMetadata: (...args: unknown[]) => parseFavoriteMediaMetadataMock(...args),
}))

vi.mock('../../../src/utils/image-asset-storage', () => ({
  resolveAssetIdToDataUrl: (...args: unknown[]) => resolveAssetIdToDataUrlMock(...args),
}))

const naiveStubs = {
  NCard: {
    name: 'NCard',
    template: `
      <article class="n-card" @click="$emit('click')">
        <header class="n-card-header"><slot name="header" /></header>
        <div class="n-card-cover"><slot name="cover" /></div>
        <section class="n-card-content"><slot /></section>
        <footer class="n-card-footer"><slot name="footer" /></footer>
      </article>
    `,
    emits: ['click'],
  },
  NSpace: {
    name: 'NSpace',
    template: '<div class="n-space"><slot /></div>',
    props: ['vertical', 'size', 'align', 'justify', 'wrap', 'class'],
  },
  NTag: {
    name: 'NTag',
    template: '<span class="n-tag"><slot /></span>',
    props: ['type', 'size', 'bordered', 'color'],
  },
  NText: {
    name: 'NText',
    template: '<span class="n-text"><slot /></span>',
    props: ['depth'],
  },
  NIcon: {
    name: 'NIcon',
    template: '<i class="n-icon"><slot /></i>',
  },
  NButton: {
    name: 'NButton',
    template: '<button class="n-button" :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>',
    emits: ['click'],
  },
  NEllipsis: {
    name: 'NEllipsis',
    template: '<span class="n-ellipsis"><slot /></span>',
    props: ['lineClamp', 'tooltip', 'class'],
  },
  NThing: {
    name: 'NThing',
    template: '<div class="n-thing"><div><slot name="header" /></div><div><slot /></div><div><slot name="footer" /></div></div>',
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
  AppPreviewImage: {
    name: 'AppPreviewImage',
    template: '<img class="app-preview-image" :src="src" :alt="alt" />',
    props: ['src', 'alt', 'objectFit', 'previewDisabled', 'class'],
  },
}

const createFavorite = (overrides: Partial<FavoritePrompt> = {}): FavoritePrompt => ({
  id: 'favorite-1',
  title: 'Prompt title',
  content: 'A concise favorite content block for testing.',
  description: 'A reusable favorite description.',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tags: ['tag-a', 'tag-b', 'tag-c'],
  category: 'category-1',
  useCount: 7,
  functionMode: 'image',
  imageSubMode: 'text2image',
  ...overrides,
})

const category: FavoriteCategory = {
  id: 'category-1',
  name: 'Visual',
  color: '#3366ff',
  createdAt: Date.now(),
  sortOrder: 1,
}

const mountComponent = (favorite: FavoritePrompt) =>
  mount(FavoriteCard, {
    props: {
      favorite,
      category,
    },
    global: {
      stubs: naiveStubs,
      provide: {
        services: ref({
          favoriteImageStorageService: {},
          imageStorageService: {},
        } as any),
      },
    },
  })

describe('FavoriteCard', () => {
  beforeEach(() => {
    parseFavoriteMediaMetadataMock.mockReset()
    resolveAssetIdToDataUrlMock.mockReset()
    parseFavoriteMediaMetadataMock.mockReturnValue(null)
    resolveAssetIdToDataUrlMock.mockResolvedValue(null)
  })

  it('renders a unified placeholder cover for text-only favorites', async () => {
    const wrapper = mountComponent(createFavorite({ functionMode: 'basic', optimizationMode: 'system' }))

    await flushPromises()

    expect(wrapper.find('[data-testid="favorite-card-cover"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="favorite-card-cover-placeholder"]').exists()).toBe(true)
    expect(wrapper.find('.app-preview-image').exists()).toBe(false)
    expect(wrapper.text()).toContain('Use now')
    expect(wrapper.text()).toContain('Copy content')
    expect(wrapper.text()).toContain('System')
  })

  it('renders cover media and emits select plus action events', async () => {
    parseFavoriteMediaMetadataMock.mockReturnValue({
      coverAssetId: 'asset-cover-1',
      coverUrl: 'https://example.com/fallback.png',
    })
    resolveAssetIdToDataUrlMock.mockResolvedValue('data:image/png;base64,cover')

    const wrapper = mountComponent(createFavorite())

    await flushPromises()

    expect(wrapper.find('.app-preview-image').exists()).toBe(true)
    expect(wrapper.find('[data-testid="favorite-card-cover-placeholder"]').exists()).toBe(false)

    await wrapper.find('.n-card').trigger('click')
    await wrapper.find('[data-testid="favorite-card-use-button"]').trigger('click')
    await wrapper.find('[data-testid="favorite-card-copy-button"]').trigger('click')
    const vm = wrapper.vm as unknown as { handleMenuSelect: (key: string) => void }
    vm.handleMenuSelect('edit')
    vm.handleMenuSelect('delete')

    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('use')).toHaveLength(1)
    expect(wrapper.emitted('copy')).toHaveLength(1)
    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })
})
