<template>
  <ToastUI>
    <NModal
      :show="show"
      preset="card"
      :style="{ width: '90vw', maxWidth: '1200px', maxHeight: '90vh' }"
      title="收藏管理"
      size="large"
      :bordered="false"
      :segmented="true"
      @update:show="(value) => !value && close()"
    >
      <NScrollbar style="max-height: 75vh;">
        <div class="favorite-manager-content">
    <!-- 工具栏 -->
    <NSpace vertical :size="12" class="toolbar">
      <!-- 第一行：主要操作 -->
      <NSpace justify="space-between" align="center" :wrap="false">
        <!-- 左侧：视图切换和搜索 -->
        <NSpace :size="12" align="center" :wrap="false">
          <NButtonGroup size="small">
            <NButton
              :type="viewMode === 'grid' ? 'primary' : 'default'"
              @click="viewMode = 'grid'"
            >
              <template #icon>
                <NIcon><LayoutGrid /></NIcon>
              </template>
            </NButton>
            <NButton
              :type="viewMode === 'list' ? 'primary' : 'default'"
              @click="viewMode = 'list'"
            >
              <template #icon>
                <NIcon><List /></NIcon>
              </template>
            </NButton>
          </NButtonGroup>

          <NInput
            v-model:value="searchKeyword"
            placeholder="搜索收藏..."
            clearable
            style="min-width: 200px; max-width: 400px; flex: 1;"
            @update:value="handleSearch"
          >
            <template #prefix>
              <NIcon><Search /></NIcon>
            </template>
          </NInput>
        </NSpace>

        <!-- 右侧：操作按钮 -->
        <NSpace :size="8" align="center" :wrap="false">
          <NButton @click="handleOpenCategoryManager" secondary>
            <template #icon>
              <NIcon><Folder /></NIcon>
            </template>
            <span class="button-text">分类</span>
          </NButton>

          <NDropdown
            :options="actionMenuOptions"
            @select="handleActionMenuSelect"
          >
            <NButton secondary>
              <template #icon>
                <NIcon><DotsVertical /></NIcon>
              </template>
            </NButton>
          </NDropdown>

          <NButton @click="openImportDialog" secondary>
            <template #icon>
              <NIcon><Upload /></NIcon>
            </template>
            <span class="button-text">导入</span>
          </NButton>

          <NButton type="primary" @click="handleCreateFavorite">
            <template #icon>
              <NIcon><Plus /></NIcon>
            </template>
            <span class="button-text">添加</span>
          </NButton>
        </NSpace>
      </NSpace>

      <!-- 第二行：筛选器 -->
      <NSpace :size="12" align="center" :wrap="true">
        <NTreeSelect
          v-model:value="selectedCategory"
          :options="categoryTreeOptions"
          placeholder="全部分类"
          clearable
          consistent-menu-width
          style="min-width: 180px; max-width: 250px;"
          @update:value="handleFilterChange"
        />

        <NSelect
          v-model:value="selectedTags"
          :options="tagOptions"
          placeholder="全部标签"
          multiple
          clearable
          filterable
          max-tag-count="responsive"
          style="min-width: 180px; max-width: 300px;"
          @update:value="handleFilterChange"
        />

        <NText depth="3" style="font-size: 14px;">
          共 {{ filteredFavorites.length }} 项
        </NText>
      </NSpace>
    </NSpace>

    <!-- 收藏列表 -->
    <div class="content">
      <template v-if="filteredFavorites.length === 0">
        <n-empty
          :description="searchKeyword ? '没有找到匹配的收藏' : '还没有收藏任何提示词'"
          size="large"
        >
          <template #extra>
            <n-button @click="$emit('optimize-prompt')">
              开始优化提示词
            </n-button>
          </template>
        </n-empty>
      </template>

      <template v-else>
        <div v-if="viewMode === 'grid'" class="grid-view">
          <FavoriteCard
            v-for="favorite in paginatedFavorites"
            :key="favorite.id"
            :favorite="favorite"
            :category="getCategoryById(favorite.category)"
            @select="handlePreviewFavorite"
            @copy="handleCopyFavorite"
            @use="handleUseFavorite"
            @delete="handleDeleteFavorite"
            @edit="handleEditFavorite"
            @share="handleShareFavorite"
            @toggle-category="handleToggleCategory"
          />
        </div>

        <div v-else class="list-view">
          <NList hoverable clickable>
            <NListItem v-for="favorite in paginatedFavorites" :key="favorite.id">
              <template #prefix>
                <NSpace vertical :size="4" style="flex: 1; min-width: 0;">
                  <!-- 标题行 -->
                  <NSpace align="center" :size="8" :wrap="false">
                    <NEllipsis style="flex: 1; font-weight: 600; font-size: 15px;">
                      {{ favorite.title }}
                    </NEllipsis>
                    <NTag
                      v-if="getCategoryById(favorite.category)"
                      :color="{ color: getCategoryById(favorite.category)!.color, textColor: 'white' }"
                      size="small"
                    >
                      {{ getCategoryById(favorite.category)!.name }}
                    </NTag>
                  </NSpace>

                  <!-- 内容预览 -->
                  <NEllipsis :line-clamp="2" style="font-size: 14px;">
                    {{ favorite.content }}
                  </NEllipsis>

                  <!-- 描述 -->
                  <NEllipsis v-if="favorite.description" :line-clamp="1">
                    <NText depth="3" style="font-size: 12px;">
                      {{ favorite.description }}
                    </NText>
                  </NEllipsis>

                  <!-- 标签和元信息 -->
                  <NSpace justify="space-between" align="center" :wrap="false">
                    <NSpace :size="4" :wrap="true" v-if="favorite.tags.length > 0">
                      <NTag
                        v-for="tag in favorite.tags.slice(0, 3)"
                        :key="tag"
                        size="small"
                        type="info"
                      >
                        {{ tag }}
                      </NTag>
                      <NTag
                        v-if="favorite.tags.length > 3"
                        size="small"
                        type="default"
                      >
                        +{{ favorite.tags.length - 3 }}
                      </NTag>
                    </NSpace>

                    <NSpace :size="12" align="center">
                      <NText depth="3" style="font-size: 12px;">
                        {{ formatDate(favorite.updatedAt) }}
                      </NText>
                      <NSpace :size="4" align="center">
                        <NIcon size="14"><Eye /></NIcon>
                        <NText depth="3" style="font-size: 12px;">
                          {{ favorite.useCount }}
                        </NText>
                      </NSpace>
                    </NSpace>
                  </NSpace>
                </NSpace>
              </template>

              <template #suffix>
                <NSpace :size="4">
                  <NTooltip trigger="hover">
                    <template #trigger>
                      <NButton
                        size="small"
                        quaternary
                        circle
                        @click.stop="handleCopyFavorite(favorite)"
                      >
                        <template #icon>
                          <NIcon><Copy /></NIcon>
                        </template>
                      </NButton>
                    </template>
                    复制
                  </NTooltip>

                  <NTooltip trigger="hover">
                    <template #trigger>
                      <NButton
                        size="small"
                        quaternary
                        circle
                        @click.stop="handleUseFavorite(favorite)"
                      >
                        <template #icon>
                          <NIcon><PlayerPlay /></NIcon>
                        </template>
                      </NButton>
                    </template>
                    使用
                  </NTooltip>

                  <NTooltip trigger="hover">
                    <template #trigger>
                      <NButton
                        size="small"
                        quaternary
                        circle
                        @click.stop="handleEditFavorite(favorite)"
                      >
                        <template #icon>
                          <NIcon><Edit /></NIcon>
                        </template>
                      </NButton>
                    </template>
                    编辑
                  </NTooltip>

                  <NPopconfirm
                    @positive-click="handleDeleteFavorite(favorite)"
                    positive-text="删除"
                    negative-text="取消"
                  >
                    <template #trigger>
                      <NButton
                        size="small"
                        quaternary
                        circle
                        type="error"
                        @click.stop
                      >
                        <template #icon>
                          <NIcon><Trash /></NIcon>
                        </template>
                      </NButton>
                    </template>
                    确定删除"{{ favorite.title }}"吗？
                  </NPopconfirm>
                </NSpace>
              </template>
            </NListItem>
          </NList>
        </div>
      </template>
    </div>

    <!-- 分页 -->
    <NSpace v-if="totalPages > 1" justify="center" class="pagination">
      <NPagination
        v-model:page="currentPage"
        :page-count="totalPages"
        :page-size="pageSize"
        :item-count="filteredFavorites.length"
        show-size-picker
        :page-sizes="[12, 24, 48, 96]"
        show-quick-jumper
        :page-slot="7"
        @update:page-size="handlePageSizeChange"
      >
        <template #prefix="{ itemCount }">
          <NText depth="3">共 {{ itemCount }} 项</NText>
        </template>
      </NPagination>
    </NSpace>

    <!-- 收藏预览 -->
    <OutputDisplayFullscreen
      v-if="previewFavorite"
      v-model="previewVisible"
      :title="previewDialogTitle"
      :content="previewFavorite.content"
      :original-content="previewOriginalContent"
      :reasoning="previewFavorite.metadata?.reasoning || ''"
      mode="readonly"
      :enabled-actions="['copy', 'diff']"
      @copy="handlePreviewCopy"
    />

    <!-- 收藏导入 -->
    <n-modal
      v-model:show="importState.visible"
      preset="card"
      title="导入收藏"
      :style="{ width: 'min(520px, 90vw)' }"
    >
      <n-form label-placement="top">
        <n-form-item label="选择 JSON 文件">
          <n-upload
            :max="1"
            accept=".json,application/json"
            :default-upload="false"
            :file-list="importState.fileList"
            @change="handleImportFileChange"
          >
            <n-upload-dragger>
              <div style="padding: 16px; text-align: center;">
                <n-space vertical :size="8" align="center">
                  <n-icon size="32">
                    <Upload />
                  </n-icon>
                  <n-text depth="3">点击或拖拽文件到此区域</n-text>
                  <n-text depth="3" style="font-size: 12px;">支持 .json 文件</n-text>
                </n-space>
              </div>
            </n-upload-dragger>
          </n-upload>
        </n-form-item>
        <n-form-item label="或粘贴导出的收藏 JSON">
          <n-input
            v-model:value="importState.rawJson"
            type="textarea"
            placeholder="粘贴收藏数据..."
            :autosize="{ minRows: 4, maxRows: 10 }"
          />
        </n-form-item>
        <n-form-item label="合并策略">
          <n-radio-group v-model:value="importState.mergeStrategy">
            <n-radio-button value="skip">跳过重复</n-radio-button>
            <n-radio-button value="overwrite">覆盖重复</n-radio-button>
            <n-radio-button value="merge">创建副本</n-radio-button>
          </n-radio-group>
        </n-form-item>
      </n-form>
      <template #action>
        <n-space justify="end">
          <n-button @click="closeImportDialog" :disabled="importState.importing">取消</n-button>
          <n-button type="primary" :loading="importState.importing" @click="handleImportConfirm">
            导入
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 收藏编辑 -->
    <n-modal
      v-model:show="editState.visible"
      preset="card"
      title="编辑收藏"
      :style="{ width: 'min(90vw, 1200px)', height: 'min(85vh, 900px)' }"
      :mask-closable="false"
    >
      <n-scrollbar style="max-height: calc(85vh - 150px);">
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- 基础信息面板 -->
          <n-card title="📋 基础信息" :bordered="false" :segmented="{ content: true }" size="small">
            <n-form label-placement="left" :label-width="80">
              <n-grid :cols="2" :x-gap="16">
                <!-- 左列 -->
                <n-grid-item>
                  <n-form-item label="标题" required>
                    <n-input
                      v-model:value="editState.form.title"
                      placeholder="为这个提示词起个名字"
                      maxlength="100"
                      show-count
                    />
                  </n-form-item>

                  <n-form-item label="分类">
                    <n-select
                      v-model:value="editState.form.category"
                      :options="createCategoryOptions"
                      placeholder="选择分类（可选）"
                      clearable
                    />
                  </n-form-item>

                  <n-form-item label="功能模式" required>
                    <n-select
                      v-model:value="editState.form.functionMode"
                      :options="functionModeOptions"
                      @update:value="handleEditFunctionModeChange"
                    />
                  </n-form-item>
                </n-grid-item>

                <!-- 右列 -->
                <n-grid-item>
                  <n-form-item label="描述">
                    <n-input
                      v-model:value="editState.form.description"
                      type="textarea"
                      placeholder="描述这个提示词的用途和特点"
                      :rows="3"
                      maxlength="300"
                      show-count
                    />
                  </n-form-item>

                  <!-- 动态显示：优化模式或图像模式 -->
                  <n-form-item
                    v-if="editState.form.functionMode === 'basic' || editState.form.functionMode === 'context'"
                    label="优化模式"
                  >
                    <n-select
                      v-model:value="editState.form.optimizationMode"
                      :options="optimizationModeOptions"
                      placeholder="选择优化模式"
                    />
                  </n-form-item>

                  <n-form-item
                    v-if="editState.form.functionMode === 'image'"
                    label="图像模式"
                  >
                    <n-select
                      v-model:value="editState.form.imageSubMode"
                      :options="imageSubModeOptions"
                      placeholder="选择图像模式"
                    />
                  </n-form-item>
                </n-grid-item>
              </n-grid>

              <!-- 标签（跨越两列） -->
              <n-form-item label="标签">
                <n-dynamic-tags
                  v-model:value="editState.form.tags"
                  :max="10"
                  placeholder="输入标签后按回车添加"
                />
              </n-form-item>
            </n-form>
          </n-card>

          <!-- 正文内容区域 -->
          <div>
            <n-divider style="margin: 0 0 12px 0;">
              <span style="font-weight: 600;">📝 正文内容</span>
              <span style="color: #ff4d4f; margin-left: 4px;">*</span>
            </n-divider>
            <OutputDisplayCore
              :content="editState.form.content"
              mode="editable"
              :enabled-actions="['copy', 'edit']"
              height="400px"
              placeholder="在这里输入提示词内容..."
              @update:content="editState.form.content = $event"
            />
          </div>
        </div>
      </n-scrollbar>

      <template #action>
        <n-space justify="end">
          <n-button @click="closeEditDialog" :disabled="editState.editing">取消</n-button>
          <n-button type="primary" :loading="editState.editing" @click="handleEditConfirm">
            保存
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 分类管理 -->
    <n-modal
      :show="categoryManagerVisible"
      preset="card"
      title="分类管理"
      :mask-closable="true"
      :style="{ width: 'min(800px, 90vw)', height: 'min(600px, 80vh)' }"
      @update:show="categoryManagerVisible = $event"
    >
      <CategoryManager @category-updated="handleCategoryUpdated" />
    </n-modal>

    <!-- 新建收藏对话框 -->
    <n-modal
      v-model:show="createState.visible"
      preset="card"
      title="新建收藏"
      :style="{ width: 'min(90vw, 1200px)', height: 'min(85vh, 900px)' }"
      :mask-closable="false"
    >
      <n-scrollbar style="max-height: calc(85vh - 150px);">
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- 基础信息面板 -->
          <n-card title="📋 基础信息" :bordered="false" :segmented="{ content: true }" size="small">
            <n-form label-placement="left" :label-width="80">
              <n-grid :cols="2" :x-gap="16">
                <!-- 左列 -->
                <n-grid-item>
                  <n-form-item label="标题" required>
                    <n-input
                      v-model:value="createState.form.title"
                      placeholder="为这个提示词起个名字"
                      maxlength="100"
                      show-count
                    />
                  </n-form-item>

                  <n-form-item label="分类">
                    <n-select
                      v-model:value="createState.form.category"
                      :options="createCategoryOptions"
                      placeholder="选择分类（可选）"
                      clearable
                    />
                  </n-form-item>

                  <n-form-item label="功能模式" required>
                    <n-select
                      v-model:value="createState.form.functionMode"
                      :options="functionModeOptions"
                      @update:value="handleFunctionModeChange"
                    />
                  </n-form-item>
                </n-grid-item>

                <!-- 右列 -->
                <n-grid-item>
                  <n-form-item label="描述">
                    <n-input
                      v-model:value="createState.form.description"
                      type="textarea"
                      placeholder="描述这个提示词的用途和特点"
                      :rows="3"
                      maxlength="300"
                      show-count
                    />
                  </n-form-item>

                  <!-- 动态显示：优化模式或图像模式 -->
                  <n-form-item
                    v-if="createState.form.functionMode === 'basic' || createState.form.functionMode === 'context'"
                    label="优化模式"
                  >
                    <n-select
                      v-model:value="createState.form.optimizationMode"
                      :options="optimizationModeOptions"
                      placeholder="选择优化模式"
                    />
                  </n-form-item>

                  <n-form-item
                    v-if="createState.form.functionMode === 'image'"
                    label="图像模式"
                  >
                    <n-select
                      v-model:value="createState.form.imageSubMode"
                      :options="imageSubModeOptions"
                      placeholder="选择图像模式"
                    />
                  </n-form-item>
                </n-grid-item>
              </n-grid>

              <!-- 标签（跨越两列） -->
              <n-form-item label="标签">
                <n-dynamic-tags
                  v-model:value="createState.form.tags"
                  :max="10"
                  placeholder="输入标签后按回车添加"
                />
              </n-form-item>
            </n-form>
          </n-card>

          <!-- 正文内容区域 -->
          <div>
            <n-divider style="margin: 0 0 12px 0;">
              <span style="font-weight: 600;">📝 正文内容</span>
              <span style="color: #ff4d4f; margin-left: 4px;">*</span>
            </n-divider>
            <OutputDisplayCore
              :content="createState.form.content"
              mode="editable"
              :enabled-actions="['copy', 'edit']"
              height="400px"
              placeholder="在这里输入提示词内容..."
              @update:content="createState.form.content = $event"
            />
          </div>
        </div>
      </n-scrollbar>

      <template #action>
        <n-space justify="end">
          <n-button @click="closeCreateDialog" :disabled="createState.creating">取消</n-button>
          <n-button type="primary" :loading="createState.creating" @click="handleCreateConfirm">
            保存
          </n-button>
        </n-space>
      </template>
    </n-modal>
      </div>
    </NScrollbar>
  </NModal>
  </ToastUI>
