<template>
  <ToastUI>
    <NModal
      :show="show"
      preset="card"
      :style="favoriteManagerModalStyle"
      :title="t('favorites.manager.title')"
      size="large"
      :bordered="false"
      content-style="padding: 0;"
      @update:show="(value) => !value && close()"
    >
      <div class="favorites-manager-shell">
        <div class="favorites-manager-toolbar">
          <NSpace vertical :size="16">
            <div class="favorites-manager-toolbar-row favorites-manager-toolbar-row--search">
              <NInput
                v-model:value="searchKeyword"
                :placeholder="t('favorites.manager.searchPlaceholder')"
                clearable
                class="favorites-manager-search"
                @update:value="handleSearch"
              >
                <template #prefix>
                  <NIcon><Search /></NIcon>
                </template>
              </NInput>

              <NText depth="3" class="favorites-manager-count">
                {{ t('favorites.manager.totalCount', { count: filteredFavorites.length }) }}
              </NText>
            </div>

            <div class="favorites-manager-toolbar-row favorites-manager-toolbar-row--controls">
              <NSpace :size="12" align="center" wrap class="favorites-manager-filters">
                <CategoryTreeSelect
                  v-model="selectedCategory"
                  :placeholder="t('favorites.manager.allCategories')"
                  show-all-option
                  @change="handleFilterChange"
                  @category-updated="handleCategoryUpdated"
                />

                <NSelect
                  v-model:value="selectedTags"
                  :options="tagOptions"
                  :placeholder="t('favorites.manager.allTags')"
                  multiple
                  clearable
                  filterable
                  max-tag-count="responsive"
                  class="favorites-manager-tag-select"
                  @update:value="handleFilterChange"
                />
              </NSpace>

              <NSpace :size="8" align="center" wrap class="favorites-manager-actions">
                <NDropdown
                  :options="actionMenuOptions"
                  @select="handleActionMenuSelect"
                >
                  <NButton secondary data-testid="favorites-manager-actions">
                    <template #icon>
                      <NIcon><DotsVertical /></NIcon>
                    </template>
                  </NButton>
                </NDropdown>

                <NButton secondary data-testid="favorites-manager-import" @click="openImportPanel">
                  <template #icon>
                    <NIcon><Upload /></NIcon>
                  </template>
                  <span class="button-text">{{ t('favorites.manager.import') }}</span>
                </NButton>

                <NButton type="primary" data-testid="favorites-manager-add" @click="handleCreateFavorite">
                  <template #icon>
                    <NIcon><Plus /></NIcon>
                  </template>
                  <span class="button-text">{{ t('favorites.manager.add') }}</span>
                </NButton>
              </NSpace>
            </div>
          </NSpace>
        </div>

        <div
          class="favorites-manager-workspace"
          :class="{ 'favorites-manager-workspace--mobile': isMobile }"
          data-testid="favorites-manager-workspace"
        >
          <template v-if="isMobile">
            <NCard
              v-if="mobileView === 'list'"
              size="small"
              :segmented="{ content: true }"
              class="favorites-manager-pane favorites-manager-pane--list"
            >
              <template #header>
                <div class="favorites-manager-pane-header">
                  <NText strong>{{ t('favorites.manager.preview.listTitle') }}</NText>
                  <NText depth="3">{{ t('favorites.manager.totalCount', { count: filteredFavorites.length }) }}</NText>
                </div>
              </template>

              <NScrollbar class="favorites-manager-scroll">
                <div v-if="paginatedFavorites.length === 0" class="favorites-manager-empty">
                  <NEmpty
                    :description="searchKeyword ? t('favorites.manager.emptySearchResult') : t('favorites.manager.emptyDescription')"
                    size="large"
                  >
                    <template #extra>
                      <NSpace justify="center" :size="8">
                        <NButton secondary @click="openImportPanel">
                          {{ t('favorites.manager.import') }}
                        </NButton>
                        <NButton type="primary" @click="handleCreateFavorite">
                          {{ t('favorites.manager.add') }}
                        </NButton>
                      </NSpace>
                    </template>
                  </NEmpty>
                </div>

                <NSpace v-else vertical :size="12" class="favorites-manager-list">
                  <FavoriteWorkspaceListItem
                    v-for="favorite in paginatedFavorites"
                    :key="favorite.id"
                    :favorite="favorite"
                    :category="getCategoryById(favorite.category)"
                    :is-selected="selectedFavorite?.id === favorite.id && workspaceMode === 'detail'"
                    @select="handleSelectFavorite"
                    @edit="handleEditFavorite"
                    @delete="handleDeleteFavorite"
                  />
                </NSpace>
              </NScrollbar>

              <template v-if="showPagination" #footer>
                <div class="favorites-manager-pagination">
                  <NPagination
                    v-model:page="currentPage"
                    :page-size="pageSize"
                    :item-count="filteredFavorites.length"
                    :page-slot="5"
                    data-testid="favorites-manager-pagination"
                    :data-page-size="pageSize"
                  />
                </div>
              </template>
            </NCard>

            <NCard
              v-else
              size="small"
              :segmented="{ content: true }"
              class="favorites-manager-pane favorites-manager-pane--detail"
            >
              <template v-if="showPaneHeader" #header>
                <div class="favorites-manager-pane-header">
                  <NButton quaternary size="small" class="favorites-manager-back" @click="handleBackToList">
                    {{ t('favorites.manager.preview.backToList') }}
                  </NButton>
                  <NText strong>{{ paneTitle }}</NText>
                </div>
              </template>

              <div class="favorites-manager-task">
                <FavoriteDetailPanel
                  v-if="workspaceMode === 'detail'"
                  :favorite="selectedFavorite"
                  :category="getCategoryById(selectedFavorite?.category)"
                  :show-back="true"
                  @back="handleBackToList"
                  @copy="handleCopyFavorite"
                  @use="handleUseFavorite"
                  @edit="handleEditFavorite"
                  @delete="handleDeleteFavorite"
                  @fullscreen="handleOpenFullscreenFavorite"
                  @favorite-updated="handleFavoriteDetailUpdated"
                />

                <FavoriteEditorForm
                  v-else-if="workspaceMode === 'edit'"
                  embedded
                  mode="edit"
                  :favorite="taskFavorite || undefined"
                  @cancel="handleTaskCancel"
                  @saved="handleEditorSaved"
                />

                <FavoriteEditorForm
                  v-else-if="workspaceMode === 'create'"
                  embedded
                  mode="create"
                  @cancel="handleTaskCancel"
                  @saved="handleEditorSaved"
                />

                <FavoriteImportPanel
                  v-else
                  @cancel="handleTaskCancel"
                  @imported="handleImportCompleted"
                />
              </div>
            </NCard>
          </template>

          <template v-else>
            <NCard
              size="small"
              :segmented="{ content: true }"
              class="favorites-manager-pane favorites-manager-pane--list"
            >
              <template #header>
                <div class="favorites-manager-pane-header">
                  <NText strong>{{ t('favorites.manager.preview.listTitle') }}</NText>
                  <NText depth="3">{{ t('favorites.manager.totalCount', { count: filteredFavorites.length }) }}</NText>
                </div>
              </template>

              <NScrollbar class="favorites-manager-scroll">
                <div v-if="paginatedFavorites.length === 0" class="favorites-manager-empty">
                  <NEmpty
                    :description="searchKeyword ? t('favorites.manager.emptySearchResult') : t('favorites.manager.emptyDescription')"
                    size="large"
                  >
                    <template #extra>
                      <NSpace justify="center" :size="8">
                        <NButton secondary @click="openImportPanel">
                          {{ t('favorites.manager.import') }}
                        </NButton>
                        <NButton type="primary" @click="handleCreateFavorite">
                          {{ t('favorites.manager.add') }}
                        </NButton>
                      </NSpace>
                    </template>
                  </NEmpty>
                </div>

                <NSpace v-else vertical :size="12" class="favorites-manager-list">
                  <FavoriteWorkspaceListItem
                    v-for="favorite in paginatedFavorites"
                    :key="favorite.id"
                    :favorite="favorite"
                    :category="getCategoryById(favorite.category)"
                    :is-selected="selectedFavorite?.id === favorite.id && workspaceMode === 'detail'"
                    @select="handleSelectFavorite"
                    @edit="handleEditFavorite"
                    @delete="handleDeleteFavorite"
                  />
                </NSpace>
              </NScrollbar>

              <template v-if="showPagination" #footer>
                <div class="favorites-manager-pagination">
                  <NPagination
                    v-model:page="currentPage"
                    :page-size="pageSize"
                    :item-count="filteredFavorites.length"
                    :page-slot="5"
                    data-testid="favorites-manager-pagination"
                    :data-page-size="pageSize"
                  />
                </div>
              </template>
            </NCard>

            <NCard
              size="small"
              :segmented="{ content: true }"
              class="favorites-manager-pane favorites-manager-pane--detail"
            >
              <template v-if="showPaneHeader" #header>
                <div class="favorites-manager-pane-header">
                  <NText strong>{{ paneTitle }}</NText>
                </div>
              </template>

              <div class="favorites-manager-task">
                <FavoriteDetailPanel
                  v-if="workspaceMode === 'detail'"
                  :favorite="selectedFavorite"
                  :category="getCategoryById(selectedFavorite?.category)"
                  @copy="handleCopyFavorite"
                  @use="handleUseFavorite"
                  @edit="handleEditFavorite"
                  @delete="handleDeleteFavorite"
                  @fullscreen="handleOpenFullscreenFavorite"
                  @favorite-updated="handleFavoriteDetailUpdated"
                />

                <FavoriteEditorForm
                  v-else-if="workspaceMode === 'edit'"
                  embedded
                  mode="edit"
                  :favorite="taskFavorite || undefined"
                  @cancel="handleTaskCancel"
                  @saved="handleEditorSaved"
                />

                <FavoriteEditorForm
                  v-else-if="workspaceMode === 'create'"
                  embedded
                  mode="create"
                  @cancel="handleTaskCancel"
                  @saved="handleEditorSaved"
                />

                <FavoriteImportPanel
                  v-else
                  @cancel="handleTaskCancel"
                  @imported="handleImportCompleted"
                />
              </div>
            </NCard>
          </template>
        </div>
      </div>

      <OutputDisplayFullscreen
        v-if="fullscreenFavorite"
        v-model="fullscreenVisible"
        :title="fullscreenDialogTitle"
        :content="fullscreenFavorite.content"
        :original-content="fullscreenOriginalContent"
        :reasoning="fullscreenFavorite.metadata?.reasoning || ''"
        mode="readonly"
        :enabled-actions="['copy', 'diff']"
        @copy="handleFullscreenCopy"
      >
        <template #extra-content>
          <FavoriteMediaPreviewPanel
            :favorite="fullscreenFavorite"
          />
          <FavoritePreviewExtensionHost
            :favorite="fullscreenFavorite"
            @favorite-updated="handleFavoriteDetailUpdated"
          />
        </template>
      </OutputDisplayFullscreen>

      <NModal
        :show="categoryManagerVisible"
        preset="card"
        :title="t('favorites.manager.categoryManager.title')"
        :mask-closable="true"
        :style="{ width: 'min(800px, 90vw)', height: 'min(600px, 80vh)' }"
        @update:show="categoryManagerVisible = $event"
      >
        <CategoryManager @category-updated="handleCategoryUpdated" />
      </NModal>

      <TagManager
        :show="tagManagerVisible"
        @update:show="tagManagerVisible = $event"
        @updated="loadFavorites"
      />
    </NModal>
  </ToastUI>
