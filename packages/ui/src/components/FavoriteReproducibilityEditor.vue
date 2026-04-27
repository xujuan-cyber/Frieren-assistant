<template>
  <NCard
    size="small"
    :title="t('favorites.dialog.reproducibility.title')"
    :segmented="{ content: true }"
  >
    <NSpace vertical :size="hasReproducibilityData ? 12 : 8">
      <NText depth="3">
        {{ t('favorites.dialog.reproducibility.hint') }}
      </NText>

      <div v-if="!hasReproducibilityData" class="favorite-reproducibility-editor__empty">
        <NText depth="3">
          {{ t('favorites.dialog.reproducibility.empty') }}
        </NText>
        <NSpace :size="8" wrap>
          <NButton data-testid="favorite-repro-add-variable-empty" size="small" secondary @click="handleAddVariable">
            {{ t('favorites.dialog.reproducibility.addVariable') }}
          </NButton>
          <NButton data-testid="favorite-repro-add-example-empty" size="small" secondary @click="handleAddExample">
            {{ t('favorites.dialog.reproducibility.addExample') }}
          </NButton>
        </NSpace>
      </div>

      <template v-else>
        <section class="favorite-reproducibility-editor__section">
          <div class="favorite-reproducibility-editor__section-header">
            <NText strong>{{ t('favorites.dialog.reproducibility.variables') }}</NText>
            <NButton data-testid="favorite-repro-add-variable" size="small" secondary @click="handleAddVariable">
              {{ t('favorites.dialog.reproducibility.addVariable') }}
            </NButton>
          </div>

          <NEmpty
            v-if="variables.length === 0"
            size="small"
            :description="t('favorites.dialog.reproducibility.noVariables')"
          />

          <NSpace v-else vertical :size="8">
            <div
              v-for="(variable, index) in variables"
              :key="`${index}-${variable.name}`"
              class="favorite-reproducibility-editor__item"
            >
              <NGrid cols="1 s:2 m:3" :x-gap="10" :y-gap="8" responsive="screen">
                <NGridItem>
                  <NInput
                    data-testid="favorite-repro-variable-name"
                    :value="variable.name"
                    :placeholder="t('favorites.dialog.reproducibility.variableNamePlaceholder')"
                    @update:value="updateVariable(index, { name: $event })"
                  />
                </NGridItem>
                <NGridItem>
                  <NInput
                    data-testid="favorite-repro-variable-default"
                    :value="variable.defaultValue"
                    :placeholder="t('favorites.dialog.reproducibility.variableDefaultPlaceholder')"
                    @update:value="updateVariable(index, { defaultValue: $event })"
                  />
                </NGridItem>
                <NGridItem>
                  <NSelect
                    data-testid="favorite-repro-variable-type"
                    :value="variable.type"
                    clearable
                    :options="variableTypeOptions"
                    :placeholder="t('favorites.dialog.reproducibility.variableTypePlaceholder')"
                    @update:value="updateVariable(index, { type: $event || undefined })"
                  />
                </NGridItem>
                <NGridItem>
                  <NInput
                    data-testid="favorite-repro-variable-options"
                    :value="formatOptions(variable.options)"
                    :placeholder="t('favorites.dialog.reproducibility.variableOptionsPlaceholder')"
                    @update:value="updateVariable(index, { options: parseListText($event) })"
                  />
                </NGridItem>
                <NGridItem>
                  <NInput
                    data-testid="favorite-repro-variable-description"
                    :value="variable.description"
                    :placeholder="t('favorites.dialog.reproducibility.variableDescriptionPlaceholder')"
                    @update:value="updateVariable(index, { description: $event })"
                  />
                </NGridItem>
              </NGrid>

              <div class="favorite-reproducibility-editor__item-actions">
                <NCheckbox
                  data-testid="favorite-repro-variable-required"
                  :checked="variable.required"
                  @update:checked="updateVariable(index, { required: Boolean($event) })"
                >
                  {{ t('favorites.dialog.reproducibility.required') }}
                </NCheckbox>
                <NButton
                  data-testid="favorite-repro-remove-variable"
                  size="small"
                  quaternary
                  type="error"
                  @click="handleRemoveVariable(index)"
                >
                  {{ t('favorites.dialog.reproducibility.remove') }}
                </NButton>
              </div>
            </div>
          </NSpace>
        </section>

        <section class="favorite-reproducibility-editor__section">
          <div class="favorite-reproducibility-editor__section-header">
            <NText strong>{{ t('favorites.dialog.reproducibility.examples') }}</NText>
            <NButton data-testid="favorite-repro-add-example" size="small" secondary @click="handleAddExample">
              {{ t('favorites.dialog.reproducibility.addExample') }}
            </NButton>
          </div>

          <NEmpty
            v-if="examples.length === 0"
            size="small"
            :description="t('favorites.dialog.reproducibility.noExamples')"
          />

          <NSpace v-else vertical :size="8">
            <div
              v-for="(example, index) in examples"
              :key="`${index}-${example.id || example.text || 'example'}`"
              class="favorite-reproducibility-editor__item favorite-reproducibility-editor__example"
            >
              <div class="favorite-reproducibility-editor__example-header">
                <NText strong>
                  {{ example.id || t('favorites.dialog.reproducibility.exampleLabel', { index: index + 1 }) }}
                </NText>
                <NButton
                  data-testid="favorite-repro-remove-example"
                  size="small"
                  quaternary
                  type="error"
                  @click="handleRemoveExample(index)"
                >
                  {{ t('favorites.dialog.reproducibility.remove') }}
                </NButton>
              </div>

              <div class="favorite-reproducibility-editor__example-basic">
                <div>
                  <NInput
                    data-testid="favorite-repro-example-id"
                    :value="example.id"
                    :placeholder="t('favorites.dialog.reproducibility.exampleIdPlaceholder')"
                    @update:value="updateExample(index, { id: $event })"
                  />
                </div>
                <div>
                  <NInput
                    data-testid="favorite-repro-example-text"
                    :value="example.text"
                    :placeholder="t('favorites.dialog.reproducibility.exampleTextPlaceholder')"
                    @update:value="updateExample(index, { text: $event })"
                  />
                </div>
                <div class="favorite-reproducibility-editor__example-description">
                  <NInput
                    data-testid="favorite-repro-example-description"
                    :value="example.description"
                    :placeholder="t('favorites.dialog.reproducibility.exampleDescriptionPlaceholder')"
                    @update:value="updateExample(index, { description: $event })"
                  />
                </div>
              </div>

              <div class="favorite-reproducibility-editor__example-section">
                <div class="favorite-reproducibility-editor__parameter-field">
                  <NText strong>{{ t('favorites.dialog.reproducibility.exampleParametersLabel') }}</NText>
                  <NSpace
                    v-if="getParameterEntries(example.parameters).length > 0"
                    vertical
                    :size="6"
                  >
                    <div
                      v-for="[parameterKey, parameterValue] in getParameterEntries(example.parameters)"
                      :key="parameterKey"
                      class="favorite-reproducibility-editor__parameter-row"
                    >
                      <NText class="favorite-reproducibility-editor__parameter-key">
                        {{ parameterKey }}
                      </NText>
                      <NInput
                        data-testid="favorite-repro-example-parameter-value"
                        :value="parameterValue"
                        :placeholder="t('favorites.dialog.reproducibility.parameterValuePlaceholder')"
                        @update:value="handleUpdateExampleParameterValue(index, parameterKey, $event)"
                      />
                      <NButton
                        data-testid="favorite-repro-example-remove-parameter"
                        size="small"
                        quaternary
                        type="error"
                        @click="handleRemoveExampleParameter(index, parameterKey)"
                      >
                        {{ t('favorites.dialog.reproducibility.remove') }}
                      </NButton>
                    </div>
                  </NSpace>
                  <div class="favorite-reproducibility-editor__parameter-row">
                    <NInput
                      data-testid="favorite-repro-example-parameter-key"
                      :value="getParameterDraft(index).key"
                      :placeholder="t('favorites.dialog.reproducibility.parameterNamePlaceholder')"
                      @update:value="setParameterDraft(index, 'key', $event)"
                    />
                    <NInput
                      data-testid="favorite-repro-example-parameter-new-value"
                      :value="getParameterDraft(index).value"
                      :placeholder="t('favorites.dialog.reproducibility.parameterValuePlaceholder')"
                      @update:value="setParameterDraft(index, 'value', $event)"
                      @keydown.enter.prevent="handleAddExampleParameter(index)"
                    />
                    <NButton
                      data-testid="favorite-repro-example-add-parameter"
                      size="small"
                      secondary
                      @click="handleAddExampleParameter(index)"
                    >
                      {{ t('favorites.dialog.reproducibility.addParameter') }}
                    </NButton>
                  </div>
                </div>
              </div>

              <div class="favorite-reproducibility-editor__example-media-grid">
                <div class="favorite-reproducibility-editor__image-field">
                  <NText strong>{{ t('favorites.dialog.reproducibility.exampleImages') }}</NText>
                  <NSpace :size="6" align="center" wrap class="favorite-reproducibility-editor__image-toolbar">
                    <NInput
                      data-testid="favorite-repro-example-images"
                      :value="getImageUrlDraft(index, 'images')"
                      :placeholder="t('favorites.dialog.reproducibility.exampleImagesPlaceholder')"
                      @update:value="setImageUrlDraft(index, 'images', $event)"
                      @keydown.enter.prevent="handleAddExampleImageUrl(index, 'images')"
                    />
                    <NButton
                      data-testid="favorite-repro-example-add-image-url"
                      size="small"
                      secondary
                      class="favorite-reproducibility-editor__image-action"
                      @click="handleAddExampleImageUrl(index, 'images')"
                    >
                      {{ t('favorites.dialog.reproducibility.addImageUrl') }}
                    </NButton>
                  </NSpace>
                  <NUpload
                    data-testid="favorite-repro-example-image-upload"
                    accept="image/*"
                    multiple
                    :default-upload="false"
                    :show-file-list="false"
                    @before-upload="(options) => handleBeforeExampleImageUpload(index, 'images', options)"
                  >
                    <NButton
                      data-testid="favorite-repro-example-add-images"
                      size="small"
                      secondary
                      class="favorite-reproducibility-editor__image-action"
                    >
                      {{ t('favorites.dialog.reproducibility.addExampleImages') }}
                    </NButton>
                  </NUpload>
                  <AppPreviewImageGroup v-if="getExampleImageItems(index, 'images', example).length > 0">
                    <div class="favorite-reproducibility-editor__image-grid">
                      <div
                        v-for="item in getExampleImageItems(index, 'images', example)"
                        :key="item.key"
                        class="favorite-reproducibility-editor__image-item"
                      >
                        <AppPreviewImage
                          :src="item.source"
                          :alt="t('favorites.dialog.imageAlt', { index: item.displayIndex + 1 })"
                          object-fit="cover"
                          class="favorite-reproducibility-editor__image"
                        />
                        <NButton
                          data-testid="favorite-repro-example-remove-image"
                          size="tiny"
                          type="error"
                          quaternary
                          class="favorite-reproducibility-editor__image-remove"
                          @click="handleRemoveExampleImage(index, 'images', item)"
                        >
                          ×
                        </NButton>
                      </div>
                    </div>
                  </AppPreviewImageGroup>
                </div>

                <div class="favorite-reproducibility-editor__image-field">
                  <NText strong>{{ t('favorites.dialog.reproducibility.exampleInputImages') }}</NText>
                  <NSpace :size="6" align="center" wrap class="favorite-reproducibility-editor__image-toolbar">
                    <NInput
                      data-testid="favorite-repro-example-input-images"
                      :value="getImageUrlDraft(index, 'inputImages')"
                      :placeholder="t('favorites.dialog.reproducibility.exampleInputImagesPlaceholder')"
                      @update:value="setImageUrlDraft(index, 'inputImages', $event)"
                      @keydown.enter.prevent="handleAddExampleImageUrl(index, 'inputImages')"
                    />
                    <NButton
                      data-testid="favorite-repro-example-add-input-image-url"
                      size="small"
                      secondary
                      class="favorite-reproducibility-editor__image-action"
                      @click="handleAddExampleImageUrl(index, 'inputImages')"
                    >
                      {{ t('favorites.dialog.reproducibility.addImageUrl') }}
                    </NButton>
                  </NSpace>
                  <NUpload
                    data-testid="favorite-repro-example-input-image-upload"
                    accept="image/*"
                    multiple
                    :default-upload="false"
                    :show-file-list="false"
                    @before-upload="(options) => handleBeforeExampleImageUpload(index, 'inputImages', options)"
                  >
                    <NButton
                      data-testid="favorite-repro-example-add-input-images"
                      size="small"
                      secondary
                      class="favorite-reproducibility-editor__image-action"
                    >
                      {{ t('favorites.dialog.reproducibility.addExampleInputImages') }}
                    </NButton>
                  </NUpload>
                  <AppPreviewImageGroup v-if="getExampleImageItems(index, 'inputImages', example).length > 0">
                    <div class="favorite-reproducibility-editor__image-grid">
                      <div
                        v-for="item in getExampleImageItems(index, 'inputImages', example)"
                        :key="item.key"
                        class="favorite-reproducibility-editor__image-item"
                      >
                        <AppPreviewImage
                          :src="item.source"
                          :alt="t('favorites.dialog.imageAlt', { index: item.displayIndex + 1 })"
                          object-fit="cover"
                          class="favorite-reproducibility-editor__image"
                        />
                        <NButton
                          data-testid="favorite-repro-example-remove-input-image"
                          size="tiny"
                          type="error"
                          quaternary
                          class="favorite-reproducibility-editor__image-remove"
                          @click="handleRemoveExampleImage(index, 'inputImages', item)"
                        >
                          ×
                        </NButton>
                      </div>
                    </div>
                  </AppPreviewImageGroup>
                </div>
              </div>
            </div>
          </NSpace>
        </section>
      </template>
    </NSpace>
  </NCard>