</template>

<script setup lang="ts">
import { h, inject, onMounted, reactive, ref, watch, computed, type Ref } from 'vue';
import {
  NButton,
  NButtonGroup,
  NIcon,
  NTreeSelect,
  NSelect,
  NDynamicTags,
  NInput,
  NDropdown,
  NSpace,
  NEmpty,
  NList,
  NListItem,
  NPagination,
  NTag,
  NText,
  NModal,
  NForm,
  NFormItem,
  NRadioGroup,
  NRadioButton,
  NUpload,
  NUploadDragger,
  NCard,
  NDivider,
  NScrollbar,
  NTooltip,
  NPopconfirm,
  NEllipsis,
  type UploadFileInfo,
  type UploadChangeParam,
  type TreeSelectOption
} from 'naive-ui';
import { useToast } from '../composables/useToast';
import ToastUI from './Toast.vue';
import FavoriteCard from './FavoriteCard.vue';
import OutputDisplayFullscreen from './OutputDisplayFullscreen.vue';
import OutputDisplayCore from './OutputDisplayCore.vue';
import CategoryManager from './CategoryManager.vue';
import {
  LayoutGrid,
  List,
  Search,
  DotsVertical,
  Upload,
  Download,
  Trash,
  Copy,
  PlayerPlay,
  Eye,
  Edit,
  Folder,
  Plus
} from '@vicons/tabler';
import type { FavoritePrompt, FavoriteCategory } from '@prompt-optimizer/core';
import type { AppServices } from '../types/services';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits<{
  'optimize-prompt': [];
  'use-favorite': [favorite: FavoritePrompt];
  'update:show': [value: boolean];
  'close': [];
}>();

