<template>
  <!-- 使用NFlex实现水平左右布局，参考App.vue的实现 -->
  <NFlex
    justify="space-between"
    :style="{
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      height: '100%',
      gap: '16px',
      overflow: 'hidden'
    }"
  >
    <!-- 左侧：提示词优化区域（文本模型） -->
    <NFlex vertical :style="{ flex: 1, overflow: 'auto', height: '100%' }" size="medium">
      <!-- 输入控制区域 - 对齐InputPanel布局 -->
      <NCard :style="{ flexShrink: 0 }">
        <NSpace vertical :size="16">
          <!-- 标题区域 -->
          <NFlex justify="space-between" align="center" :wrap="false">
            <NText :depth="1" style="font-size: 18px; font-weight: 500;">{{ t('imageWorkspace.input.originalPrompt') }}</NText>
            <NFlex align="center" :size="12">
              <!-- 图像模式选择器 -->
              <ImageModeSelector
                v-model="imageMode"
                :disabled="isOptimizing"
                @change="handleImageModeChange"
              />
              <NButton
                type="tertiary"
                size="small"
                @click="openFullscreen"
                :title="t('common.expand')"
                ghost
                round
              >
                <template #icon>
                  <NIcon>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </NIcon>
                </template>
              </NButton>
            </NFlex>
          </NFlex>

          <!-- 输入框 -->
          <NInput
            v-model:value="originalPrompt"
            type="textarea"
            :placeholder="t('imageWorkspace.input.originalPromptPlaceholder')"
            :rows="4"
            :autosize="{ minRows: 4, maxRows: 12 }"
            :maxlength="2000"
            clearable
            show-count
            :disabled="isOptimizing"
          />

          <!-- 图片上传区域 - 仅在图生图模式显示 -->
          <NSpace v-if="imageMode === 'image2image'" vertical :size="8">
            <NText :depth="2" style="font-size: 14px; font-weight: 500;">{{ t('imageWorkspace.input.image') }}</NText>
            <NFlex align="center" size="small" :style="{ flex: 1, gap: '8px' }">
              <NButton
                :disabled="isOptimizing"
                @click="openUploadModal"
                size="medium"
              >
                {{ t('imageWorkspace.input.selectImage') }}
              </NButton>

              <!-- 缩略图显示区域 -->
              <div v-if="previewImageUrl" class="thumbnail-container">
                <NImage
                  :src="previewImageUrl"
                  :style="{
                    width: '60px',
                    height: '60px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    objectFit: 'cover',
                    border: '1px solid #e0e0e6'
                  }"
                />
              </div>

              <!-- 删除按钮 -->
              <NButton
                v-if="previewImageUrl"
                @click="clearUploadedImage"
                :disabled="isOptimizing"
                size="medium"
                type="error"
                secondary
              >
                ❌
              </NButton>
            </NFlex>
          </NSpace>

          <!-- 控制面板 - 使用网格布局 -->
          <NGrid :cols="24" :x-gap="12" responsive="screen">
            <!-- 优化模板选择 -->
            <NGridItem :span="12" :xs="24" :sm="12">
              <NSpace vertical :size="8">
                <NText :depth="2" style="font-size: 14px; font-weight: 500;">{{ t('imageWorkspace.input.optimizeTemplate') }}</NText>
                <template v-if="services && services.templateManager">
                  <SelectWithConfig
                    v-model="selectedTemplateIdForSelect"
                    :options="templateOptions as any"
                    :getPrimary="OptionAccessors.getPrimary"
                    :getSecondary="OptionAccessors.getSecondary"
                    :getValue="OptionAccessors.getValue"
                    :placeholder="t('imageWorkspace.input.templatePlaceholder')"
                    size="medium"
                    :disabled="isOptimizing"
                    filterable
                    :show-config-action="true"
                    :show-empty-config-c-t-a="true"
                    @focus="handleTemplateSelectFocus"
                    @update:modelValue="saveSelections"
                    @config="() => appOpenTemplateManager && appOpenTemplateManager(templateType as any)"
                  />
                </template>
                <NText v-else depth="3" style="padding: 0; font-size: 14px;">
                  {{ t('common.loading') }}
                </NText>
              </NSpace>
            </NGridItem>

            <!-- 文本模型选择 -->
            <NGridItem :span="8" :xs="24" :sm="8">
              <NSpace vertical :size="8">
                <NText :depth="2" style="font-size: 14px; font-weight: 500;">{{ t('imageWorkspace.input.textModel') }}</NText>
                <template v-if="appOpenModelManager">
                  <SelectWithConfig
                    v-model="selectedTextModelKey"
                    :options="textModelOptions as any"
                    :getPrimary="OptionAccessors.getPrimary"
                    :getSecondary="OptionAccessors.getSecondary"
                    :getValue="OptionAccessors.getValue"
                    :placeholder="t('imageWorkspace.input.modelPlaceholder')"
                    size="medium"
                    :disabled="isOptimizing"
                    filterable
                    :show-config-action="true"
                    :show-empty-config-c-t-a="true"
                    @focus="handleTextModelSelectFocus"
                    @update:modelValue="saveSelections"
                    @config="() => appOpenModelManager && appOpenModelManager('text')"
                  />
                </template>
                <template v-else>
                  <SelectWithConfig
                    v-model="selectedTextModelKey"
                    :options="textModelOptions as any"
                    :getPrimary="OptionAccessors.getPrimary"
                    :getSecondary="OptionAccessors.getSecondary"
                    :getValue="OptionAccessors.getValue"
                    :placeholder="t('imageWorkspace.input.modelPlaceholder')"
                    size="medium"
                    :disabled="isOptimizing"
                    filterable
                    @focus="handleTextModelSelectFocus"
                    @update:modelValue="saveSelections"
                  />
                </template>
              </NSpace>
            </NGridItem>

            <!-- 优化按钮 -->
            <NGridItem :span="4" :xs="24" :sm="4">
              <NSpace vertical :size="8" align="end">
                <NButton
                  type="primary"
                  size="medium"
                  :loading="isOptimizing"
                  @click="handleOptimizePrompt"
                  :disabled="!originalPrompt.trim() || !selectedTextModelKey || !selectedTemplate"
                  block
                  round
                >
                  {{ isOptimizing ? t('imageWorkspace.input.optimizing') : t('imageWorkspace.input.optimizePrompt') }}
                </NButton>
              </NSpace>
            </NGridItem>
          </NGrid>
        </NSpace>
      </NCard>

      <!-- 优化结果区域 - 使用与基础模式一致的卡片容器 -->
      <NCard :style="{ flex: 1, minHeight: '200px', overflow: 'hidden' }"
             content-style="height: 100%; max-height: 100%; overflow: hidden;">
        <PromptPanelUI
          v-if="services && services.templateManager"
          ref="promptPanelRef"
          v-model:optimized-prompt="optimizedPrompt"
          :reasoning="optimizedReasoning"
          :original-prompt="originalPrompt"
          :is-optimizing="isOptimizing"
          :is-iterating="isIterating"
          v-model:selected-iterate-template="selectedIterateTemplate"
          :versions="currentVersions"
          :current-version-id="currentVersionId"
          :optimization-mode="optimizationMode"
          :services="services"
          :advanced-mode-enabled="advancedModeEnabled"
          iterate-template-type="imageIterate"
          @iterate="handleIteratePrompt"
          @openTemplateManager="onOpenTemplateManager"
          @switchVersion="handleSwitchVersion"
        />
      </NCard>
    </NFlex>

    <!-- 右侧：图像生成测试区域（图像模型） -->
    <NCard
      :style="{
        flex: 1,
        overflow: 'auto',
        height: '100%'
      }"
      content-style="height: 100%; max-height: 100%; overflow: hidden;"
    >
      <NFlex vertical :style="{ height: '100%' }">
        <!-- 测试控制栏 -->
        <div :style="{ flexShrink: 0 }">
          <n-form label-placement="left" size="medium">
            <n-form-item :label="t('imageWorkspace.generation.imageModel')">
              <n-space align="center" :size="12">
                <template v-if="appOpenModelManager">
                  <SelectWithConfig
                    v-model="selectedImageModelKey"
                    :options="imageModelOptions as any"
                    :getPrimary="OptionAccessors.getPrimary"
                    :getSecondary="OptionAccessors.getSecondary"
                    :getValue="OptionAccessors.getValue"
                    :placeholder="t('imageWorkspace.generation.imageModelPlaceholder')"
                    style="min-width: 200px; max-width: 100%;"
                    :disabled="isGenerating"
                    filterable
                    @update:modelValue="saveSelections"
                    @config="() => appOpenModelManager && appOpenModelManager('image')"
                    :show-config-action="true"
                    :show-empty-config-c-t-a="true"
                  />
                </template>
                <template v-else>
                  <SelectWithConfig
                    v-model="selectedImageModelKey"
                    :options="imageModelOptions as any"
                    :getPrimary="OptionAccessors.getPrimary"
                    :getSecondary="OptionAccessors.getSecondary"
                    :getValue="OptionAccessors.getValue"
                    :placeholder="t('imageWorkspace.generation.imageModelPlaceholder')"
                    style="min-width: 200px; max-width: 100%;"
                    :disabled="isGenerating"
                    filterable
                    @update:modelValue="saveSelections"
                  />
                </template>
                <!-- 当前选中模型的Provider、Model和能力标签 -->
                <n-space v-if="selectedImageModelInfo || selectedImageModelCapabilities" :size="6" :wrap="true">
                  <!-- Provider和Model标签 -->
                  <template v-if="selectedImageModelInfo">
                    <n-tag size="small" type="info" :bordered="false">
                      {{ selectedImageModelInfo.provider }}
                    </n-tag>
                    <n-tag size="small" type="primary" :bordered="false">
                      {{ selectedImageModelInfo.model }}
                    </n-tag>
                  </template>
                  <!-- 能力标签 -->
                  <template v-if="selectedImageModelCapabilities">
                    <n-tag v-if="selectedImageModelCapabilities.text2image" size="small" type="success" :bordered="false">
                      {{ t('image.capability.text2image') }}
                    </n-tag>
                    <n-tag v-if="selectedImageModelCapabilities.image2image" size="small" type="info" :bordered="false">
                      {{ t('image.capability.image2image') }}
                    </n-tag>
                    <n-tag v-if="selectedImageModelCapabilities.highResolution" size="small" type="primary" :bordered="false">
                      {{ t('image.capability.highResolution') }}
                    </n-tag>
                  </template>
                </n-space>
              </n-space>
            </n-form-item>
            <n-form-item>
              <n-space align="center" wrap>
                <n-switch
                  v-model:value="isCompareMode"
                  :disabled="isGenerating"
                  @update:value="saveSelections"
                />
                <n-text depth="3">{{ t('imageWorkspace.generation.compareMode') }}</n-text>
                <n-button
                  type="primary"
                  :loading="isGenerating"
                  @click="handleGenerateImage"
                  :disabled="!currentPrompt.trim() || !selectedImageModelKey"
                >
                  {{ isGenerating ? t('imageWorkspace.generation.generating') : t('imageWorkspace.generation.generateImage') }}
                </n-button>
              </n-space>
            </n-form-item>
          </n-form>
        </div>

        <!-- 图像结果展示区域（使用统一的 TestResultSection 布局） -->
        <TestResultSection
          :is-compare-mode="isCompareMode"
          :style="{ flex: 1, minHeight: 0 }"
          :original-title="t('imageWorkspace.results.originalPromptResult')"
          :optimized-title="t('imageWorkspace.results.optimizedPromptResult')"
          :single-result-title="t('imageWorkspace.results.optimizedPromptResult')"
        >
          <template #original-result>
            <template v-if="originalImageResult && originalImageResult.images.length > 0">
              <!-- 多模态结果显示：图像 + 文本（使用Naive UI组件） -->
              <NSpace vertical :size="12">
                <!-- 图像显示 -->
                <NImage
                  :src="getImageSrc(originalImageResult.images[0])"
                  object-fit="contain"
                  :img-props="{ style: { width: '100%', height: 'auto', display: 'block' } }"
                />

                <!-- 文本输出显示（如果存在） -->
                <template v-if="originalImageResult.text">
                  <NCard size="small" :title="t('imageWorkspace.results.textOutput')" style="margin-top: 8px;">
                    <NText :depth="2" style="white-space: pre-wrap; line-height: 1.5;">
                      {{ originalImageResult.text }}
                    </NText>
                  </NCard>
                </template>

                <!-- 操作按钮 -->
                <NSpace justify="center" :size="8">
                  <NButton size="small" @click="downloadImageFromResult(originalImageResult.images[0], 'original')">
                    <template #icon>
                      <NIcon>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                      </NIcon>
                    </template>
                    {{ t('imageWorkspace.results.download') }}
                  </NButton>

                  <NButton v-if="originalImageResult.text" size="small" secondary @click="copyImageText(originalImageResult.text)">
                    <template #icon>
                      <NIcon>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                      </NIcon>
                    </template>
                    {{ t('imageWorkspace.results.copyText') }}
                  </NButton>
                </NSpace>
              </NSpace>
            </template>
            <template v-else>
              <NEmpty :description="t('imageWorkspace.results.noOriginalResult')" />
            </template>
          </template>

          <template #optimized-result>
            <template v-if="optimizedImageResult && optimizedImageResult.images.length > 0">
              <!-- 多模态结果显示：图像 + 文本（使用Naive UI组件） -->
              <NSpace vertical :size="12">
                <!-- 图像显示 -->
                <NImage
                  :src="getImageSrc(optimizedImageResult.images[0])"
                  object-fit="contain"
                  :img-props="{ style: { width: '100%', height: 'auto', display: 'block' } }"
                />

                <!-- 文本输出显示（如果存在） -->
                <template v-if="optimizedImageResult.text">
                  <NCard size="small" :title="t('imageWorkspace.results.textOutput')" style="margin-top: 8px;">
                    <NText :depth="2" style="white-space: pre-wrap; line-height: 1.5;">
                      {{ optimizedImageResult.text }}
                    </NText>
                  </NCard>
                </template>

                <!-- 操作按钮 -->
                <NSpace justify="center" :size="8">
                  <NButton size="small" @click="downloadImageFromResult(optimizedImageResult.images[0], 'optimized')">
                    <template #icon>
                      <NIcon>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                      </NIcon>
                    </template>
                    {{ t('imageWorkspace.results.download') }}
                  </NButton>

                  <NButton v-if="optimizedImageResult.text" size="small" secondary @click="copyImageText(optimizedImageResult.text)">
                    <template #icon>
                      <NIcon>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                      </NIcon>
                    </template>
                    {{ t('imageWorkspace.results.copyText') }}
                  </NButton>
                </NSpace>
              </NSpace>
            </template>
            <template v-else>
              <NEmpty :description="t('imageWorkspace.results.noOptimizedResult')" />
            </template>
          </template>

          <template #single-result>
            <template v-if="optimizedImageResult && optimizedImageResult.images.length > 0">
              <!-- 多模态结果显示：图像 + 文本（使用Naive UI组件） -->
              <NSpace vertical :size="12">
                <!-- 图像显示 -->
                <NImage
                  :src="getImageSrc(optimizedImageResult.images[0])"
                  object-fit="contain"
                  :img-props="{ style: { width: '100%', height: 'auto', display: 'block' } }"
                />

                <!-- 文本输出显示（如果存在） -->
                <template v-if="optimizedImageResult.text">
                  <NCard size="small" :title="t('imageWorkspace.results.textOutput')" style="margin-top: 8px;">
                    <NText :depth="2" style="white-space: pre-wrap; line-height: 1.5;">
                      {{ optimizedImageResult.text }}
                    </NText>
                  </NCard>
                </template>

                <!-- 操作按钮 -->
                <NSpace justify="center" :size="8">
                  <NButton @click="downloadImageFromResult(optimizedImageResult.images[0], 'optimized')">
                    <template #icon>
                      <NIcon>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                      </NIcon>
                    </template>
                    {{ t('imageWorkspace.results.download') }}
                  </NButton>

                  <NButton v-if="optimizedImageResult.text" size="small" secondary @click="copyImageText(optimizedImageResult.text)">
                    <template #icon>
                      <NIcon>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                      </NIcon>
                    </template>
                    {{ t('imageWorkspace.results.copyText') }}
                  </NButton>
                </NSpace>
              </NSpace>
            </template>
            <template v-else>
              <template v-if="originalImageResult && originalImageResult.images.length > 0">
                <!-- 多模态结果显示：图像 + 文本（使用Naive UI组件） -->
                <NSpace vertical :size="12">
                  <!-- 图像显示 -->
                  <NImage
                    :src="getImageSrc(originalImageResult.images[0])"
                    object-fit="contain"
                    :img-props="{ style: { width: '100%', height: 'auto', display: 'block' } }"
                  />

                  <!-- 文本输出显示（如果存在） -->
                  <template v-if="originalImageResult.text">
                    <NCard size="small" :title="t('imageWorkspace.results.textOutput')" style="margin-top: 8px;">
                      <NText :depth="2" style="white-space: pre-wrap; line-height: 1.5;">
                        {{ originalImageResult.text }}
                      </NText>
                    </NCard>
                  </template>

                  <!-- 操作按钮 -->
                  <NSpace justify="center" :size="8">
                    <NButton @click="downloadImageFromResult(originalImageResult.images[0], 'original')">
                      <template #icon>
                        <NIcon>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                          </svg>
                        </NIcon>
                      </template>
                      {{ t('imageWorkspace.results.download') }}
                    </NButton>

                    <NButton v-if="originalImageResult.text" size="small" secondary @click="copyImageText(originalImageResult.text)">
                      <template #icon>
                        <NIcon>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                          </svg>
                        </NIcon>
                      </template>
                      {{ t('imageWorkspace.results.copyText') }}
                    </NButton>
                  </NSpace>
                </NSpace>
              </template>
              <NEmpty v-else :description="t('imageWorkspace.results.noGenerationResult')" />
            </template>
          </template>
        </TestResultSection>
      </NFlex>
    </NCard>
  </NFlex>

  <!-- 原始提示词 - 全屏编辑器 -->
  <FullscreenDialog v-model="isFullscreen" :title="t('imageWorkspace.input.originalPrompt')">
    <NInput
      v-model:value="fullscreenValue"
      type="textarea"
      :placeholder="t('imageWorkspace.input.originalPromptPlaceholder')"
      :autosize="{ minRows: 20 }"
      clearable
      show-count
      :disabled="isOptimizing"
    />
  </FullscreenDialog>

  <!-- 图片上传弹窗 -->
  <n-modal v-model:show="showUploadModal" preset="card" :title="t('imageWorkspace.upload.title')" style="width: min(500px, 90vw); max-width: 500px;">
    <div style="padding: 16px;">
      <n-upload
        :max="1"
        accept="image/png,image/jpeg"
        :show-file-list="true"
        @change="handleModalUploadChange"
        :disabled="isOptimizing"
      >
        <n-upload-dragger>
          <div style="padding: 24px; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 12px;">📁</div>
            <n-text style="font-size: 14px;">{{ t('imageWorkspace.upload.dragText') }}</n-text>
            <n-p depth="3" style="margin-top: 8px; font-size: 12px;">
              {{ t('imageWorkspace.upload.fileRequirements') }}
            </n-p>
          </div>
        </n-upload-dragger>
      </n-upload>

      <!-- 上传状态指示 -->
      <div v-if="uploadStatus !== 'idle'" style="margin-top: 16px;">
        <n-progress
          v-if="uploadStatus === 'uploading'"
          :percentage="uploadProgress"
          :show-indicator="true"
          status="info"
        />
        <n-alert
          v-else-if="uploadStatus === 'error'"
          :title="t('imageWorkspace.upload.uploadFailed')"
          type="error"
          size="small"
        />
        <n-alert
          v-else-if="uploadStatus === 'success'"
          :title="t('imageWorkspace.upload.uploadSuccess')"
          type="success"
          size="small"
        />
      </div>
    </div>
  </n-modal>
  
  <!-- 模板管理器由 App 统一管理，这里不再渲染 -->