</template>

<script setup lang="ts">
import {
  NButton,
  NCard,
  NCheckbox,
  NEmpty,
  NGrid,
  NGridItem,
  NInput,
  NSelect,
  NSpace,
  NText,
  NUpload,
  type UploadFileInfo,
} from 'naive-ui'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type {
  FavoriteReproducibilityExample,
  FavoriteReproducibilityVariable,
} from '../utils/favorite-reproducibility'
import AppPreviewImage from './media/AppPreviewImage.vue'
import AppPreviewImageGroup from './media/AppPreviewImageGroup.vue'

type FavoriteReproducibilityImagePreview = {
  assetId: string
  source: string
}

type FavoriteReproducibilityExamplePreviews = {
  images: FavoriteReproducibilityImagePreview[]
  inputImages: FavoriteReproducibilityImagePreview[]
}

type ExampleImageField = 'images' | 'inputImages'
type ExampleAssetField = 'imageAssetIds' | 'inputImageAssetIds'
type ExampleImageItem = {
  key: string
  source: string
  displayIndex: number
  kind: 'source' | 'asset'
  sourceIndex?: number
  assetId?: string
}

const props = defineProps<{
  variables: FavoriteReproducibilityVariable[]
  examples: FavoriteReproducibilityExample[]
  examplePreviews?: FavoriteReproducibilityExamplePreviews[]
}>()