const close = () => {
  emit('update:show', false);
  emit('close');
};

const services = inject<Ref<AppServices | null> | null>('services', null);

const message = useToast();

// 响应式数据
const loading = ref(false);
const favorites = ref<FavoritePrompt[]>([]);
const categories = ref<FavoriteCategory[]>([]);
const viewMode = ref<'grid' | 'list'>('grid');
const pageSize = ref(24);
const currentPage = ref(1);
const searchKeyword = ref('');
const selectedCategory = ref<string>('');
const selectedTags = ref<string[]>([]);
const importState = reactive({
  visible: false,
  rawJson: '',
  mergeStrategy: 'skip' as 'skip' | 'overwrite' | 'merge',
  fileList: [] as UploadFileInfo[],
  importing: false
});
const editState = reactive({
  visible: false,
  editing: false,
  favorite: null as FavoritePrompt | null,
  form: {
    title: '',
    description: '',
    content: '',
    category: '',
    tags: [] as string[],
    functionMode: 'basic' as 'basic' | 'context' | 'image',
    optimizationMode: 'system' as 'system' | 'user' | undefined,
    imageSubMode: undefined as 'text2image' | 'image2image' | undefined
  }
});
const createState = reactive({
  visible: false,
  creating: false,
  form: {
    title: '',
    description: '',
    content: '',
    category: '',
    tags: [] as string[],
    functionMode: 'basic' as 'basic' | 'context' | 'image',
    optimizationMode: 'system' as 'system' | 'user' | undefined,
    imageSubMode: undefined as 'text2image' | 'image2image' | undefined
  }
});
const previewFavorite = ref<FavoritePrompt | null>(null);
const categoryManagerVisible = ref(false);