</template>

<script setup lang="ts">
import { onMounted, onUnmounted, inject, ref, computed, watch, nextTick, type Ref } from 'vue'
import {
  NCard, NButton, NInput, NSelect, NEmpty, NFormItem, NForm, NSpace,
  NUpload, NUploadDragger, NImage, NText, NSwitch, NFlex, NGrid, NGridItem,
  NP, NProgress, NAlert, NModal, NIcon, NTag
} from 'naive-ui'
import { useI18n } from 'vue-i18n'
// 使用 Naive UI 内置图标或简单文本替代
// import TemplateSelectUI from '../TemplateSelect.vue' // Replaced by SelectWithConfig
import PromptPanelUI from '../PromptPanel.vue'
import TestResultSection from '../TestResultSection.vue'
import SelectWithConfig from '../SelectWithConfig.vue'
import ImageModeSelector, { type ImageMode } from './ImageModeSelector.vue'
import { useImageWorkspace } from '../../composables/useImageWorkspace'
import { DataTransformer, OptionAccessors } from '../../utils/data-transformer'
import type { AppServices } from '../../types/services'
import { useFullscreen } from '../../composables/useFullscreen'
import FullscreenDialog from '../FullscreenDialog.vue'
import type { TemplateSelectOption } from '../../types/select-options'