const emit = defineEmits<{
  'update:variables': [variables: FavoriteReproducibilityVariable[]]
  'update:examples': [examples: FavoriteReproducibilityExample[]]
}>()

const { t } = useI18n()

const variableTypeOptions = computed(() => [
  { label: t('favorites.dialog.reproducibility.variableType.string'), value: 'string' },
  { label: t('favorites.dialog.reproducibility.variableType.number'), value: 'number' },
  { label: t('favorites.dialog.reproducibility.variableType.boolean'), value: 'boolean' },
  { label: t('favorites.dialog.reproducibility.variableType.enum'), value: 'enum' },
])

const hasReproducibilityData = computed(
  () => props.variables.length > 0 || props.examples.length > 0,
)

let uploadSequence = 0
let exampleKeySequence = 0
let lastEmittedExamples: FavoriteReproducibilityExample[] | null = null
const exampleDraftKeys = ref<string[]>([])
const imageUrlDrafts = reactive<Record<string, string>>({})
const parameterDrafts = reactive<Record<number, { key: string; value: string }>>({})

const formatOptions = (items: string[] | undefined) => (items || []).join(', ')
const dedupeStrings = (items: string[]) => Array.from(new Set(items.filter(Boolean)))
const assetFieldByImageField: Record<ExampleImageField, ExampleAssetField> = {
  images: 'imageAssetIds',
  inputImages: 'inputImageAssetIds',
}