// 计算属性
const filteredFavorites = computed(() => {
  let result = favorites.value;

  // 分类过滤（支持树状结构，选中父分类包含所有子分类）
  if (selectedCategory.value) {
    const categoryIds = getCategoryWithDescendants(selectedCategory.value);
    result = result.filter(f => categoryIds.includes(f.category));
  }

  // 标签过滤（需要包含所有选中的标签）
  if (selectedTags.value.length > 0) {
    result = result.filter(f =>
      selectedTags.value.every(tag => f.tags.includes(tag))
    );
  }

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(f =>
      f.title.toLowerCase().includes(keyword) ||
      f.content.toLowerCase().includes(keyword) ||
      f.description?.toLowerCase().includes(keyword)
    );
  }

  return result;
});

const totalPages = computed(() => Math.ceil(filteredFavorites.value.length / pageSize.value));

const paginatedFavorites = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredFavorites.value.slice(start, end);
});

const categoryOptions = computed(() => {
  return [
    { label: '全部分类', value: '' },
    ...categories.value.map(cat => ({
      label: cat.name,
      value: cat.id
    }))
  ];
});

// 树状分类选项（用于 TreeSelect）
const categoryTreeOptions = computed<TreeSelectOption[]>(() => {
  const buildTree = (parentId?: string): TreeSelectOption[] => {
    return categories.value
      .filter(cat => cat.parentId === parentId)
      .map(cat => ({
        label: cat.name,
        key: cat.id,
        children: buildTree(cat.id)
      }));
  };

  return [
    { label: '全部分类', key: '' },
    ...buildTree(undefined)
  ];
});

