<template>
  <n-modal
    :show="show"
    preset="card"
    :title="dialogTitle"
    :style="{ width: 'min(90vw, 1200px)' }"
    :mask-closable="false"
    @update:show="handleClose"
    content-style="padding: 0; display: flex; flex-direction: column; height: min(75vh, 800px); overflow: hidden;"
  >
    <div style="display: flex; flex-direction: column; gap: 16px; padding: 20px; height: 100%; overflow: hidden;">
      <!-- 基础信息面板（可滚动） -->
      <div style="flex: 0 0 auto; max-height: 350px; overflow-y: auto;">
        <n-card :title="t('favorites.dialog.basicInfo')" :bordered="false" :segmented="{ content: true }" size="small">
          <n-form label-placement="left" :label-width="80">
            <n-grid :cols="2" :x-gap="16">
              <!-- 左列 -->
              <n-grid-item>
                <n-form-item :label="t('favorites.dialog.titleLabel')" required>
                  <n-input
                    v-model:value="formData.title"
                    :placeholder="t('favorites.dialog.titlePlaceholder')"
                    maxlength="100"
                    show-count
                  />
                </n-form-item>

                <n-form-item :label="t('favorites.dialog.categoryLabel')">
                  <CategoryTreeSelect
                    v-model="formData.category"
                    :placeholder="t('favorites.dialog.categoryPlaceholder')"
                    :show-all-option="false"
                  />
                </n-form-item>

                <n-form-item :label="t('favorites.dialog.functionModeLabel')" required>
                  <n-select
                    v-model:value="formData.functionMode"
                    :options="functionModeOptions"
                    :disabled="props.mode === 'save' && !!props.originalContent"
                    @update:value="handleFunctionModeChange"
                  />
                </n-form-item>
              </n-grid-item>

              <!-- 右列 -->
              <n-grid-item>
                <n-form-item :label="t('favorites.dialog.descriptionLabel')">
                  <n-input
                    v-model:value="formData.description"
                    type="textarea"
                    :placeholder="t('favorites.dialog.descriptionPlaceholder')"
                    :rows="3"
                    maxlength="300"
                    show-count
                  />
                </n-form-item>

                <!-- 动态显示:优化模式或图像模式 -->
                <n-form-item
                  v-if="formData.functionMode === 'basic' || formData.functionMode === 'context'"
                  :label="t('favorites.dialog.optimizationModeLabel')"
                >
                  <n-select
                    v-model:value="formData.optimizationMode"
                    :options="optimizationModeOptions"
                    :placeholder="t('favorites.dialog.optimizationModePlaceholder')"
                    :disabled="props.mode === 'save' && !!props.originalContent"
                  />
                </n-form-item>

                <n-form-item
                  v-if="formData.functionMode === 'image'"
                  :label="t('favorites.dialog.imageModeLabel')"
                >
                  <n-select
                    v-model:value="formData.imageSubMode"
                    :options="imageSubModeOptions"
                    :placeholder="t('favorites.dialog.imageModePlaceholder')"
                    :disabled="props.mode === 'save' && !!props.originalContent"
                  />
                </n-form-item>
              </n-grid-item>
            </n-grid>

            <!-- 标签(跨越两列) -->
            <n-form-item :label="t('favorites.dialog.tagsLabel')">
              <div style="width: 100%;">
                <!-- 已选标签显示 -->
                <n-space v-if="formData.tags.length > 0" :size="[8, 8]" style="margin-bottom: 8px;">
                  <n-tag
                    v-for="(tag, index) in formData.tags"
                    :key="tag"
                    closable
                    @close="handleRemoveTag(index)"
                    type="info"
                  >
                    {{ tag }}
                  </n-tag>
                </n-space>

                <!-- 标签输入自动完成 -->
                <n-auto-complete
                  v-model:value="tagInputValue"
                  :options="tagSuggestions"
                  :placeholder="t('favorites.dialog.tagsPlaceholder')"
                  :get-show="() => tagInputValue.length > 0 || tagSuggestions.length > 0"
                  clearable
                  @select="handleSelectTag"
                  @keydown.enter="handleAddTag"
                />
              </div>
            </n-form-item>

            <n-form-item :label="t('favorites.dialog.imagesLabel')">
              <n-space vertical :size="8" style="width: 100%;">
                <n-upload
                  accept="image/*"
                  multiple
                  :default-upload="false"
                  :show-file-list="false"
                  :disabled="saving"
                  @before-upload="handleBeforeImageUpload"
                >
                  <n-upload-dragger>
                    <div style="padding: 12px; text-align: center;">
                      <n-space vertical :size="6" align="center">
                        <n-text depth="3">{{ t('favorites.dialog.imagesUploadHint') }}</n-text>
                        <n-text depth="3" style="font-size: 12px;">
                          {{ t('favorites.dialog.imagesUploadSupport') }}
                        </n-text>
                      </n-space>
                    </div>
                  </n-upload-dragger>
                </n-upload>

                <n-image-group v-if="mediaDraft.sources.length > 0">
                  <n-space :size="8" wrap>
                    <div
                      v-for="(source, index) in mediaDraft.sources"
                      :key="`${index}-${source.slice(0, 32)}`"
                      style="display: flex; flex-direction: column; gap: 6px;"
                    >
                      <n-image
                        :src="source"
                        width="88"
                        object-fit="cover"
                        :alt="t('favorites.dialog.imageAlt', { index: index + 1 })"
                      />
                      <n-space :size="4" align="center" justify="space-between">
                        <n-tag
                          v-if="mediaDraft.coverIndex === index"
                          size="small"
                          type="success"
                          :bordered="false"
                        >
                          {{ t('favorites.dialog.coverTag') }}
                        </n-tag>
                        <n-button
                          v-else
                          quaternary
                          size="tiny"
                          @click="handleSetCover(index)"
                        >
                          {{ t('favorites.dialog.setAsCover') }}
                        </n-button>
                        <n-button
                          quaternary
                          type="error"
                          size="tiny"
                          @click="handleRemoveImage(index)"
                        >
                          {{ t('favorites.dialog.removeImage') }}
                        </n-button>
                      </n-space>
                    </div>
                  </n-space>
                </n-image-group>

                <n-button
                  v-if="mediaDraft.sources.length > 0"
                  quaternary
                  size="small"
                  @click="handleClearImages"
                >
                  {{ t('favorites.dialog.clearImages') }}
                </n-button>
              </n-space>
            </n-form-item>
          </n-form>
        </n-card>
      </div>

      <!-- 正文内容区域（占据剩余空间） -->
      <div style="flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
        <n-divider style="margin: 0 0 12px 0; flex: 0 0 auto;">
          <span style="font-weight: 600;">{{ t('favorites.dialog.contentTitle') }}</span>
          <span style="color: #ff4d4f; margin-left: 4px;">*</span>
        </n-divider>
        <div style="flex: 1; min-height: 0; overflow: hidden;">
          <OutputDisplayCore
            :content="formData.content"
            mode="editable"
            :enabled-actions="['copy', 'edit']"
            height="100%"
            :placeholder="t('favorites.dialog.contentPlaceholder')"
            @update:content="formData.content = $event"
          />
        </div>
      </div>
    </div>

    <template #action>
      <n-space justify="end">
        <n-button @click="handleClose" :disabled="saving">{{ t('favorites.dialog.cancel') }}</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">
          {{ t('favorites.dialog.save') }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, inject, toRaw, type Ref } from 'vue'