</template>

<script setup lang="ts">
import { computed, h, inject, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

import { useDebounceFn } from '@vueuse/core'
import {
  NButton,
  NCard,
  NDropdown,
  NEmpty,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NScrollbar,
  NSelect,
  NSpace,
  NText,
} from 'naive-ui'
import {
  DotsVertical,
  Download,
  Folder,
  Plus,
  Search,
  Tags,
  Trash,
  Upload,
} from '@vicons/tabler'
import { useI18n } from 'vue-i18n'
import type { FavoriteCategory, FavoritePrompt } from '@prompt-optimizer/core'

import { useFavoriteInitializer } from '../composables/storage/useFavoriteInitializer'
import { useToast } from '../composables/ui/useToast'
import type { AppServices } from '../types/services'
import { getI18nErrorMessage } from '../utils/error'
import CategoryManager from './CategoryManager.vue'
import CategoryTreeSelect from './CategoryTreeSelect.vue'
import FavoriteDetailPanel from './FavoriteDetailPanel.vue'
import FavoriteEditorForm from './FavoriteEditorForm.vue'
import FavoriteImportPanel from './FavoriteImportPanel.vue'
import FavoriteMediaPreviewPanel from './FavoriteMediaPreviewPanel.vue'
import FavoritePreviewExtensionHost from './FavoritePreviewExtensionHost.vue'
import FavoriteWorkspaceListItem from './FavoriteWorkspaceListItem.vue'
import OutputDisplayFullscreen from './OutputDisplayFullscreen.vue'
import TagManager from './TagManager.vue'
import ToastUI from './Toast.vue'

type WorkspaceMode = 'detail' | 'edit' | 'create' | 'import'

const FAVORITE_MANAGER_MODAL_MAX_WIDTH = '1440px'
const favoriteManagerModalStyle = {
  width: '96vw',
  maxWidth: FAVORITE_MANAGER_MODAL_MAX_WIDTH,
  maxHeight: '90vh',
}

const { t } = useI18n()

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  'optimize-prompt': []
  'use-favorite': [favorite: FavoritePrompt]
  'update:show': [value: boolean]
  'close': []
}>()