// 国际化
const { t } = useI18n()

// 服务注入
const services = inject<Ref<AppServices | null>>('services', ref(null))

// 使用图像工作区 composable
const {
  // 状态
  originalPrompt,
  optimizedPrompt,
  optimizedReasoning,
  isOptimizing,
  isIterating,
  imageMode,
  selectedTextModelKey,
  selectedImageModelKey,
  selectedTemplate,
  selectedIterateTemplate,
  inputImageB64,
  isCompareMode,
  originalImageResult,
  optimizedImageResult,
  currentImageResult,
  currentVersions,
  currentVersionId,
  uploadStatus,
  uploadProgress,

  // 计算属性
  currentPrompt,
  previewImageUrl,
  templateType,
  textModelOptions,
  imageModelOptions,
  optimizationMode,
  advancedModeEnabled,
  selectedImageModelCapabilities,
  selectedImageModelInfo,

  // 图像生成状态
  isGenerating,
  generationProgress,
  generationError,

  // 方法
  initialize,
  handleUploadChange,
  handleOptimizePrompt,
  handleIteratePrompt,
  handleGenerateImage,
  handleImageModeChange,
  handleSwitchVersion,
  getImageSrc,
  downloadImageFromResult,
  saveSelections,
  cleanup,
  refreshTextModels,
  refreshImageModels,
  restoreTemplateSelection
} = useImageWorkspace(services)