import {
  NModal,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NAutoComplete,
  NTag,
  NButton,
  NSpace,
  NText,
  NDivider,
  NGrid,
  NGridItem,
  NUpload,
  NUploadDragger,
  NImage,
  NImageGroup,
  type UploadFileInfo,
} from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useToast } from '../composables/ui/useToast';
import { useTagSuggestions } from '../composables/ui/useTagSuggestions';
import OutputDisplayCore from './OutputDisplayCore.vue';
import CategoryTreeSelect from './CategoryTreeSelect.vue';
import type { AppServices } from '../types/services';
import type { FavoritePrompt } from '@prompt-optimizer/core';
import { buildFavoriteMediaMetadata, parseFavoriteMediaMetadata } from '../utils/favorite-media';
import {
  persistImageSourceAsAssetId,
  resolveAssetIdToDataUrl,
} from '../utils/image-asset-storage';

const { t } = useI18n();
const { filterTags, loadTags } = useTagSuggestions();

interface Props {
  /** 是否显示对话框 */
  show: boolean
  /** 对话框模式: 'create' 新建空白收藏, 'save' 从优化器保存, 'edit' 编辑现有收藏 */
  mode?: 'create' | 'save' | 'edit'
  /** 收藏内容(优化后的提示词) */
  content?: string
  /** 原始内容(用于从优化器保存时) */
  originalContent?: string
  /** 当前功能模式(用于从优化器保存时预填充) */
  currentFunctionMode?: 'basic' | 'context' | 'pro' | 'image'
  /** 当前优化模式(用于从优化器保存时预填充) */
  currentOptimizationMode?: 'system' | 'user'
  /** 可选的预填充数据（外部导入收藏确认场景） */
  prefill?: {
    title?: string
    description?: string
    category?: string
    tags?: string[]
    functionMode?: 'basic' | 'context' | 'image'
    optimizationMode?: 'system' | 'user'
    imageSubMode?: 'text2image' | 'image2image'
    metadata?: Record<string, unknown>
  }
  /** 要编辑的收藏(仅用于 edit 模式) */
  favorite?: FavoritePrompt
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'save',
  content: '',
  originalContent: undefined,
  currentFunctionMode: 'basic',
  currentOptimizationMode: 'system',
  prefill: undefined,
  favorite: undefined
});