// 获取分类及其所有子分类的ID列表
const getCategoryWithDescendants = (categoryId: string): string[] => {
  if (!categoryId) return [];

  const result: string[] = [categoryId];
  const findChildren = (parentId: string) => {
    const children = categories.value.filter(cat => cat.parentId === parentId);
    children.forEach(child => {
      result.push(child.id);
      findChildren(child.id);
    });
  };

  findChildren(categoryId);
  return result;
};

// 标签选项（从所有收藏中提取唯一标签）
const tagOptions = computed(() => {
  const allTags = new Set<string>();
  favorites.value.forEach(fav => {
    fav.tags.forEach(tag => allTags.add(tag));
  });
  return Array.from(allTags)
    .sort()
    .map(tag => ({
      label: tag,
      value: tag
    }));
});

// 新建收藏专用分类选项（不包含"全部分类"）
const createCategoryOptions = computed(() => {
  return categories.value.map(cat => ({
    label: cat.name,
    value: cat.id
  }));
});

// 功能模式选项
const functionModeOptions = [
  { label: '基础', value: 'basic' },
  { label: '上下文', value: 'context' },
  { label: '图像', value: 'image' }
];

// 优化模式选项（用于 basic/context）
const optimizationModeOptions = [
  { label: '系统提示词', value: 'system' },
  { label: '用户提示词', value: 'user' }
];

// 图像子模式选项（用于 image）
const imageSubModeOptions = [
  { label: '文生图', value: 'text2image' },
  { label: '图生图', value: 'image2image' }
];

const previewVisible = computed({
  get: () => previewFavorite.value !== null,
  set: (value: boolean) => {
    if (!value) {
      previewFavorite.value = null;
    }
  }
});

const previewOriginalContent = computed(() => {
  if (!previewFavorite.value) {
    return '';
  }

  const legacyOriginal = (previewFavorite.value as Record<string, unknown>).originalContent;
  if (typeof legacyOriginal === 'string' && legacyOriginal.trim().length > 0) {
    return legacyOriginal;
  }

  return previewFavorite.value.metadata?.originalContent ?? '';
});