const parseListText = (value: string): string[] => {
  return String(value || '')
    .split(/[\n,]/u)
    .map((item) => item.trim())
    .filter(Boolean)
}

const getParameterEntries = (parameters: Record<string, string> | undefined) =>
  Object.entries(parameters || {})

const getParameterDraft = (index: number) => {
  parameterDrafts[index] ||= { key: '', value: '' }
  return parameterDrafts[index]
}

const setParameterDraft = (
  index: number,
  field: 'key' | 'value',
  value: string,
) => {
  const draft = getParameterDraft(index)
  draft[field] = value
}

const getImageUrlDraftKey = (index: number, field: ExampleImageField) => `${index}:${field}`

const createExampleDraftKey = () => `example-${++exampleKeySequence}`

const clearExampleDrafts = () => {
  Object.keys(parameterDrafts).forEach((key) => {
    delete parameterDrafts[Number(key)]
  })
  Object.keys(imageUrlDrafts).forEach((key) => {
    delete imageUrlDrafts[key]
  })
}

const emitExamples = (
  examples: FavoriteReproducibilityExample[],
  draftKeys = exampleDraftKeys.value,
) => {
  exampleDraftKeys.value = draftKeys
  lastEmittedExamples = examples
  emit('update:examples', examples)
}

watch(
  () => props.examples,
  (examples) => {
    if (examples === lastEmittedExamples) {
      lastEmittedExamples = null
      if (exampleDraftKeys.value.length !== examples.length) {
        exampleDraftKeys.value = examples.map(() => createExampleDraftKey())
      }
      return
    }

    uploadSequence += 1
    exampleDraftKeys.value = examples.map(() => createExampleDraftKey())
    clearExampleDrafts()
  },
  { immediate: true },
)