const close = () => {
  emit('update:show', false)
  emit('close')
}

const services = inject<Ref<AppServices | null> | null>('services', null)
const message = useToast()

const { ensureDefaultCategories } = services?.value?.favoriteManager
  ? useFavoriteInitializer(services.value.favoriteManager)
  : { ensureDefaultCategories: async () => {} }

const favorites = ref<FavoritePrompt[]>([])
const categories = ref<FavoriteCategory[]>([])
const currentPage = ref(1)
const searchKeyword = ref('')
const selectedCategory = ref<string>('')
const selectedTags = ref<string[]>([])
const selectedFavorite = ref<FavoritePrompt | null>(null)
const fullscreenFavorite = ref<FavoritePrompt | null>(null)
const workspaceMode = ref<WorkspaceMode>('detail')
const taskFavorite = ref<FavoritePrompt | null>(null)
const mobileView = ref<'list' | 'panel'>('list')
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1440)

const categoryManagerVisible = ref(false)
const tagManagerVisible = ref(false)

const isMobile = computed(() => viewportWidth.value < 1024)

const pageSize = computed(() => {
  if (viewportWidth.value < 768) return 3
  if (viewportWidth.value < 1280) return 4
  return 6
})

const filteredFavorites = computed(() => {
  let result = favorites.value

  if (selectedCategory.value) {
    const categoryIds = getCategoryWithDescendants(selectedCategory.value)
    result = result.filter((favorite) => !!favorite.category && categoryIds.includes(favorite.category))
  }

  if (selectedTags.value.length > 0) {
    result = result.filter((favorite) =>
      selectedTags.value.every((tag) => favorite.tags.includes(tag)),
    )
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter((favorite) =>
      favorite.title.toLowerCase().includes(keyword)
      || favorite.content.toLowerCase().includes(keyword)
      || favorite.description?.toLowerCase().includes(keyword),
    )
  }

  return result
})