// PromptPanel 引用，用于在语言切换后刷新迭代模板选择
const promptPanelRef = ref<InstanceType<typeof PromptPanelUI> | null>(null)

// 注入 App 层统一的 openTemplateManager / openModelManager 接口
const appOpenTemplateManager = inject<(type?: 'optimize' | 'userOptimize' | 'iterate' | 'text2imageOptimize' | 'image2imageOptimize' | 'imageIterate') => void>('openTemplateManager', null as any)
const appOpenModelManager = inject<(tab?: 'text' | 'image') => void>('openModelManager', null as any)

// 将迭代类型映射为图像迭代，并调用 App 入口
  const onOpenTemplateManager = (type: 'optimize' | 'userOptimize' | 'iterate' | 'text2imageOptimize' | 'image2imageOptimize' | 'imageIterate') => {
    const target = type === 'iterate' ? 'imageIterate' : type
    if (appOpenTemplateManager) appOpenTemplateManager(target as any)
  }

// 模板列表（根据当前 image 模式的模板类型加载）
const templateOptions = ref<TemplateSelectOption[]>([])

const loadTemplateList = async () => {
  try {
    if (services?.value?.templateManager) {
      const list = await services.value.templateManager.listTemplatesByType(templateType.value as any)
      templateOptions.value = DataTransformer.templatesToSelectOptions(list || [])

      // 注意：不要在这里执行模板重置逻辑，因为这会干扰模式切换时的模板恢复
      // 模板选择的逻辑应该完全由 useImageWorkspace 的 restoreTemplateSelection 处理
      console.log('[ImageWorkspace] Template list loaded for type:', templateType.value, 'count:', templateOptions.value.length)
    } else {
      templateOptions.value = []
    }
  } catch (e) {
    console.warn('[ImageWorkspace] Failed to load template list:', e)
    templateOptions.value = []
  }
}