const handleAddExampleParameter = (index: number) => {
  const draft = getParameterDraft(index)
  const key = draft.key.trim()
  if (!key) return

  const example = props.examples[index]
  if (!example) return

  updateExample(index, {
    parameters: {
      ...example.parameters,
      [key]: draft.value,
    },
  })
  parameterDrafts[index] = { key: '', value: '' }
}

const handleUpdateExampleParameterValue = (
  index: number,
  key: string,
  value: string,
) => {
  const example = props.examples[index]
  if (!example) return

  updateExample(index, {
    parameters: {
      ...example.parameters,
      [key]: value,
    },
  })
}

const handleRemoveExampleParameter = (index: number, key: string) => {
  const example = props.examples[index]
  if (!example) return

  const nextParameters = { ...example.parameters }
  delete nextParameters[key]
  updateExample(index, { parameters: nextParameters })
}

const removeExampleDrafts = (removedIndex: number) => {
  const nextParameterDrafts: Record<number, { key: string; value: string }> = {}
  Object.entries(parameterDrafts).forEach(([indexText, draft]) => {
    const index = Number(indexText)
    if (!Number.isInteger(index) || index === removedIndex) return
    nextParameterDrafts[index > removedIndex ? index - 1 : index] = draft
  })
  Object.keys(parameterDrafts).forEach((key) => {
    delete parameterDrafts[Number(key)]
  })
  Object.assign(parameterDrafts, nextParameterDrafts)

  const nextImageUrlDrafts: Record<string, string> = {}
  Object.entries(imageUrlDrafts).forEach(([key, value]) => {
    const match = key.match(/^(\d+):(images|inputImages)$/u)
    if (!match) return
    const index = Number(match[1])
    if (index === removedIndex) return
    nextImageUrlDrafts[getImageUrlDraftKey(index > removedIndex ? index - 1 : index, match[2] as ExampleImageField)] = value
  })
  Object.keys(imageUrlDrafts).forEach((key) => {
    delete imageUrlDrafts[key]
  })
  Object.assign(imageUrlDrafts, nextImageUrlDrafts)
}

