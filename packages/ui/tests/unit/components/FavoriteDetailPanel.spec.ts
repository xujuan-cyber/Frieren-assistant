import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

import type { FavoriteCategory, FavoritePrompt } from '@prompt-optimizer/core'

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) => {
        const messages: Record<string, string> = {
          'favorites.manager.preview.selectFavorite': 'Select a favorite',
          'favorites.manager.preview.backToList': 'Back to list',
          'favorites.manager.card.copyContent': 'Copy content',
          'favorites.manager.card.useNow': 'Use now',
          'favorites.manager.card.edit': 'Edit',
          'favorites.manager.card.delete': 'Delete',
          'favorites.manager.preview.updatedAt': `Updated ${params?.time ?? ''}`.trim(),
          'favorites.manager.preview.useCountInline': `${params?.count ?? 0} uses`,
          'favorites.manager.preview.contentTitle': 'Content',
          'favorites.manager.preview.extraTitle': 'Extra details',
          'favorites.manager.preview.media.title': 'Images',
          'favorites.manager.preview.media.imageAlt': `Image ${params?.index ?? ''}`.trim(),
          'favorites.manager.card.functionMode.basic': 'Basic',
          'favorites.manager.card.functionMode.context': 'Context',
          'favorites.manager.card.functionMode.image': 'Image',
          'favorites.manager.card.optimizationMode.system': 'System',
          'favorites.manager.card.optimizationMode.user': 'User',
          'favorites.manager.card.imageSubMode.text2image': 'Text-to-Image',
          'favorites.manager.card.imageSubMode.image2image': 'Image-to-Image',
          'favorites.manager.card.imageSubMode.multiimage': 'Multi-Image',
          'contextMode.optimizationMode.message': 'Message',
          'contextMode.optimizationMode.variable': 'Variable',
          'common.fullscreen': 'Fullscreen',
          'favorites.manager.time.justNow': 'Just now',
          'favorites.manager.time.minutesAgo': `${params?.minutes ?? 0} minutes ago`,
          'favorites.manager.time.hoursAgo': `${params?.hours ?? 0} hours ago`,
          'favorites.manager.time.yesterday': 'Yesterday',
          'favorites.manager.time.daysAgo': `${params?.days ?? 0} days ago`,
        }
        return messages[key] ?? key
      },
    }),
  }
})

import FavoriteDetailPanel from '../../../src/components/FavoriteDetailPanel.vue'

const parseFavoriteMediaMetadataMock = vi.fn()
const resolveAssetIdToDataUrlMock = vi.fn()

vi.mock('../../../src/utils/favorite-media', () => ({
  parseFavoriteMediaMetadata: (...args: unknown[]) => parseFavoriteMediaMetadataMock(...args),
}))

vi.mock('../../../src/utils/image-asset-storage', () => ({
  resolveAssetIdToDataUrl: (...args: unknown[]) => resolveAssetIdToDataUrlMock(...args),
}))

const naiveStubs = {
  NSpace: {
    name: 'NSpace',
    template: '<div class="n-space"><slot /></div>',
    props: ['vertical', 'size', 'align', 'justify', 'wrap', 'class'],
  },
  NButton: {
    name: 'NButton',
    template: '<button class="n-button" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>',
    emits: ['click'],
  },
  NCard: {
    name: 'NCard',
    template: '<section class="n-card"><header><slot name="header" />{{ title }}</header><div><slot /></div></section>',
    props: ['size', 'segmented', 'title', 'class'],
  },
  NCollapse: {
    name: 'NCollapse',
    template: '<div class="n-collapse"><slot /></div>',
    props: ['defaultExpandedNames', 'class'],
  },
  NCollapseItem: {
    name: 'NCollapseItem',
    template: '<section class="n-collapse-item"><header>{{ title }}</header><div><slot /></div></section>',
    props: ['name', 'title'],
  },
  NEmpty: {
    name: 'NEmpty',
    template: '<div class="n-empty">{{ description }}</div>',
    props: ['description'],
  },
  NEllipsis: {
    name: 'NEllipsis',
    template: '<div class="n-ellipsis"><slot /></div>',
    props: ['lineClamp', 'tooltip', 'class'],
  },
  NIcon: {
    name: 'NIcon',
    template: '<i class="n-icon"><slot /></i>',
  },
  NTag: {
    name: 'NTag',
    template: '<span class="n-tag"><slot /></span>',
    props: ['type', 'bordered', 'color'],
  },
  NText: {
    name: 'NText',
    template: '<span class="n-text"><slot /></span>',
    props: ['depth', 'strong', 'class'],
  },
  OutputDisplayCore: {
    name: 'OutputDisplayCore',
    template: '<div class="output-display-core" :data-enabled-actions="(enabledActions || []).join(\',\')">{{ content }}</div>',
    props: ['content', 'originalContent', 'mode', 'enabledActions', 'height'],
  },
  FavoritePreviewExtensionHost: {
    name: 'FavoritePreviewExtensionHost',
    template: '<div class="favorite-preview-extension-host"></div>',
    props: ['favorite'],
    emits: ['favorite-updated'],
  },
  AppPreviewImage: {
    name: 'AppPreviewImage',
    template: '<img class="app-preview-image" :src="src" :alt="alt" />',
    props: ['src', 'alt', 'width', 'objectFit', 'previewDisabled', 'class'],
  },
  AppPreviewImageGroup: {
    name: 'AppPreviewImageGroup',
    template: '<div class="app-preview-image-group"><slot /></div>',
  },
}