const actionMenuOptions = [
  {
    label: '导出收藏',
    key: 'export',
    icon: () => h(NIcon, null, { default: () => h(Download) })
  },
  {
    type: 'divider'
  },
  {
    label: '清空收藏',
    key: 'clear',
    icon: () => h(NIcon, null, { default: () => h(Trash) })
  }
];

const resetImportState = () => {
  importState.rawJson = '';
  importState.mergeStrategy = 'skip';
  importState.fileList = [];
  importState.importing = false;
};

const openImportDialog = () => {
  importState.visible = true;
};

const closeImportDialog = () => {
  importState.visible = false;
};

const handleImportFileChange = (options: UploadChangeParam) => {
  importState.fileList = options.fileList.slice(0, 1);
};

const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });

const tryCopyToClipboard = async (text: string, successMessage: string) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    message.success(successMessage);
    return true;
  } catch (error) {
    console.error('复制失败:', error);
    message.error('复制失败');
    return false;
  }
};

const handleOpenCategoryManager = () => {
  categoryManagerVisible.value = true;
};

const handleCategoryUpdated = async () => {
  await loadCategories();
};

const handleCreateFavorite = () => {
  // 重置表单为默认值
  createState.form = {
    title: '',
    description: '',
    content: '',
    category: '',
    tags: [],
    functionMode: 'basic',
    optimizationMode: 'system',
    imageSubMode: undefined
  };
  createState.visible = true;
};

const closeCreateDialog = () => {
  createState.visible = false;
};

const resetCreateState = () => {
  createState.form = {
    title: '',
    description: '',
    content: '',
    category: '',
    tags: [],
    functionMode: 'basic',
    optimizationMode: 'system',
    imageSubMode: undefined
  };
  createState.creating = false;
};

// 功能模式切换处理（新建）
const handleFunctionModeChange = (mode: 'basic' | 'context' | 'image') => {
  createState.form.functionMode = mode;

  if (mode === 'basic' || mode === 'context') {
    // 切换到 basic/context，设置默认优化模式，清空图像子模式
    createState.form.optimizationMode = 'system';
    createState.form.imageSubMode = undefined;
  } else if (mode === 'image') {
    // 切换到 image，设置默认图像子模式，清空优化模式
    createState.form.imageSubMode = 'text2image';
    createState.form.optimizationMode = undefined;
  }
};

// 功能模式切换处理（编辑）
const handleEditFunctionModeChange = (mode: 'basic' | 'context' | 'image') => {
  editState.form.functionMode = mode;

  if (mode === 'basic' || mode === 'context') {
    // 切换到 basic/context，设置默认优化模式，清空图像子模式
    editState.form.optimizationMode = editState.form.optimizationMode || 'system';
    editState.form.imageSubMode = undefined;
  } else if (mode === 'image') {
    // 切换到 image，设置默认图像子模式，清空优化模式
    editState.form.imageSubMode = editState.form.imageSubMode || 'text2image';
    editState.form.optimizationMode = undefined;
  }
};

// 新建收藏的保存逻辑
const handleCreateConfirm = async () => {
  const servicesValue = services?.value;
  if (!servicesValue?.favoriteManager) {
    message.warning('收藏功能暂不可用，请稍后再试');
    return;
  }

  // 验证必填字段
  if (!createState.form.title.trim()) {
    message.warning('标题不能为空');
    return;
  }

  if (!createState.form.content.trim()) {
    message.warning('内容不能为空');
    return;
  }

  createState.creating = true;
  try {
    await servicesValue.favoriteManager.addFavorite({
      title: createState.form.title.trim(),
      description: createState.form.description.trim(),
      content: createState.form.content.trim(),
      category: createState.form.category,
      tags: createState.form.tags,
      functionMode: createState.form.functionMode,
      optimizationMode: createState.form.optimizationMode,
      imageSubMode: createState.form.imageSubMode,
      useCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    } as any);

    message.success('新建收藏成功');
    await loadFavorites();
    closeCreateDialog();
  } catch (error: any) {
    message.error(`新建失败: ${error?.message || '未知错误'}`);
  } finally {
    createState.creating = false;
  }
};

const handlePreviewFavorite = (favorite: FavoritePrompt) => {
  previewFavorite.value = favorite;
};

const handlePreviewCopy = (_content: string, type: 'content' | 'reasoning' | 'all') => {
  if (!previewFavorite.value) return;
  const successMessages = {
    content: '已复制优化后的提示词',
    reasoning: '已复制推理内容',
    all: '已复制内容'
  } as const;
  const messageKey = successMessages[type];
  if (messageKey) {
    message.success(messageKey);
  }
};

const handleImportConfirm = async () => {
  const servicesValue = services?.value;
  if (!servicesValue?.favoriteManager) {
    message.warning('收藏功能暂不可用，请稍后再试');
    return;
  }

  let payload = importState.rawJson.trim();
  if (!payload && importState.fileList.length > 0) {
    const file = importState.fileList[0].file;
    if (file) {
      try {
        payload = await readFileAsText(file);
      } catch (error: any) {
        message.error(`读取文件失败: ${error?.message || '未知错误'}`);
        return;
      }
    }
  }

  if (!payload) {
    message.warning('请先选择文件或粘贴导入数据');
    return;
  }

  importState.importing = true;
  try {
    const result = await servicesValue.favoriteManager.importFavorites(payload, {
      mergeStrategy: importState.mergeStrategy
    });
    message.success(`导入完成：成功 ${result.imported} 项，跳过 ${result.skipped} 项`);
    if (result.errors.length > 0) {
      message.warning(`部分收藏导入失败：\n${result.errors.join('\n')}`);
    }
    await loadFavorites();
    closeImportDialog();
  } catch (error: any) {
    message.error(`导入失败: ${error?.message || '未知错误'}`);
  } finally {
    importState.importing = false;
  }
};

