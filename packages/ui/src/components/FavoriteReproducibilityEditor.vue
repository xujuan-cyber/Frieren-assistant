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
          <NButton size="small" secondary @click="handleAddVariable">
            {{ t('favorites.dialog.reproducibility.addVariable') }}
          </NButton>
          <NButton size="small" secondary @click="handleAddExample">
            {{ t('favorites.dialog.reproducibility.addExample') }}
          </NButton>
        </NSpace>
      </div>

      <template v-else>
        <section class="favorite-reproducibility-editor__section">
          <div class="favorite-reproducibility-editor__section-header">
            <NText strong>{{ t('favorites.dialog.reproducibility.variables') }}</NText>
            <NButton size="small" secondary @click="handleAddVariable">
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
                    :value="variable.defaultValue"
                    :placeholder="t('favorites.dialog.reproducibility.variableDefaultPlaceholder')"
                    @update:value="updateVariable(index, { defaultValue: $event })"
                  />
                </NGridItem>
                <NGridItem>
                  <NSelect
                    :value="variable.type"
                    clearable
                    :options="variableTypeOptions"
                    :placeholder="t('favorites.dialog.reproducibility.variableTypePlaceholder')"
                    @update:value="updateVariable(index, { type: $event || undefined })"
                  />
                </NGridItem>
                <NGridItem>
                  <NInput
                    :value="formatOptions(variable.options)"
                    :placeholder="t('favorites.dialog.reproducibility.variableOptionsPlaceholder')"
                    @update:value="updateVariable(index, { options: parseListText($event) })"
                  />
                </NGridItem>
                <NGridItem>
                  <NInput
                    :value="variable.description"
                    :placeholder="t('favorites.dialog.reproducibility.variableDescriptionPlaceholder')"
                    @update:value="updateVariable(index, { description: $event })"
                  />
                </NGridItem>
              </NGrid>

              <div class="favorite-reproducibility-editor__item-actions">
                <NCheckbox
                  :checked="variable.required"
                  @update:checked="updateVariable(index, { required: Boolean($event) })"
                >
                  {{ t('favorites.dialog.reproducibility.required') }}
                </NCheckbox>
                <NButton
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
            <NButton size="small" secondary @click="handleAddExample">
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
              class="favorite-reproducibility-editor__item"
            >
              <NGrid cols="1 s:2" :x-gap="10" :y-gap="8" responsive="screen">
                <NGridItem>
                  <NInput
                    :value="example.id"
                    :placeholder="t('favorites.dialog.reproducibility.exampleIdPlaceholder')"
                    @update:value="updateExample(index, { id: $event })"
                  />
                </NGridItem>
                <NGridItem>
                  <NInput
                    :value="example.text"
                    :placeholder="t('favorites.dialog.reproducibility.exampleTextPlaceholder')"
                    @update:value="updateExample(index, { text: $event })"
                  />
                </NGridItem>
                <NGridItem>
                  <NInput
                    :value="example.description"
                    :placeholder="t('favorites.dialog.reproducibility.exampleDescriptionPlaceholder')"
                    @update:value="updateExample(index, { description: $event })"
                  />
                </NGridItem>
                <NGridItem>
                  <NInput
                    data-testid="favorite-repro-example-parameters"
                    :value="formatParameters(example.parameters)"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 5 }"
                    :placeholder="t('favorites.dialog.reproducibility.exampleParametersPlaceholder')"
                    @update:value="updateExample(index, { parameters: parseParametersText($event) })"
                  />
                </NGridItem>
                <NGridItem>
                  <NInput
                    :value="formatList(example.inputImages)"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 5 }"
                    :placeholder="t('favorites.dialog.reproducibility.exampleInputImagesPlaceholder')"
                    @update:value="updateExample(index, { inputImages: parseListText($event) })"
                  />
                </NGridItem>
              </NGrid>

              <div class="favorite-reproducibility-editor__item-actions favorite-reproducibility-editor__item-actions--end">
                <NButton
                  size="small"
                  quaternary
                  type="error"
                  @click="handleRemoveExample(index)"
                >
                  {{ t('favorites.dialog.reproducibility.remove') }}
                </NButton>
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
} from 'naive-ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type {
  FavoriteReproducibilityExample,
  FavoriteReproducibilityVariable,
} from '../utils/favorite-reproducibility'

const props = defineProps<{
  variables: FavoriteReproducibilityVariable[]
  examples: FavoriteReproducibilityExample[]
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

const formatList = (items: string[] | undefined) => (items || []).join('\n')
const formatOptions = (items: string[] | undefined) => (items || []).join(', ')

const parseListText = (value: string): string[] => {
  return String(value || '')
    .split(/[\n,]/u)
    .map((item) => item.trim())
    .filter(Boolean)
}

const formatParameters = (parameters: Record<string, string> | undefined) => {
  return Object.entries(parameters || {})
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}

const parseParametersText = (value: string): Record<string, string> => {
  const parameters: Record<string, string> = {}
  String(value || '')
    .split(/\r?\n/u)
    .forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed) return
      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex < 0) {
        parameters[trimmed] = ''
        return
      }
      const key = trimmed.slice(0, separatorIndex).trim()
      if (!key) return
      parameters[key] = trimmed.slice(separatorIndex + 1).trim()
    })
  return parameters
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
  emit('update:examples', [
    ...props.examples,
    {
      parameters: {},
      images: [],
      imageAssetIds: [],
      inputImages: [],
      inputImageAssetIds: [],
    },
  ])
}

const updateExample = (
  index: number,
  patch: Partial<FavoriteReproducibilityExample>,
) => {
  emit(
    'update:examples',
    props.examples.map((example, currentIndex) =>
      currentIndex === index ? { ...example, ...patch } : example,
    ),
  )
}

const handleRemoveExample = (index: number) => {
  emit('update:examples', props.examples.filter((_, currentIndex) => currentIndex !== index))
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

.favorite-reproducibility-editor__item-actions {
  margin-top: 10px;
}

.favorite-reproducibility-editor__item-actions--end {
  justify-content: flex-end;
}
</style>