const favorite: FavoritePrompt = {
  id: 'favorite-1',
  title: 'Visual prompt',
  content: 'Rendered content',
  description: 'Favorite description',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tags: ['visual', 'hero'],
  category: 'category-1',
  useCount: 4,
  functionMode: 'image',
  imageSubMode: 'text2image',
}

const category: FavoriteCategory = {
  id: 'category-1',
  name: 'Visual',
  createdAt: Date.now(),
  sortOrder: 1,
}

const mountComponent = (favoriteOverride: FavoritePrompt | null) =>
  mount(FavoriteDetailPanel, {
    props: {
      favorite: favoriteOverride,
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

describe('FavoriteDetailPanel', () => {
  beforeEach(() => {
    parseFavoriteMediaMetadataMock.mockReset()
    resolveAssetIdToDataUrlMock.mockReset()
    parseFavoriteMediaMetadataMock.mockReturnValue(null)
    resolveAssetIdToDataUrlMock.mockResolvedValue(null)
  })

  it('uses the text-first template when no media is available', async () => {
    const wrapper = mountComponent({
      ...favorite,
      functionMode: 'basic',
      optimizationMode: 'system',
      imageSubMode: undefined,
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="favorite-detail-panel"]').attributes('data-variant')).toBe('text')
    expect(wrapper.text()).toContain('Rendered content')
  })

  it('uses the image-first template and emits actions for media favorites', async () => {
    parseFavoriteMediaMetadataMock.mockReturnValue({
      coverAssetId: 'cover-1',
      assetIds: ['image-2'],
      urls: [],
    })
    resolveAssetIdToDataUrlMock.mockImplementation(async (assetId: string) =>
      `data:image/png;base64,${assetId}`,
    )

    const wrapper = mountComponent(favorite)

    await flushPromises()

    expect(wrapper.find('[data-testid="favorite-detail-panel"]').attributes('data-variant')).toBe('image')
    expect(wrapper.find('[data-testid="favorite-detail-media-hero"]').exists()).toBe(true)

    const buttons = wrapper.findAll('.n-button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')
    await buttons[3].trigger('click')
    await buttons[4].trigger('click')

    expect(wrapper.emitted('use')).toHaveLength(1)
    expect(wrapper.emitted('copy')).toHaveLength(1)
    expect(wrapper.emitted('fullscreen')).toHaveLength(1)
    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('ignores stale media resolution after switching to a text-only favorite', async () => {
    let resolveCover: (value: string | null) => void = () => {}
    parseFavoriteMediaMetadataMock.mockImplementation((candidate?: FavoritePrompt | null) =>
      candidate?.id === 'media-favorite'
        ? {
            coverAssetId: 'cover-1',
            assetIds: [],
            urls: [],
          }
        : null,
    )
    resolveAssetIdToDataUrlMock.mockReturnValue(
      new Promise((resolve) => {
        resolveCover = resolve
      }),
    )

    const wrapper = mountComponent({
      ...favorite,
      id: 'media-favorite',
    })

    await wrapper.setProps({
      favorite: {
        ...favorite,
        id: 'text-favorite',
        functionMode: 'basic',
        optimizationMode: 'system',
        imageSubMode: undefined,
      },
    })
    await flushPromises()

    resolveCover('data:image/png;base64,stale-cover')
    await flushPromises()

    expect(wrapper.find('[data-testid="favorite-detail-panel"]').attributes('data-variant')).toBe('text')
    expect(wrapper.find('[data-testid="favorite-detail-media-hero"]').exists()).toBe(false)
  })

  it('enables diff actions for legacy top-level originalContent', async () => {
    const wrapper = mountComponent({
      ...favorite,
      functionMode: 'basic',
      optimizationMode: 'system',
      imageSubMode: undefined,
      originalContent: 'Original prompt',
    } as FavoritePrompt)

    await flushPromises()

    expect(wrapper.find('.output-display-core').attributes('data-enabled-actions')).toBe('diff')
  })
})