watch(templateType, async () => {
  // 先加载对应类型的模板列表，再恢复该模式下的模板选择，避免下拉在切换时显示为空
  await loadTemplateList()
  await nextTick()
  try {
    await restoreTemplateSelection()
  } catch (e) {
    console.warn('[ImageWorkspace] Failed to restore template after list load:', e)
  }
})

// 全屏编辑：复用 useFullscreen 模式，编辑 originalPrompt
const { isFullscreen, fullscreenValue, openFullscreen } = useFullscreen(
  computed(() => originalPrompt.value),
  (value) => { originalPrompt.value = value }
)

// ========== 模板 SelectWithConfig 选中绑定 ==========
// 使用模板对象列表与字符串 id 进行绑定
const selectedTemplateIdForSelect = computed<string>({
  get() {
    const id = selectedTemplate?.value?.id || ''
    if (!id) return ''
    // 仅当当前下拉列表中存在该模板时再返回，避免在列表尚未加载完成时出现短暂的失配导致清空
    const existsInList = (templateOptions.value || []).some((opt) => opt.value === id)
    return existsInList ? id : ''
  },
  set(id: string) {
    if (!id) {
      (selectedTemplate as any).value = null
      return
    }
    const option = (templateOptions.value || []).find((opt) => opt.value === id) || null
    ;(selectedTemplate as any).value = option?.raw || null
    // 用户选择模板时立即保存到对应模式的存储键
    if (option?.raw) {
      nextTick(() => {
        saveSelections()
      })
    }
  }
})