const openEditDialog = (favorite: FavoritePrompt) => {
  editState.favorite = favorite;
  editState.form = {
    title: favorite.title,
    description: favorite.description || '',
    content: favorite.content,
    category: favorite.category,
    tags: [...favorite.tags],
    functionMode: favorite.functionMode || 'basic',
    optimizationMode: favorite.optimizationMode,
    imageSubMode: favorite.imageSubMode
  };
  editState.visible = true;
};

const closeEditDialog = () => {
  editState.visible = false;
  editState.favorite = null;
};

const resetEditState = () => {
  editState.form = {
    title: '',
    description: '',
    content: '',
    category: '',
    tags: [],
    functionMode: 'basic',
    optimizationMode: 'system',
    imageSubMode: undefined
  };
  editState.editing = false;
};

const handleEditFavorite = (favorite: FavoritePrompt) => {
  openEditDialog(favorite);
};

const handleEditConfirm = async () => {
  const servicesValue = services?.value;
  if (!servicesValue?.favoriteManager) {
    message.warning('收藏功能暂不可用，请稍后再试');
    return;
  }

  if (!editState.favorite) {
    message.error('编辑目标不存在');
    return;
  }

  if (!editState.form.title.trim()) {
    message.warning('标题不能为空');
    return;
  }

  if (!editState.form.content.trim()) {
    message.warning('内容不能为空');
    return;
  }

  editState.editing = true;
  try {
    await servicesValue.favoriteManager.updateFavorite(editState.favorite.id, {
      title: editState.form.title.trim(),
      description: editState.form.description.trim(),
      content: editState.form.content.trim(),
      category: editState.form.category,
      tags: editState.form.tags,
      functionMode: editState.form.functionMode,
      optimizationMode: editState.form.optimizationMode,
      imageSubMode: editState.form.imageSubMode
    });
    message.success('编辑成功');
    await loadFavorites();
    closeEditDialog();
  } catch (error: any) {
    message.error(`编辑失败: ${error?.message || '未知错误'}`);
  } finally {
    editState.editing = false;
  }
};

const handleShareFavorite = () => {
  message.info('分享功能即将上线');
};

const handleToggleCategory = () => {
  message.info('分类管理功能将在后续版本提供');
};

const bumpUseCountLocally = (id: string) => {
  const index = favorites.value.findIndex(f => f.id === id);
  if (index !== -1) {
    const updated = {
      ...favorites.value[index],
      useCount: favorites.value[index].useCount + 1,
      updatedAt: Date.now()
    };
    favorites.value.splice(index, 1, updated);
    if (previewFavorite.value?.id === id) {
      previewFavorite.value = { ...updated };
    }
  }
};

// 方法
const loadFavorites = async () => {
  const servicesValue = services?.value;
  if (!servicesValue) return;
  if (!servicesValue.favoriteManager) {
    console.warn('收藏管理器未初始化，跳过收藏加载');
    return;
  }

  try {
    loading.value = true;
    const data = await servicesValue.favoriteManager.getFavorites();
    favorites.value = data;
    if (previewFavorite.value) {
      const updated = data.find(item => item.id === previewFavorite.value?.id);
      previewFavorite.value = updated ? { ...updated } : null;
    }
  } catch (error: any) {
    console.error('加载收藏失败:', error);
    message.error(`加载收藏失败: ${error.message || '未知错误'}`);
  } finally {
    loading.value = false;
  }
};

const loadCategories = async () => {
  const servicesValue = services?.value;
  if (!servicesValue) return;
  if (!servicesValue.favoriteManager) {
    console.warn('收藏管理器未初始化，跳过分类加载');
    return;
  }

  try {
    categories.value = await servicesValue.favoriteManager.getCategories();
  } catch (error: any) {
    console.error('加载分类失败:', error);
    message.error(`加载分类失败: ${error.message || '未知错误'}`);
  }
};

const getCategoryById = (id: string): FavoriteCategory | undefined => {
  return categories.value.find(c => c.id === id);
};

const handleFilterChange = () => {
  currentPage.value = 1;
};

const handleSearch = () => {
  currentPage.value = 1;
};

const handleCopyFavorite = async (favorite: FavoritePrompt) => {
  const copied = await tryCopyToClipboard(favorite.content, '已复制到剪贴板');
  if (!copied) return;

  const servicesValue = services?.value;
  if (servicesValue?.favoriteManager) {
    await servicesValue.favoriteManager.incrementUseCount(favorite.id);
  }
  bumpUseCountLocally(favorite.id);
};