const pageCount = computed(() => Math.max(1, Math.ceil(filteredFavorites.value.length / pageSize.value)))

const paginatedFavorites = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredFavorites.value.slice(start, start + pageSize.value)
})

const showPagination = computed(() => filteredFavorites.value.length > pageSize.value)

const tagOptions = computed(() => {
  const allTags = new Set<string>()
  favorites.value.forEach((favorite) => {
    favorite.tags.forEach((tag) => allTags.add(tag))
  })
  return Array.from(allTags)
    .sort()
    .map((tag) => ({
      label: tag,
      value: tag,
    }))
})

const actionMenuOptions = computed(() => [
  {
    label: () => h('span', { 'data-testid': 'favorites-manager-action-manage-tags' }, t('favorites.manager.actions.manageTags')),
    key: 'manageTags',
    icon: () => h(NIcon, null, { default: () => h(Tags) }),
  },
  {
    label: () => h('span', { 'data-testid': 'favorites-manager-action-manage-categories' }, t('favorites.manager.actions.manageCategories')),
    key: 'manageCategories',
    icon: () => h(NIcon, null, { default: () => h(Folder) }),
  },
  {
    type: 'divider',
  },
  {
    label: () => h('span', { 'data-testid': 'favorites-manager-action-export' }, t('favorites.manager.actions.export')),
    key: 'export',
    icon: () => h(NIcon, null, { default: () => h(Download) }),
  },
  {
    type: 'divider',
  },
  {
    label: () => h('span', { 'data-testid': 'favorites-manager-action-clear' }, t('favorites.manager.actions.clear')),
    key: 'clear',
    icon: () => h(NIcon, null, { default: () => h(Trash) }),
  },
])