const emit = defineEmits<{
  'update:show': [value: boolean]
  'saved': []
}>();

const services = inject<Ref<AppServices | null>>('services');
const message = useToast();

const saving = ref(false);
const mediaTouched = ref(false);

// 标签输入和建议
const tagInputValue = ref('');
const tagSuggestions = computed(() => {
  const suggestions = filterTags(tagInputValue.value, formData.tags);
  return suggestions.map(s => ({
    label: s.label,
    value: s.value
  }));
});

// 对话框标题
const dialogTitle = computed(() => {
  if (props.mode === 'create') return t('favorites.dialog.createTitle');
  if (props.mode === 'edit') return t('favorites.dialog.editTitle');
  return t('favorites.dialog.saveTitle');
});

// 表单数据
const formData = reactive({
  title: '',
  description: '',
  content: '',
  category: '',
  tags: [] as string[],
  functionMode: 'basic' as 'basic' | 'context' | 'image',
  optimizationMode: 'system' as 'system' | 'user' | undefined,
  imageSubMode: undefined as 'text2image' | 'image2image' | undefined
});

const mediaDraft = reactive({
  sources: [] as string[],
  coverIndex: -1,
});

const dedupeStrings = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const getPreferredStorageService = () => {
  return services?.value?.favoriteImageStorageService || services?.value?.imageStorageService || null;
};

const getReadStorageCandidates = () => {
  const favoriteStorage = services?.value?.favoriteImageStorageService || null;
  const legacyStorage = services?.value?.imageStorageService || null;

  if (favoriteStorage && legacyStorage && favoriteStorage !== legacyStorage) {
    return [favoriteStorage, legacyStorage];
  }

  if (favoriteStorage) return [favoriteStorage];
  if (legacyStorage) return [legacyStorage];
  return [];
};

const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });

const resolveAssetIdsToDataUrls = async (assetIds: string[]): Promise<string[]> => {
  const storageCandidates = getReadStorageCandidates();
  if (storageCandidates.length === 0 || assetIds.length === 0) return [];

  const resolved: string[] = [];
  for (const assetId of dedupeStrings(assetIds)) {
    for (const storageService of storageCandidates) {
      try {
        const dataUrl = await resolveAssetIdToDataUrl(assetId, storageService);
        if (dataUrl) {
          resolved.push(dataUrl);
          break;
        }
      } catch (error) {
        console.warn('[SaveFavoriteDialog] Failed to resolve asset id:', assetId, error);
      }
    }
  }

  return resolved;
};