const handleDeleteFavorite = (favorite: FavoritePrompt) => {
  const confirmed = typeof window === 'undefined'
    ? true
    : window.confirm(`确定要删除收藏 "${favorite.title}" 吗？此操作不可恢复。`);

  if (!confirmed) return;

  (async () => {
    try {
      const servicesValue = services?.value;
      if (servicesValue?.favoriteManager) {
        await servicesValue.favoriteManager.deleteFavorite(favorite.id);
        message.success('删除成功');
        await loadFavorites();
      } else {
        message.warning('收藏功能暂不可用，请稍后再试');
      }
    } catch (error: any) {
      message.error(`删除失败: ${error.message || '未知错误'}`);
    }
  })();
  if (previewFavorite.value?.id === favorite.id) {
    previewFavorite.value = null;
  }
};

const handleUseFavorite = (favorite: FavoritePrompt) => {
  emit('use-favorite', favorite);

  // 增加使用次数
  const servicesValue = services?.value;
  if (servicesValue?.favoriteManager) {
    servicesValue.favoriteManager.incrementUseCount(favorite.id).catch(console.error);
  }
  bumpUseCountLocally(favorite.id);
  if (previewFavorite.value?.id === favorite.id) {
    previewFavorite.value = null;
  }
};

const handlePageSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
};

const handleActionMenuSelect = (key: string) => {
  switch (key) {
    case 'export':
      handleExportFavorites();
      break;
    case 'clear': {
      const confirmed = typeof window === 'undefined'
        ? true
        : window.confirm('确定要清空所有收藏吗？此操作不可恢复。');

      if (!confirmed) {
        break;
      }

      (async () => {
        try {
          const servicesValue = services?.value;
          if (servicesValue?.favoriteManager) {
            const allIds = favorites.value.map(f => f.id);
            await servicesValue.favoriteManager.deleteFavorites(allIds);
            message.success('清空成功');
            await loadFavorites();
          } else {
            message.warning('收藏功能暂不可用，请稍后再试');
          }
        } catch (error: any) {
          message.error(`清空失败: ${error.message || '未知错误'}`);
        }
      })();
      break;
    }
  }
};

const handleExportFavorites = async () => {
  try {
    const servicesValue = services?.value;
    if (servicesValue?.favoriteManager) {
      const exportData = await servicesValue.favoriteManager.exportFavorites();
      if (exportData) {
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `favorites_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('导出成功');
      }
    } else {
      message.warning('收藏功能暂不可用，请稍后再试');
    }
  } catch (error: any) {
    message.error(`导出失败: ${error.message || '未知错误'}`);
  }
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? '刚刚' : `${minutes}分钟前`;
    }
    return `${hours}小时前`;
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return date.toLocaleDateString();
  }
};

const previewDialogTitle = computed(() => {
  if (!previewFavorite.value) {
    return '收藏详情';
  }

  const title = previewFavorite.value.title?.trim();
  const categoryName = previewFavorite.value.category
    ? getCategoryById(previewFavorite.value.category)?.name?.trim()
    : '';
  const updatedLabel = `更新于 ${formatDate(previewFavorite.value.updatedAt)}`;

  const parts = [
    title && title.length > 0 ? title : '收藏详情',
    categoryName && categoryName.length > 0 ? categoryName : null,
    updatedLabel
  ].filter(Boolean) as string[];

  return parts.join(' · ');
});

// 监听服务初始化完成后再加载数据
watch(() => services?.value?.favoriteManager, (favoriteManager) => {
  if (favoriteManager) {
    loadFavorites();
    loadCategories();
  }
}, { immediate: true });

// 🆕 监听收藏夹对话框打开事件，自动刷新数据
watch(() => props.show, (newShow) => {
  if (newShow && services?.value?.favoriteManager) {
    loadFavorites();
    loadCategories();
  }
}, { immediate: false });

watch(() => importState.visible, (visible) => {
  if (!visible) {
    resetImportState();
  }
});

watch(() => editState.visible, (visible) => {
  if (!visible) {
    resetEditState();
  }
});

watch(() => createState.visible, (visible) => {
  if (!visible) {
    resetCreateState();
  }
});

onMounted(() => {
  if (services?.value?.favoriteManager) {
    loadFavorites();
    loadCategories();
  }
});

defineExpose({
  reloadCategories: loadCategories
});
</script>

<style scoped>
.favorite-manager-content {
  @apply flex flex-col h-full;
}

.toolbar {
  @apply p-4 border-b border-gray-200 dark:border-gray-700;
}

.button-text {
  @apply ml-1;
}

/* 小屏幕优化：隐藏按钮文字 */
@media (max-width: 768px) {
  .button-text {
    @apply hidden;
  }
}

.content {
  @apply flex-1 p-4 overflow-y-auto;
}

/* 网格视图：使用 CSS Grid 响应式布局 */
.grid-view {
  @apply min-h-full;
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

/* 响应式断点优化 */
@media (max-width: 640px) {
  .grid-view {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .grid-view {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 18px;
  }
}

@media (min-width: 1441px) {
  .grid-view {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 24px;
  }
}

.list-view {
  @apply min-h-full;
}

.pagination {
  @apply p-4 border-t border-gray-200 dark:border-gray-700;
}
</style>