const fullscreenVisible = computed({
  get: () => fullscreenFavorite.value !== null,
  set: (value: boolean) => {
    if (!value) {
      fullscreenFavorite.value = null
    }
  },
})

const fullscreenOriginalContent = computed(() => {
  if (!fullscreenFavorite.value) {
    return ''
  }

  const legacyOriginal = (fullscreenFavorite.value as Record<string, unknown>).originalContent
  if (typeof legacyOriginal === 'string' && legacyOriginal.trim().length > 0) {
    return legacyOriginal
  }

  return fullscreenFavorite.value.metadata?.originalContent ?? ''
})

const fullscreenDialogTitle = computed(() => {
  if (!fullscreenFavorite.value) {
    return t('favorites.manager.preview.title')
  }

  const title = fullscreenFavorite.value.title?.trim()
  const categoryName = fullscreenFavorite.value.category
    ? getCategoryById(fullscreenFavorite.value.category)?.name?.trim()
    : ''
  const updatedLabel = t('favorites.manager.preview.updatedAt', { time: formatDate(fullscreenFavorite.value.updatedAt) })

  return [
    title && title.length > 0 ? title : t('favorites.manager.preview.title'),
    categoryName && categoryName.length > 0 ? categoryName : null,
    updatedLabel,
  ].filter(Boolean).join(' · ')
})

const paneTitle = computed(() => {
  if (workspaceMode.value === 'edit') return t('favorites.dialog.editTitle')
  if (workspaceMode.value === 'create') return t('favorites.dialog.createTitle')
  if (workspaceMode.value === 'import') return t('favorites.manager.importDialog.title')
  return t('favorites.manager.preview.title')
})

const showPaneHeader = computed(() => workspaceMode.value !== 'detail')

const syncSelectionWithCurrentView = () => {
  if (!props.show) return

  if (currentPage.value > pageCount.value) {
    currentPage.value = pageCount.value
    return
  }

  if (filteredFavorites.value.length === 0) {
    if (workspaceMode.value === 'detail') {
      selectedFavorite.value = null
      if (isMobile.value) {
        mobileView.value = 'list'
      }
    }
    return
  }

  if (workspaceMode.value !== 'detail') {
    return
  }

  const selectedId = selectedFavorite.value?.id
  const selectedInFiltered = selectedId
    ? filteredFavorites.value.some((favorite) => favorite.id === selectedId)
    : false
  const selectedInPage = selectedId
    ? paginatedFavorites.value.some((favorite) => favorite.id === selectedId)
    : false

  if (isMobile.value) {
    if (!selectedInFiltered) {
      selectedFavorite.value = null
      mobileView.value = 'list'
      return
    }

    if (mobileView.value === 'panel' && !selectedInPage) {
      selectedFavorite.value = paginatedFavorites.value[0] || filteredFavorites.value[0] || null
    }
    return
  }

  if (selectedInPage) {
    selectedFavorite.value = paginatedFavorites.value.find((favorite) => favorite.id === selectedId) || selectedFavorite.value
    return
  }

  selectedFavorite.value = paginatedFavorites.value[0] || filteredFavorites.value[0] || null
}

watch(
  () => [paginatedFavorites.value, filteredFavorites.value.length, isMobile.value, props.show, workspaceMode.value],
  () => {
    syncSelectionWithCurrentView()
  },
  { deep: true },
)

watch(
  () => props.show,
  (show) => {
    if (!show) {
      mobileView.value = 'list'
      workspaceMode.value = 'detail'
      taskFavorite.value = null
      fullscreenFavorite.value = null
      return
    }

    if (!isMobile.value) {
      syncSelectionWithCurrentView()
    }
  },
  { immediate: true },
)

watch(
  () => props.show,
  async (show) => {
    if (!show || !services?.value?.favoriteManager) return

    await Promise.all([loadFavorites(), loadCategories()])
    if (!isMobile.value) {
      syncSelectionWithCurrentView()
    }
  },
  { immediate: false },
)

const getCategoryWithDescendants = (categoryId: string): string[] => {
  if (!categoryId) return []

  const result: string[] = [categoryId]
  const findChildren = (parentId: string) => {
    const children = categories.value.filter((category) => category.parentId === parentId)
    children.forEach((child) => {
      result.push(child.id)
      findChildren(child.id)
    })
  }

  findChildren(categoryId)
  return result
}