// 持久化模板选择的时机由具体的用户操作控制，而不是自动同步
// 避免在模板选择变化时自动触发saveSelections，防止跨模式数据污染

  // 弹窗状态
  const showUploadModal = ref(false)

// 弹窗相关方法
const openUploadModal = () => {
  showUploadModal.value = true
}

// 弹窗中的上传处理
const handleModalUploadChange = (data: any) => {
  // 复用原有的上传逻辑
  handleUploadChange(data)
  // 上传成功后关闭弹窗
  if (data?.file && data.file.status === 'finished') {
    setTimeout(() => {
      showUploadModal.value = false
    }, 1000)
  }
}

// 清除上传的图片 - 通过重新触发上传变更来清除
const clearUploadedImage = () => {
  // 调用上传变更处理器，传入空数据来清除图片
  handleUploadChange({ file: null, fileList: [] })
}

// 复制图像文本输出
const copyImageText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(t('imageWorkspace.results.copySuccess'))
  } catch (error) {
    console.error('Failed to copy text:', error)
    toast.error(t('imageWorkspace.results.copyError'))
  }
}

// 初始化
// 语言切换事件处理器（用于刷新迭代模板选择）
const refreshIterateHandler = () => {
  promptPanelRef.value?.refreshIterateTemplateSelect?.()
}