const resetMediaDraft = () => {
  mediaDraft.sources = [];
  mediaDraft.coverIndex = -1;
};

const hydrateMediaDraftFromFavorite = async (favorite?: FavoritePrompt) => {
  resetMediaDraft();
  const media = parseFavoriteMediaMetadata(favorite);
  if (!media) return;

  const resolvedCover = media.coverAssetId
    ? (await resolveAssetIdsToDataUrls([media.coverAssetId]))[0]
    : undefined;
  const resolvedAssets = await resolveAssetIdsToDataUrls(media.assetIds);

  const sources = dedupeStrings([
    resolvedCover || media.coverUrl || '',
    ...resolvedAssets,
    ...media.urls,
  ]);

  mediaDraft.sources = sources;
  if (sources.length === 0) {
    mediaDraft.coverIndex = -1;
    return;
  }

  const coverSource = resolvedCover || media.coverUrl || '';
  mediaDraft.coverIndex = coverSource ? Math.max(0, sources.indexOf(coverSource)) : 0;
};

const hydrateMediaDraftFromMetadata = async (metadata?: Record<string, unknown>) => {
  resetMediaDraft();
  if (!metadata) return;

  const media = parseFavoriteMediaMetadata({ metadata } as FavoritePrompt);
  if (!media) return;

  const resolvedCover = media.coverAssetId
    ? (await resolveAssetIdsToDataUrls([media.coverAssetId]))[0]
    : undefined;
  const resolvedAssets = await resolveAssetIdsToDataUrls(media.assetIds);

  const sources = dedupeStrings([
    resolvedCover || media.coverUrl || '',
    ...resolvedAssets,
    ...media.urls,
  ]);

  mediaDraft.sources = sources;
  if (sources.length === 0) {
    mediaDraft.coverIndex = -1;
    return;
  }

  const coverSource = resolvedCover || media.coverUrl || '';
  mediaDraft.coverIndex = coverSource ? Math.max(0, sources.indexOf(coverSource)) : 0;
};

const resolvePrefillCategoryId = async (candidate?: string): Promise<string> => {
  const normalized = String(candidate || '').trim();
  if (!normalized) return '';

  const servicesValue = services?.value;
  if (!servicesValue?.favoriteManager) return '';

  try {
    const categories = await servicesValue.favoriteManager.getCategories();
    if (categories.some((category) => category.id === normalized)) {
      return normalized;
    }

    const lowered = normalized.toLowerCase();
    const matched = categories.find(
      (category) => String(category.name || '').trim().toLowerCase() === lowered,
    );
    return matched?.id || '';
  } catch (error) {
    console.warn('[SaveFavoriteDialog] Failed to resolve prefill category:', error);
    return '';
  }
};

const buildMediaMetadataForSave = async () => {
  const normalizedSources = dedupeStrings(
    mediaDraft.sources.map((item) => String(item || '').trim()).filter(Boolean),
  );

  if (normalizedSources.length === 0) return null;

  const preferredStorage = getPreferredStorageService();
  const assetIds: string[] = [];
  const fallbackUrls: string[] = [];
  const sourceToAssetId = new Map<string, string>();

  for (const source of normalizedSources) {
    if (!preferredStorage) {
      fallbackUrls.push(source);
      continue;
    }

    try {
      const assetId = await persistImageSourceAsAssetId({
        source,
        storageService: preferredStorage,
        sourceType: 'uploaded',
      });

      if (assetId) {
        assetIds.push(assetId);
        sourceToAssetId.set(source, assetId);
      } else {
        fallbackUrls.push(source);
      }
    } catch (error) {
      console.warn('[SaveFavoriteDialog] Failed to persist media source:', error);
      fallbackUrls.push(source);
    }
  }

  const coverSource =
    mediaDraft.coverIndex >= 0 && mediaDraft.coverIndex < normalizedSources.length
      ? normalizedSources[mediaDraft.coverIndex]
      : normalizedSources[0];

  const coverAssetId = coverSource ? sourceToAssetId.get(coverSource) : undefined;
  const coverUrl = coverSource && !coverAssetId ? coverSource : undefined;

  return buildFavoriteMediaMetadata({
    coverAssetId,
    coverUrl,
    assetIds,
    urls: fallbackUrls,
  });
};