const buildErrorMessage = (summary: string, error: unknown) => {
  const fallback = t('common.error')
  const detail = getI18nErrorMessage(error, fallback)
  return detail === fallback ? summary : `${summary}: ${detail}`
}

const tryCopyToClipboard = async (text: string, successMessage: string) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    message.success(successMessage)
    return true
  } catch (error) {
    console.error('[FavoriteManager] Failed to copy favorite content:', error)
    message.error(t('favorites.manager.actions.copyFailed'))
    return false
  }
}

const openPanel = (mode: WorkspaceMode, favorite?: FavoritePrompt | null) => {
  workspaceMode.value = mode

  if (mode === 'detail') {
    taskFavorite.value = null
    if (favorite) {
      selectedFavorite.value = favorite
    }
  } else if (mode === 'edit') {
    taskFavorite.value = favorite || selectedFavorite.value
    if (favorite) {
      selectedFavorite.value = favorite
    }
  } else {
    taskFavorite.value = null
  }

  if (isMobile.value) {
    mobileView.value = mode === 'detail' && !selectedFavorite.value ? 'list' : 'panel'
  }
}

const handleCategoryUpdated = async () => {
  await loadCategories()
}

const handleCreateFavorite = () => {
  openPanel('create')
}

const openImportPanel = () => {
  openPanel('import')
}

const handleTaskCancel = () => {
  workspaceMode.value = 'detail'
  taskFavorite.value = null

  if (isMobile.value) {
    mobileView.value = selectedFavorite.value ? 'panel' : 'list'
  }
}

const handleEditorSaved = async (favoriteId: string) => {
  await loadFavorites()
  const updatedFavorite = favorites.value.find((favorite) => favorite.id === favoriteId) || null
  selectedFavorite.value = updatedFavorite
  workspaceMode.value = 'detail'
  taskFavorite.value = null

  if (isMobile.value) {
    mobileView.value = updatedFavorite ? 'panel' : 'list'
  }
}

const handleImportCompleted = async () => {
  await loadFavorites()
  if (!selectedFavorite.value && filteredFavorites.value.length > 0) {
    selectedFavorite.value = filteredFavorites.value[0]
  }

  workspaceMode.value = 'detail'
  taskFavorite.value = null

  if (isMobile.value) {
    mobileView.value = selectedFavorite.value ? 'panel' : 'list'
  }
}

const handleSelectFavorite = (favorite: FavoritePrompt) => {
  selectedFavorite.value = favorite
  openPanel('detail', favorite)
}

const handleBackToList = () => {
  mobileView.value = 'list'
}

const handleOpenFullscreenFavorite = (favorite: FavoritePrompt) => {
  fullscreenFavorite.value = favorite
}

const handleFullscreenCopy = (_content: string, type: 'content' | 'reasoning' | 'all') => {
  const successMessages = {
    content: t('favorites.manager.actions.copiedOptimized'),
    reasoning: t('favorites.manager.actions.copiedReasoning'),
    all: t('favorites.manager.actions.copiedAll'),
  } as const
  message.success(successMessages[type])
}

const handleFavoriteDetailUpdated = async (favoriteId: string) => {
  await loadFavorites()
  const updatedFavorite = favorites.value.find((favorite) => favorite.id === favoriteId) || null
  if (updatedFavorite) {
    selectedFavorite.value = updatedFavorite
    taskFavorite.value = workspaceMode.value === 'edit' ? updatedFavorite : taskFavorite.value
    if (fullscreenFavorite.value?.id === favoriteId) {
      fullscreenFavorite.value = updatedFavorite
    }
  }
}

const handleEditFavorite = (favorite: FavoritePrompt) => {
  openPanel('edit', favorite)
}

const bumpUseCountLocally = (id: string) => {
  const index = favorites.value.findIndex((favorite) => favorite.id === id)
  if (index !== -1) {
    const updated = {
      ...favorites.value[index],
      useCount: favorites.value[index].useCount + 1,
      updatedAt: Date.now(),
    }
    favorites.value.splice(index, 1, updated)

    if (selectedFavorite.value?.id === id) {
      selectedFavorite.value = updated
    }

    if (taskFavorite.value?.id === id) {
      taskFavorite.value = updated
    }

    if (fullscreenFavorite.value?.id === id) {
      fullscreenFavorite.value = updated
    }
  }
}