// 文本模型刷新事件处理器（模型管理器关闭后同步刷新）
const refreshTextModelsHandler = async () => {
  try {
    await refreshTextModels()
  } catch (e) {
    console.warn('[ImageWorkspace] Failed to refresh text models after manager close:', e)
  }
}

// 图像模型刷新事件处理器（模型管理器关闭后同步刷新）
const refreshImageModelsHandler = async () => {
  try {
    await refreshImageModels()
  } catch (e) {
    console.warn('[ImageWorkspace] Failed to refresh image models after manager close:', e)
  }
}

// 模板管理器关闭后刷新当前模板列表（并尽量保持当前选择）
const refreshTemplatesHandler = async () => {
  try {
    await loadTemplateList()
    await nextTick()
    await restoreTemplateSelection()
  } catch (e) {
    console.warn('[ImageWorkspace] Failed to refresh template list after manager close:', e)
  }
}

// 下拉获得焦点时，主动刷新模板列表，确保新建/编辑后的模板可见
const handleTemplateSelectFocus = async () => {
  await refreshTemplatesHandler()
}

// 文本模型下拉获得焦点时刷新，确保新建/编辑后的模型立即可用
const handleTextModelSelectFocus = async () => {
  await refreshTextModelsHandler()
}

onMounted(async () => {
  console.log('[ImageWorkspace] Starting initialization...')
  console.log('[ImageWorkspace] Services available:', !!services?.value)
  try {
    await initialize()
    console.log('[ImageWorkspace] Initialization completed successfully')
  } catch (error) {
    console.error('[ImageWorkspace] Initialization failed:', error)
  }

  // 监听模板语言切换事件，刷新迭代模板选择
  if (typeof window !== 'undefined') {
    window.addEventListener('image-workspace-refresh-iterate-select', refreshIterateHandler)
    window.addEventListener('image-workspace-refresh-text-models', refreshTextModelsHandler)
    window.addEventListener('image-workspace-refresh-image-models', refreshImageModelsHandler)
    window.addEventListener('image-workspace-refresh-templates', refreshTemplatesHandler)
  }

  // 加载模板列表
  await loadTemplateList()
})

// 清理
onUnmounted(() => {
  console.log('[ImageWorkspace] Cleaning up...')
  cleanup()
  if (typeof window !== 'undefined') {
    window.removeEventListener('image-workspace-refresh-iterate-select', refreshIterateHandler)
    window.removeEventListener('image-workspace-refresh-text-models', refreshTextModelsHandler)
    window.removeEventListener('image-workspace-refresh-image-models', refreshImageModelsHandler)
    window.removeEventListener('image-workspace-refresh-templates', refreshTemplatesHandler)
  }
})
</script>

<style scoped>
/* 缩略图容器样式 */
.thumbnail-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.thumbnail-container :deep(.n-image) {
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.thumbnail-container :deep(.n-image:hover) {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* 移除了所有自定义上传样式，使用 Naive UI 原生样式 */
</style>