const handleAddVariable = () => {
  emit('update:variables', [
    ...props.variables,
    {
      name: '',
      required: false,
      options: [],
    },
  ])
}

const updateVariable = (
  index: number,
  patch: Partial<FavoriteReproducibilityVariable>,
) => {
  emit(
    'update:variables',
    props.variables.map((variable, currentIndex) =>
      currentIndex === index ? { ...variable, ...patch } : variable,
    ),
  )
}

const handleRemoveVariable = (index: number) => {
  emit('update:variables', props.variables.filter((_, currentIndex) => currentIndex !== index))
}

const handleAddExample = () => {
  emitExamples([
    ...props.examples,
    {
      parameters: {},
      images: [],
      imageAssetIds: [],
      inputImages: [],
      inputImageAssetIds: [],
    },
  ], [
    ...exampleDraftKeys.value,
    createExampleDraftKey(),
  ])
}

const updateExample = (
  index: number,
  patch: Partial<FavoriteReproducibilityExample>,
) => {
  emitExamples(
    props.examples.map((example, currentIndex) =>
      currentIndex === index ? { ...example, ...patch } : example,
    ),
  )
}

const getImageUrlDraft = (index: number, field: ExampleImageField) =>
  imageUrlDrafts[getImageUrlDraftKey(index, field)] || ''

const setImageUrlDraft = (index: number, field: ExampleImageField, value: string) => {
  imageUrlDrafts[getImageUrlDraftKey(index, field)] = value
}

const handleAddExampleImageUrl = (index: number, field: ExampleImageField) => {
  const value = getImageUrlDraft(index, field).trim()
  const example = props.examples[index]
  if (!example || !value) return

  updateExample(index, {
    [field]: dedupeStrings([...(example[field] || []), value]),
  })
  imageUrlDrafts[getImageUrlDraftKey(index, field)] = ''
}

const getExampleImageItems = (
  index: number,
  field: ExampleImageField,
  example: FavoriteReproducibilityExample,
) => {
  const assetField = assetFieldByImageField[field]
  const existingAssetIds = new Set(example[assetField] || [])
  const sourceItems: ExampleImageItem[] = (example[field] || []).map((source, sourceIndex) => ({
    key: `${field}-source-${sourceIndex}-${source.slice(0, 24)}`,
    source,
    displayIndex: sourceIndex,
    kind: 'source',
    sourceIndex,
  }))
  const assetItems: ExampleImageItem[] = (props.examplePreviews?.[index]?.[field] || [])
    .filter((item) => existingAssetIds.has(item.assetId))
    .map((item, previewIndex) => ({
      key: `${field}-asset-${item.assetId}`,
      source: item.source,
      displayIndex: sourceItems.length + previewIndex,
      kind: 'asset',
      assetId: item.assetId,
    }))

  return [...sourceItems, ...assetItems]
}