const loadFavorites = async () => {
  const servicesValue = services?.value
  if (!servicesValue?.favoriteManager) {
    console.warn(t('favorites.manager.messages.managerNotInitialized'))
    return
  }

  try {
    const data = await servicesValue.favoriteManager.getFavorites()
    favorites.value = data

    if (selectedFavorite.value) {
      selectedFavorite.value = data.find((item) => item.id === selectedFavorite.value?.id) || null
    }

    if (taskFavorite.value) {
      taskFavorite.value = data.find((item) => item.id === taskFavorite.value?.id) || null
    }

    if (fullscreenFavorite.value) {
      fullscreenFavorite.value = data.find((item) => item.id === fullscreenFavorite.value?.id) || null
    }
  } catch (error) {
    console.error('[FavoriteManager] Failed to load favorites:', error)
    message.error(buildErrorMessage(t('favorites.manager.messages.loadFailed'), error))
  }
}

const loadCategories = async () => {
  const servicesValue = services?.value
  if (!servicesValue?.favoriteManager) {
    console.warn(t('favorites.manager.messages.managerNotInitialized'))
    return
  }

  try {
    categories.value = await servicesValue.favoriteManager.getCategories()
  } catch (error) {
    console.error('[FavoriteManager] Failed to load categories:', error)
    message.error(buildErrorMessage(t('favorites.manager.messages.loadCategoryFailed'), error))
  }
}

const getCategoryById = (id?: string): FavoriteCategory | undefined => {
  if (!id) return undefined
  return categories.value.find((category) => category.id === id)
}

const handleFilterChange = () => {
  currentPage.value = 1
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleCopyFavorite = async (favorite: FavoritePrompt) => {
  const copied = await tryCopyToClipboard(favorite.content, t('favorites.manager.actions.copySuccess'))
  if (!copied) return

  const servicesValue = services?.value
  if (servicesValue?.favoriteManager) {
    await servicesValue.favoriteManager.incrementUseCount(favorite.id)
  }
  bumpUseCountLocally(favorite.id)
}

const handleDeleteFavorite = (favorite: FavoritePrompt) => {
  const confirmed = typeof window === 'undefined'
    ? true
    : window.confirm(t('favorites.manager.actions.deleteConfirm', { title: favorite.title }))

  if (!confirmed) return

  ;(async () => {
    try {
      const servicesValue = services?.value
      if (servicesValue?.favoriteManager) {
        await servicesValue.favoriteManager.deleteFavorite(favorite.id)
        message.success(t('favorites.manager.actions.deleteSuccess'))
        await loadFavorites()
      } else {
        message.warning(t('favorites.manager.messages.unavailable'))
      }
    } catch (error) {
      message.error(buildErrorMessage(t('favorites.manager.actions.deleteFailed'), error))
    }
  })()

  if (selectedFavorite.value?.id === favorite.id) {
    selectedFavorite.value = null
    if (workspaceMode.value === 'detail' && isMobile.value) {
      mobileView.value = 'list'
    }
  }

  if (taskFavorite.value?.id === favorite.id) {
    taskFavorite.value = null
    workspaceMode.value = 'detail'
  }

  if (fullscreenFavorite.value?.id === favorite.id) {
    fullscreenFavorite.value = null
  }
}

const handleUseFavorite = (favorite: FavoritePrompt) => {
  emit('use-favorite', favorite)

  const servicesValue = services?.value
  if (servicesValue?.favoriteManager) {
    servicesValue.favoriteManager.incrementUseCount(favorite.id).catch((error) => {
      console.error('[FavoriteManager] Failed to increment favorite usage count:', error)
    })
  }

  bumpUseCountLocally(favorite.id)
}

const handleActionMenuSelect = (key: string) => {
  switch (key) {
    case 'manageTags':
      tagManagerVisible.value = true
      break
    case 'manageCategories':
      categoryManagerVisible.value = true
      break
    case 'export':
      handleExportFavorites()
      break
    case 'clear': {
      const confirmed = typeof window === 'undefined'
        ? true
        : window.confirm(t('favorites.manager.actions.clearConfirm'))

      if (!confirmed) {
        break
      }

      ;(async () => {
        try {
          const servicesValue = services?.value
          if (servicesValue?.favoriteManager) {
            const allIds = favorites.value.map((favorite) => favorite.id)
            await servicesValue.favoriteManager.deleteFavorites(allIds)
            message.success(t('favorites.manager.actions.clearSuccess'))
            await loadFavorites()
          } else {
            message.warning(t('favorites.manager.messages.unavailable'))
          }
        } catch (error) {
          message.error(buildErrorMessage(t('favorites.manager.actions.clearFailed'), error))
        }
      })()
      break
    }
  }
}

const handleExportFavorites = async () => {
  try {
    const servicesValue = services?.value
    if (servicesValue?.favoriteManager) {
      const exportData = await servicesValue.favoriteManager.exportFavorites()
      if (exportData) {
        const blob = new Blob([exportData], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `favorites_${new Date().toISOString().split('T')[0]}.json`
        anchor.click()
        URL.revokeObjectURL(url)
        message.success(t('favorites.manager.actions.exportSuccess'))
      }
    } else {
      message.warning(t('favorites.manager.messages.unavailable'))
    }
  } catch (error) {
    message.error(buildErrorMessage(t('favorites.manager.actions.exportFailed'), error))
  }
}

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes <= 1 ? t('favorites.manager.time.justNow') : t('favorites.manager.time.minutesAgo', { minutes })
    }
    return t('favorites.manager.time.hoursAgo', { hours })
  }

  if (days === 1) {
    return t('favorites.manager.time.yesterday')
  }

  if (days < 7) {
    return t('favorites.manager.time.daysAgo', { days })
  }

  return date.toLocaleDateString()
}

