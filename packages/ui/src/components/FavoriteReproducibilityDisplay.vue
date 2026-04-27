<template>
  <div class="favorite-reproducibility-display">
    <NEmpty
      v-if="!reproducibility.hasData"
      size="small"
      :description="t('favorites.manager.preview.reproducibility.empty')"
    />

    <NSpace v-else vertical :size="12">
      <NSpace :size="8" align="center" wrap>
        <NTag
          v-if="reproducibility.variableCount > 0"
          size="small"
          type="info"
          :bordered="false"
        >
          {{ t('favorites.manager.preview.reproducibility.variableCount', { count: reproducibility.variableCount }) }}
        </NTag>
        <NTag
          v-if="reproducibility.exampleCount > 0"
          size="small"
          type="success"
          :bordered="false"
        >
          {{ t('favorites.manager.preview.reproducibility.exampleCount', { count: reproducibility.exampleCount }) }}
        </NTag>
        <NTag
          v-if="reproducibility.hasInputImages"
          size="small"
          type="warning"
          :bordered="false"
        >
          {{ t('favorites.manager.preview.reproducibility.hasInputImages') }}
        </NTag>
      </NSpace>

      <section v-if="reproducibility.variables.length > 0" class="favorite-reproducibility-display__section">
        <NText strong>{{ t('favorites.manager.preview.reproducibility.variables') }}</NText>
        <div class="favorite-reproducibility-display__table-scroll">
          <NTable size="small" striped :single-line="false">
            <thead>
              <tr>
                <th>{{ t('favorites.manager.preview.reproducibility.variableName') }}</th>
                <th>{{ t('favorites.manager.preview.reproducibility.variableDefault') }}</th>
                <th>{{ t('favorites.manager.preview.reproducibility.variableRequired') }}</th>
                <th>{{ t('favorites.manager.preview.reproducibility.variableDescription') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="variable in reproducibility.variables"
                :key="variable.name"
              >
                <td>{{ variable.name }}</td>
                <td>{{ variable.defaultValue || '-' }}</td>
                <td>
                  {{
                    variable.required
                      ? t('favorites.manager.preview.reproducibility.requiredYes')
                      : t('favorites.manager.preview.reproducibility.requiredNo')
                  }}
                </td>
                <td>{{ variable.description || '-' }}</td>
              </tr>
            </tbody>
          </NTable>
        </div>
      </section>

      <section v-if="reproducibility.examples.length > 0" class="favorite-reproducibility-display__section">
        <NText strong>{{ t('favorites.manager.preview.reproducibility.examples') }}</NText>
        <NSpace vertical :size="8">
          <NCard
            v-for="(example, index) in reproducibility.examples"
            :key="example.id || `example-${index}`"
            size="small"
            embedded
          >
            <NSpace vertical :size="6">
              <NText strong>
                {{ example.id || t('favorites.manager.preview.reproducibility.exampleLabel', { index: index + 1 }) }}
              </NText>
              <NButton
                size="small"
                secondary
                type="primary"
                :data-testid="`favorite-repro-example-apply-${index}`"
                @click="$emit('apply-example', { exampleId: example.id, exampleIndex: index })"
              >
                {{ t('favorites.manager.preview.reproducibility.applyExample') }}
              </NButton>
              <NText v-if="example.text">{{ example.text }}</NText>
              <NText v-if="example.description" depth="3">{{ example.description }}</NText>

              <NDescriptions
                v-if="exampleSummaryRows(example).length > 0"
                :column="1"
                size="small"
                bordered
                label-placement="left"
              >
                <NDescriptionsItem
                  v-for="row in exampleSummaryRows(example)"
                  :key="row.label"
                  :label="row.label"
                >
                  {{ row.value }}
                </NDescriptionsItem>
              </NDescriptions>

              <div
                v-if="getExampleImageSources(index, 'images', example).length > 0"
                class="favorite-reproducibility-display__image-block"
              >
                <NText strong>{{ t('favorites.manager.preview.reproducibility.images') }}</NText>
                <AppPreviewImageGroup>
                  <div class="favorite-reproducibility-display__image-grid">
                    <AppPreviewImage
                      v-for="(source, imageIndex) in getExampleImageSources(index, 'images', example)"
                      :key="`example-${index}-image-${imageIndex}-${source.slice(0, 24)}`"
                      :src="source"
                      :alt="t('favorites.dialog.imageAlt', { index: imageIndex + 1 })"
                      object-fit="cover"
                      class="favorite-reproducibility-display__image"
                    />
                  </div>
                </AppPreviewImageGroup>
              </div>

              <div
                v-if="getExampleImageSources(index, 'inputImages', example).length > 0"
                class="favorite-reproducibility-display__image-block"
              >
                <NText strong>{{ t('favorites.manager.preview.reproducibility.inputImages') }}</NText>
                <AppPreviewImageGroup>
                  <div class="favorite-reproducibility-display__image-grid">
                    <AppPreviewImage
                      v-for="(source, imageIndex) in getExampleImageSources(index, 'inputImages', example)"
                      :key="`example-${index}-input-image-${imageIndex}-${source.slice(0, 24)}`"
                      :src="source"
                      :alt="t('favorites.dialog.imageAlt', { index: imageIndex + 1 })"
                      object-fit="cover"
                      class="favorite-reproducibility-display__image"
                    />
                  </div>
                </AppPreviewImageGroup>
              </div>
            </NSpace>
          </NCard>
        </NSpace>
      </section>
    </NSpace>
  </div>
</template>

<script setup lang="ts">
import {
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NSpace,
  NTable,
  NTag,
  NText,
} from 'naive-ui'
import { useI18n } from 'vue-i18n'

import type {
  FavoriteReproducibility,
  FavoriteReproducibilityExample,
} from '../utils/favorite-reproducibility'
import AppPreviewImage from './media/AppPreviewImage.vue'
import AppPreviewImageGroup from './media/AppPreviewImageGroup.vue'

type FavoriteReproducibilityExamplePreviews = {
  images: Array<{ assetId: string; source: string }>
  inputImages: Array<{ assetId: string; source: string }>
}

const props = defineProps<{
  reproducibility: FavoriteReproducibility
  examplePreviews?: FavoriteReproducibilityExamplePreviews[]
}>()

defineEmits<{
  'apply-example': [options: { exampleId?: string; exampleIndex: number }]
}>()

const { t } = useI18n()

const dedupeStrings = (items: string[]) => Array.from(new Set(items.filter(Boolean)))

const getExampleImageSources = (
  index: number,
  field: 'images' | 'inputImages',
  example: FavoriteReproducibilityExample,
) => {
  const resolvedSources = props.examplePreviews?.[index]?.[field] || []
  return dedupeStrings([
    ...(example[field] || []),
    ...resolvedSources.map((item) => item.source),
  ])
}

const exampleSummaryRows = (example: FavoriteReproducibilityExample) => {
  const rows: Array<{ label: string; value: string }> = []
  const parameterEntries = Object.entries(example.parameters)

  if (parameterEntries.length > 0) {
    rows.push({
      label: t('favorites.manager.preview.reproducibility.parameters'),
      value: parameterEntries.map(([key, value]) => `${key}=${value}`).join(', '),
    })
  }

  return rows
}
</script>

<style scoped>
.favorite-reproducibility-display {
  min-width: 0;
}

.favorite-reproducibility-display__section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.favorite-reproducibility-display__table-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.favorite-reproducibility-display__table-scroll :deep(table) {
  min-width: 560px;
}

.favorite-reproducibility-display__table-scroll :deep(th),
.favorite-reproducibility-display__table-scroll :deep(td),
.favorite-reproducibility-display :deep(.n-descriptions-table-content__content) {
  min-width: 0;
  overflow-wrap: anywhere;
  vertical-align: top;
}

.favorite-reproducibility-display :deep(.n-card) {
  min-width: 0;
}

.favorite-reproducibility-display :deep(.n-text) {
  overflow-wrap: anywhere;
}

.favorite-reproducibility-display__image-block {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.favorite-reproducibility-display__image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 8px;
}

.favorite-reproducibility-display__image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: var(--n-color-embedded);
}
</style>