const handleBeforeImageUpload = async (options: { file: UploadFileInfo }) => {
  const raw = (options.file as unknown as { file?: Blob | null }).file;
  if (!raw) return false;

  try {
    const dataUrl = await readBlobAsDataUrl(raw);
    if (dataUrl) {
      mediaDraft.sources = dedupeStrings([...mediaDraft.sources, dataUrl]);
      mediaTouched.value = true;
      if (mediaDraft.coverIndex < 0) {
        mediaDraft.coverIndex = 0;
      }
    }
  } catch (error) {
    console.error('[SaveFavoriteDialog] Failed to read selected image:', error);
    message.error(t('favorites.dialog.messages.imageReadFailed'));
  }

  return false;
};

const handleSetCover = (index: number) => {
  if (index < 0 || index >= mediaDraft.sources.length) return;
  mediaTouched.value = true;
  mediaDraft.coverIndex = index;
};

const handleRemoveImage = (index: number) => {
  if (index < 0 || index >= mediaDraft.sources.length) return;

  mediaTouched.value = true;

  mediaDraft.sources.splice(index, 1);
  if (mediaDraft.sources.length === 0) {
    mediaDraft.coverIndex = -1;
    return;
  }

  if (mediaDraft.coverIndex === index) {
    mediaDraft.coverIndex = 0;
  } else if (mediaDraft.coverIndex > index) {
    mediaDraft.coverIndex -= 1;
  }
};

const handleClearImages = () => {
  mediaTouched.value = true;
  resetMediaDraft();
};

// 选项配置
const functionModeOptions = computed(() => [
  { label: t('favorites.dialog.functionModes.basic'), value: 'basic' },
  { label: t('favorites.dialog.functionModes.context'), value: 'context' },
  { label: t('favorites.dialog.functionModes.image'), value: 'image' }
]);

const optimizationModeOptions = computed(() => {
  // 根据功能模式动态生成选项
  const isContextMode = formData.functionMode === 'context';

  return [
    {
      label: isContextMode
        ? t('contextMode.optimizationMode.message')
        : t('favorites.dialog.optimizationModes.system'),
      value: 'system'
    },
    {
      label: isContextMode
        ? t('contextMode.optimizationMode.variable')
        : t('favorites.dialog.optimizationModes.user'),
      value: 'user'
    }
  ];
});

const imageSubModeOptions = computed(() => [
  { label: t('favorites.dialog.imageModes.text2image'), value: 'text2image' },
  { label: t('favorites.dialog.imageModes.image2image'), value: 'image2image' }
]);

// 功能模式切换处理
const handleFunctionModeChange = (mode: 'basic' | 'context' | 'image') => {
  formData.functionMode = mode;

  if (mode === 'basic' || mode === 'context') {
    // 切换到 basic/context,设置默认优化模式,清空图像子模式
    formData.optimizationMode = formData.optimizationMode || 'system';
    formData.imageSubMode = undefined;
  } else if (mode === 'image') {
    // 切换到 image,设置默认图像子模式,清空优化模式
    formData.imageSubMode = formData.imageSubMode || 'text2image';
    formData.optimizationMode = undefined;
  }
};

// 标签管理函数
const handleRemoveTag = (index: number) => {
  formData.tags.splice(index, 1);
};

const handleSelectTag = (value: string) => {
  if (value && !formData.tags.includes(value) && formData.tags.length < 10) {
    formData.tags.push(value);
    tagInputValue.value = '';
  }
};