const updateViewportWidth = () => {
  if (typeof window !== 'undefined') {
    viewportWidth.value = window.innerWidth
  }
}

const debouncedViewportUpdate = useDebounceFn(updateViewportWidth, 120)

onMounted(async () => {
  updateViewportWidth()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', debouncedViewportUpdate)
  }

  try {
    await ensureDefaultCategories()
  } catch (error) {
    console.warn('[FavoriteManager] Failed to ensure default categories:', error)
  }

  await Promise.all([loadFavorites(), loadCategories()])
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', debouncedViewportUpdate)
  }
})
</script>

<style scoped>
.favorites-manager-shell {
  display: flex;
  height: min(90vh, 920px);
  min-height: 620px;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
}

.favorites-manager-toolbar {
  flex: 0 0 auto;
}

.favorites-manager-toolbar-row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.favorites-manager-toolbar-row--search {
  align-items: stretch;
}

.favorites-manager-toolbar-row--controls {
  flex-wrap: wrap;
}

.favorites-manager-search {
  flex: 1;
}

.favorites-manager-count {
  min-width: max-content;
  padding-top: 10px;
}

.favorites-manager-filters {
  flex: 1;
}

.favorites-manager-tag-select {
  min-width: 220px;
}

.favorites-manager-actions {
  flex-shrink: 0;
}

.favorites-manager-workspace {
  display: grid;
  flex: 1;
  min-height: 0;
  grid-template-columns: 420px minmax(0, 1fr);
  gap: 16px;
}

.favorites-manager-workspace--mobile {
  display: block;
}

.favorites-manager-pane {
  min-height: 0;
}

.favorites-manager-pane--list,
.favorites-manager-pane--detail {
  height: 100%;
}

.favorites-manager-pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.favorites-manager-back {
  margin-right: auto;
}

.favorites-manager-scroll {
  height: 100%;
  min-height: 0;
}

.favorites-manager-list {
  min-height: 0;
}

.favorites-manager-task {
  height: 100%;
  min-height: 0;
}

.favorites-manager-empty {
  display: flex;
  height: 100%;
  min-height: 320px;
  align-items: center;
  justify-content: center;
}

.favorites-manager-pagination {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

@media (max-width: 1279px) {
  .favorites-manager-workspace {
    grid-template-columns: 360px minmax(0, 1fr);
  }
}

@media (max-width: 1023px) {
  .favorites-manager-shell {
    height: min(88vh, 960px);
    min-height: 540px;
    padding: 16px;
  }

  .favorites-manager-toolbar-row,
  .favorites-manager-pane-header {
    align-items: stretch;
    flex-direction: column;
  }

  .favorites-manager-count {
    padding-top: 0;
  }

  .favorites-manager-tag-select {
    min-width: 0;
  }
}
</style>
