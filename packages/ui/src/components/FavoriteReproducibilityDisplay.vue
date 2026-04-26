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
            </NSpace>
          </NCard>
        </NSpace>
      </section>
    </NSpace>
  </div>
</template>

<script setup lang="ts">
import {
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

defineProps<{
  reproducibility: FavoriteReproducibility
}>()

const { t } = useI18n()

const exampleSummaryRows = (example: FavoriteReproducibilityExample) => {
  const rows: Array<{ label: string; value: string }> = []
  const parameterEntries = Object.entries(example.parameters)
  const imageCount = example.images.length + example.imageAssetIds.length
  const inputImageCount = example.inputImages.length + example.inputImageAssetIds.length

  if (parameterEntries.length > 0) {
    rows.push({
      label: t('favorites.manager.preview.reproducibility.parameters'),
      value: parameterEntries.map(([key, value]) => `${key}=${value}`).join(', '),
    })
  }

  if (imageCount > 0) {
    rows.push({
      label: t('favorites.manager.preview.reproducibility.images'),
      value: String(imageCount),
    })
  }

  if (inputImageCount > 0) {
    rows.push({
      label: t('favorites.manager.preview.reproducibility.inputImages'),
      value: String(inputImageCount),
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
</style>