const handleAddTag = (e: KeyboardEvent) => {
  e.preventDefault();
  const trimmedValue = tagInputValue.value.trim();
  if (trimmedValue && !formData.tags.includes(trimmedValue) && formData.tags.length < 10) {
    formData.tags.push(trimmedValue);
    tagInputValue.value = '';
  }
};

// 关闭对话框
const handleClose = () => {
  emit('update:show', false);
};

// 保存收藏
const handleSave = async () => {
  const servicesValue = services?.value;
  if (!servicesValue?.favoriteManager) {
    message.warning(t('favorites.dialog.messages.unavailable'));
    return;
  }

  // 验证必填字段
  if (!formData.title.trim()) {
    message.warning(t('favorites.dialog.validation.titleRequired'));
    return;
  }

  if (!formData.content.trim()) {
    message.warning(t('favorites.dialog.validation.contentRequired'));
    return;
  }

  saving.value = true;
  try {
    // 【优化】保存收藏前，确保所有标签都存在于独立标签库中（仅对缺失项调用）
    const existingTags = new Set<string>(
      (await servicesValue.favoriteManager.getAllTags()).map(tagStat => tagStat.tag)
    );

    for (const tag of formData.tags) {
      if (existingTags.has(tag)) {
        continue;
      }

      try {
        await servicesValue.favoriteManager.addTag(tag);
        existingTags.add(tag);
      } catch (error) {
        // 只忽略"标签已存在"错误，其他错误需要抛出
        if (error && typeof error === 'object' && 'code' in error && error.code !== 'TAG_ALREADY_EXISTS') {
          console.error('添加标签到独立库失败:', error);
          throw error;
        }
        // 标签已存在，这是正常情况，继续处理
      }
    }

    const sanitizedTags = Array.from(toRaw(formData.tags || [])).map(tag => String(tag));

    const basePayload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      content: formData.content.trim(),
      category: formData.category,
      tags: sanitizedTags,
      functionMode: formData.functionMode,
      optimizationMode: formData.optimizationMode,
      imageSubMode: formData.imageSubMode
    };

    const existingMetadata =
      props.mode === 'edit' && props.favorite?.metadata && typeof props.favorite.metadata === 'object'
        ? { ...props.favorite.metadata }
        : props.mode === 'save' && props.prefill?.metadata && typeof props.prefill.metadata === 'object'
          ? { ...props.prefill.metadata }
        : {};

    const mediaMetadata = await buildMediaMetadataForSave();
    const prefillMedia =
      props.mode === 'save' && props.prefill?.metadata && typeof props.prefill.metadata === 'object'
        ? (props.prefill.metadata as Record<string, unknown>).media
        : undefined;

    if (mediaMetadata) {
      existingMetadata.media = mediaMetadata;
    } else if (
      props.mode === 'save' &&
      !mediaTouched.value &&
      prefillMedia &&
      typeof prefillMedia === 'object'
    ) {
      existingMetadata.media = { ...(prefillMedia as Record<string, unknown>) };
    } else {
      delete existingMetadata.media;
    }

    if (props.originalContent) {
      existingMetadata.originalContent = props.originalContent;
    }

    const metadata = Object.keys(existingMetadata).length > 0 ? existingMetadata : undefined;

    if (props.mode === 'edit' && props.favorite) {
      // 编辑模式：更新现有收藏
      await servicesValue.favoriteManager.updateFavorite(props.favorite.id, {
        ...basePayload,
        metadata,
      });
      message.success(t('favorites.dialog.messages.editSuccess'));
    } else {
      // 创建模式或保存模式：添加新收藏
      const favoriteData: {
        title: string;
        description: string;
        content: string;
        category: string;
        tags: string[];
        functionMode: 'basic' | 'context' | 'image';
        optimizationMode?: 'system' | 'user';
        imageSubMode?: 'text2image' | 'image2image';
        metadata?: Record<string, unknown>;
      } = {
        ...basePayload
      };

      favoriteData.metadata = metadata;

      await servicesValue.favoriteManager.addFavorite(favoriteData);
      message.success(t('favorites.dialog.messages.saveSuccess'));
    }

    emit('saved');
    emit('update:show', false);
  } catch (error) {
    const failedKey = props.mode === 'edit' ? 'favorites.dialog.messages.editFailed' : 'favorites.dialog.messages.saveFailed';
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    message.error(`${t(failedKey)}: ${errorMessage}`);
  } finally {
    saving.value = false;
  }
};