const handleRemoveExampleImage = (
  index: number,
  field: ExampleImageField,
  item: ExampleImageItem,
) => {
  const example = props.examples[index]
  if (!example) return

  if (item.kind === 'asset' && item.assetId) {
    const assetField = assetFieldByImageField[field]
    updateExample(index, {
      [assetField]: (example[assetField] || []).filter((assetId) => assetId !== item.assetId),
    })
    return
  }

  if (typeof item.sourceIndex === 'number') {
    updateExample(index, {
      [field]: (example[field] || []).filter((_, currentIndex) => currentIndex !== item.sourceIndex),
    })
  }
}

const handleRemoveExample = (index: number) => {
  removeExampleDrafts(index)
  emitExamples(
    props.examples.filter((_, currentIndex) => currentIndex !== index),
    exampleDraftKeys.value.filter((_, currentIndex) => currentIndex !== index),
  )
}

const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(blob)
  })

const handleBeforeExampleImageUpload = async (
  index: number,
  field: ExampleImageField,
  options: { file: UploadFileInfo },
) => {
  const raw = (options.file as unknown as { file?: Blob | null }).file
  if (!raw) return false

  const requestId = uploadSequence
  const targetDraftKey = exampleDraftKeys.value[index]
  try {
    const dataUrl = await readBlobAsDataUrl(raw)
    if (requestId !== uploadSequence) return false
    if (targetDraftKey !== exampleDraftKeys.value[index]) return false

    const example = props.examples[index]
    if (!example || !dataUrl) return false

    updateExample(index, {
      [field]: dedupeStrings([...(example[field] || []), dataUrl]),
    })
  } catch (error) {
    console.error('[FavoriteReproducibilityEditor] Failed to read selected example image:', error)
  }

  return false
}
</script>

<style scoped>
.favorite-reproducibility-editor__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.favorite-reproducibility-editor__empty {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px dashed var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color-embedded);
}

.favorite-reproducibility-editor__section-header,
.favorite-reproducibility-editor__item-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.favorite-reproducibility-editor__item {
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color);
}

.favorite-reproducibility-editor__example {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.favorite-reproducibility-editor__example-header {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.favorite-reproducibility-editor__example-basic {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.favorite-reproducibility-editor__example-description,
.favorite-reproducibility-editor__example-section {
  grid-column: 1 / -1;
}

.favorite-reproducibility-editor__example-media-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.favorite-reproducibility-editor__item-actions {
  margin-top: 10px;
}

.favorite-reproducibility-editor__item-actions--end {
  justify-content: flex-end;
}

.favorite-reproducibility-editor__parameter-field,
.favorite-reproducibility-editor__image-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.favorite-reproducibility-editor__parameter-row {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(92px, 0.8fr) minmax(0, 1.2fr) auto;
  gap: 6px;
  align-items: center;
}

.favorite-reproducibility-editor__parameter-key {
  min-width: 0;
  padding: 5px 8px;
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  background: var(--n-color-embedded);
  overflow-wrap: anywhere;
}

.favorite-reproducibility-editor__image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 6px;
}

.favorite-reproducibility-editor__image-toolbar :deep(.n-input) {
  min-width: 160px;
  flex: 1 1 180px;
}

.favorite-reproducibility-editor__image-action {
  flex: 0 0 auto;
}

.favorite-reproducibility-editor__image-item {
  position: relative;
  min-width: 0;
}

.favorite-reproducibility-editor__image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: var(--n-color-embedded);
}

.favorite-reproducibility-editor__image-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  min-width: 22px;
  background: var(--n-color);
  border-radius: 999px;
  opacity: 0.92;
}

@media (max-width: 767px) {
  .favorite-reproducibility-editor__example-basic,
  .favorite-reproducibility-editor__example-media-grid {
    grid-template-columns: 1fr;
  }

  .favorite-reproducibility-editor__parameter-row {
    grid-template-columns: 1fr;
  }
}
</style>