// 监听对话框显示,初始化表单
watch(() => props.show, async (newShow) => {
  if (newShow) {
    mediaTouched.value = false;

    // 加载标签建议
    await loadTags();

    if (props.mode === 'create') {
      // 新建模式: 重置为空表单
      formData.title = '';
      formData.description = '';
      formData.content = '';
      formData.category = '';
      formData.tags = [];
      formData.functionMode = 'basic';
      formData.optimizationMode = 'system';
      formData.imageSubMode = undefined;
      resetMediaDraft();
    } else if (props.mode === 'edit' && props.favorite) {
      // 编辑模式: 加载现有收藏数据
      formData.title = props.favorite.title;
      formData.description = props.favorite.description || '';
      formData.content = props.favorite.content;
      formData.category = props.favorite.category || '';
      formData.tags = [...(props.favorite.tags || [])];
      formData.functionMode = props.favorite.functionMode || 'basic';
      formData.optimizationMode = props.favorite.optimizationMode;
      formData.imageSubMode = props.favorite.imageSubMode;
      await hydrateMediaDraftFromFavorite(props.favorite);
    } else {
      // 保存模式: 智能预填充
      const prefill = props.prefill;

      // 1. 标题 = 原始提示词前30字符(去除换行符)
      const titleSource = (typeof prefill?.title === 'string' && prefill.title.trim()
        ? prefill.title
        : props.originalContent || props.content || '');
      formData.title = titleSource
        .replace(/\r?\n/g, ' ')  // 替换换行为空格
        .substring(0, 30)
        .trim();

      // 2. 内容 = 优化后的提示词
      formData.content = props.content || '';

      // 3. 说明 / 分类 / 标签 预填充
      formData.description = typeof prefill?.description === 'string' ? prefill.description : '';
      formData.category = await resolvePrefillCategoryId(
        typeof prefill?.category === 'string' ? prefill.category : '',
      );
      formData.tags = Array.isArray(prefill?.tags)
        ? dedupeStrings(prefill.tags.map((tag) => String(tag || '').trim()).filter(Boolean))
        : [];

      // 4. 根据预填充模式（优先）或当前模式自动设置
      if (prefill?.functionMode === 'image') {
        formData.functionMode = 'image';
        formData.imageSubMode =
          prefill.imageSubMode === 'image2image' ? 'image2image' : 'text2image';
        formData.optimizationMode = undefined;
      } else if (prefill?.functionMode === 'context' || prefill?.functionMode === 'basic') {
        formData.functionMode = prefill.functionMode;
        formData.optimizationMode = prefill.optimizationMode === 'user' ? 'user' : 'system';
        formData.imageSubMode = undefined;
      } else if (props.currentFunctionMode === 'image') {
        formData.functionMode = 'image';
        formData.imageSubMode = 'text2image';
        formData.optimizationMode = undefined;
      } else if (props.currentFunctionMode === 'context' || props.currentFunctionMode === 'pro') {
        formData.functionMode = 'context';
        formData.optimizationMode = props.currentOptimizationMode;
        formData.imageSubMode = undefined;
      } else {
        formData.functionMode = 'basic';
        formData.optimizationMode = props.currentOptimizationMode;
        formData.imageSubMode = undefined;
      }

      const prefillMetadata =
        prefill?.metadata && typeof prefill.metadata === 'object'
          ? (prefill.metadata as Record<string, unknown>)
          : undefined;
      await hydrateMediaDraftFromMetadata(prefillMetadata);
    }
  }
}, { immediate: true });
</script>
