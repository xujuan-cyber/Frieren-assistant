<template>
  <NModal
    v-model:show="show"
    preset="card"
    :title="t('evaluation.compareConfig.dialogTitle')"
    style="width: min(92vw, 920px);"
    :mask-closable="true"
  >
    <NFlex vertical :size="16">
      <NAlert
        v-if="needsExplicitTargetSelection"
        type="warning"
        :show-icon="false"
      >
        {{ t('evaluation.compareConfig.requireTarget') }}
      </NAlert>

      <NAlert
        v-if="expiredManualRoleCount > 0"
        type="info"
        :show-icon="false"
      >
        {{ t('evaluation.compareConfig.expiredManualSummary', { count: expiredManualRoleCount }) }}
      </NAlert>

      <NAlert
        v-if="workspaceChangedManualRoleCount > 0"
        type="warning"
        :show-icon="false"
      >
        {{ t('evaluation.compareConfig.workspaceChangedSummary', { count: workspaceChangedManualRoleCount }) }}
      </NAlert>

      <NText depth="3">
        {{ t('evaluation.compareConfig.helper') }}
      </NText>

      <div class="compare-role-config__preview">
        <div class="compare-role-config__preview-header">
          <div class="compare-role-config__preview-block">
            <NText depth="3">
              {{ t('evaluation.compareConfig.previewModeLabel') }}
            </NText>
            <NTag
              size="small"
              :type="previewMode === 'structured' ? 'success' : 'warning'"
              :bordered="false"
            >
              {{ previewModeLabel }}
            </NTag>
          </div>

          <div class="compare-role-config__preview-block">
            <NText depth="3">
              {{ t('evaluation.compareConfig.previewPairsLabel') }}
            </NText>
            <div class="compare-role-config__pair-tags">
              <NTag
                v-for="pair in pairPreviewEntries"
                :key="pair.key"
                size="small"
                :type="pair.enabled ? 'success' : 'default'"
                :bordered="!pair.enabled"
              >
                {{ pair.label }}
              </NTag>
            </div>
          </div>
        </div>

        <div
          v-if="previewReasonMessages.length"
          class="compare-role-config__preview-reasons"
        >
          <NText depth="3">
            {{ t('evaluation.compareConfig.previewReasonsLabel') }}
          </NText>
          <div
            v-for="reason in previewReasonMessages"
            :key="reason"
            class="compare-role-config__preview-reason"
          >
            <NText>{{ reason }}</NText>
          </div>
        </div>
      </div>

      <NAlert
        v-if="blockingConflictMessages.length"
        type="error"
        :show-icon="false"
      >
        <div
          v-for="message in blockingConflictMessages"
          :key="message"
          class="compare-role-config__alert-line"
        >
          {{ message }}
        </div>
      </NAlert>

      <NAlert
        v-else-if="previewMode === 'generic' && previewReasonMessages.length"
        type="warning"
        :show-icon="false"
      >
        <div class="compare-role-config__alert-line">
          {{ t('evaluation.compareConfig.genericFallbackSummary') }}
        </div>
      </NAlert>

      <div class="compare-role-config__table">
        <div
          v-for="entry in localEntries"
          :key="entry.id"
          class="compare-role-config__row"
        >
          <div class="compare-role-config__slot">
            <NTag size="small" :bordered="false">
              {{ entry.label }}
            </NTag>
            <NTag
              v-if="localManualRoles[entry.id]"
              size="small"
              type="success"
              :bordered="false"
            >
              {{ t('evaluation.compareConfig.manualAssigned') }}: {{ roleLabel(localManualRoles[entry.id]!) }}
            </NTag>
            <NTag
              v-else-if="localEffectiveRoles[entry.id]"
              size="small"
              type="info"
              :bordered="false"
            >
              {{ t('evaluation.compareConfig.autoDetected') }}: {{ roleLabel(localEffectiveRoles[entry.id]!) }}
            </NTag>
            <NTag
              v-if="entry.staleManualRole"
              size="small"
              type="warning"
              :bordered="false"
            >
              {{ t('evaluation.compareConfig.expiredManualTag') }}: {{ roleLabel(entry.staleManualRole) }}
            </NTag>
            <NTag
              v-if="entry.workspaceChangedManualRole"
              size="small"
              type="warning"
              :bordered="false"
            >
              {{ t('evaluation.compareConfig.workspaceChangedTag') }}: {{ roleLabel(entry.workspaceChangedManualRole) }}
            </NTag>
          </div>

          <div class="compare-role-config__meta">
            <NText strong>{{ entry.promptRefLabel }}</NText>
            <NText depth="3">
              {{ entry.versionLabel || t('evaluation.compareConfig.noVersionLabel') }}
            </NText>
            <NText depth="3">
              {{ entry.modelKey || t('evaluation.compareConfig.noModel') }}
            </NText>
          </div>

          <NSelect
            :value="entry.selectedRole || null"
            :options="roleOptions"
            size="small"
            :placeholder="getRoleSelectPlaceholder(entry)"
            clearable
            @update:value="(value) => updateRole(entry.id, value)"
          />
        </div>
      </div>

      <NFlex justify="space-between" :wrap="true" :size="8">
        <NButton quaternary @click="applyInferredRoles">
          {{ t('evaluation.compareConfig.useInferred') }}
        </NButton>
        <NButton quaternary @click="clearRoles">
          {{ t('evaluation.compareConfig.clearManual') }}
        </NButton>
      </NFlex>

      <NFlex justify="end" :size="8">
        <NButton @click="handleCancel">
          {{ t('common.cancel') }}
        </NButton>
        <NButton type="primary" :disabled="confirmDisabled" @click="handleConfirm">
          {{ confirmDisabled ? t('evaluation.compareConfig.confirmDisabled') : t('common.confirm') }}
        </NButton>
      </NFlex>
    </NFlex>
  </NModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NAlert, NButton, NFlex, NModal, NSelect, NTag, NText } from 'naive-ui'
import type { EvaluationSnapshot, StructuredCompareRole } from '@prompt-optimizer/core'
import type { PersistedCompareSnapshotRoles } from '../../types/evaluation'
import {
  analyzeStructuredComparePlan,
  inferCompareSnapshotRoles,
  type StructuredCompareBlockingReason,
  type StructuredCompareWarningReason,
} from '../../composables/prompt/compareEvaluation'

interface CompareRoleDialogEntry {
  id: string
  label: string
  promptRef: EvaluationSnapshot['promptRef']
  promptRefLabel: string
  promptText?: string
  modelKey?: string
  versionLabel?: string
  inferredRole?: StructuredCompareRole
  manualRole?: StructuredCompareRole
  staleManualRole?: StructuredCompareRole
  workspaceChangedManualRole?: StructuredCompareRole
}

interface LocalEntry extends CompareRoleDialogEntry {
  selectedRole?: StructuredCompareRole
}

const props = defineProps<{
  modelValue: boolean
  entries: CompareRoleDialogEntry[]
  manualRoles: PersistedCompareSnapshotRoles
  requireTargetSelection?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [roles: PersistedCompareSnapshotRoles]
}>()

const { t } = useI18n()

const show = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const createLocalEntries = (): LocalEntry[] =>
  props.entries.map((entry) => ({
    ...entry,
    selectedRole: props.manualRoles[entry.id] || undefined,
  }))

const localEntries = ref<LocalEntry[]>(createLocalEntries())

watch(
  () => [props.modelValue, props.entries, props.manualRoles] as const,
  () => {
    if (props.modelValue) {
      localEntries.value = createLocalEntries()
    }
  },
  { deep: true },
)

const roleOptions = computed(() => [
  { label: roleLabel('target'), value: 'target' },
  { label: roleLabel('baseline'), value: 'baseline' },
  { label: roleLabel('reference'), value: 'reference' },
  { label: roleLabel('referenceBaseline'), value: 'referenceBaseline' },
  { label: roleLabel('replica'), value: 'replica' },
  { label: roleLabel('auxiliary'), value: 'auxiliary' },
])

function roleLabel(role: StructuredCompareRole): string {
  return t(`evaluation.compareConfig.roleValues.${role}`)
}

const localManualRoles = computed<PersistedCompareSnapshotRoles>(() =>
  Object.fromEntries(
    localEntries.value
      .filter((entry) => !!entry.selectedRole)
      .map((entry) => [entry.id, entry.selectedRole as StructuredCompareRole]),
  )
)

const localEffectiveRoles = computed<PersistedCompareSnapshotRoles>(() =>
  inferCompareSnapshotRoles(
    props.entries.map((entry) => ({
      id: entry.id,
      promptRef: entry.promptRef,
      promptText: entry.promptText,
      modelKey: entry.modelKey,
    })),
    localManualRoles.value,
  )
)

const localPlanAnalysis = computed(() =>
  analyzeStructuredComparePlan(localEffectiveRoles.value as Record<string, StructuredCompareRole>)
)

const workspaceEntryCount = computed(
  () => props.entries.filter((entry) => entry.promptRef.kind === 'workspace').length,
)

const needsExplicitTargetSelection = computed(() => {
  if (workspaceEntryCount.value <= 1) {
    return false
  }

  return !Object.values(localManualRoles.value).includes('target')
})

const expiredManualRoleCount = computed(
  () => props.entries.filter((entry) => !!entry.staleManualRole).length,
)

const workspaceChangedManualRoleCount = computed(
  () => props.entries.filter((entry) => !!entry.workspaceChangedManualRole).length,
)

const previewMode = computed(() => localPlanAnalysis.value.mode)

const previewModeLabel = computed(() =>
  previewMode.value === 'structured'
    ? t('evaluation.compareConfig.previewModeStructured')
    : t('evaluation.compareConfig.previewModeGeneric')
)

const blockingConflictMessages = computed(() =>
  localPlanAnalysis.value.blockingReasons
    .filter((reason) => reason.startsWith('duplicate'))
    .map((reason) => getReasonLabel(reason as StructuredCompareBlockingReason))
)

const previewReasonMessages = computed(() => {
  const reasons: string[] = []

  if (needsExplicitTargetSelection.value) {
    reasons.push(t('evaluation.compareConfig.requireTarget'))
  }

  localPlanAnalysis.value.blockingReasons
    .filter((reason) => !reason.startsWith('duplicate'))
    .forEach((reason) => {
      reasons.push(getReasonLabel(reason))
    })

  localPlanAnalysis.value.warningReasons.forEach((reason) => {
    reasons.push(getWarningLabel(reason))
  })

  return Array.from(new Set(reasons))
})

const pairPreviewEntries = computed(() => {
  const enabledPairs = new Set(localPlanAnalysis.value.executablePairs)

  return ([
    'targetBaseline',
    'targetReference',
    'referenceBaseline',
    'targetReplica',
  ] as const).map((pairKey) => ({
    key: pairKey,
    enabled: enabledPairs.has(pairKey),
    label: t(`evaluation.compareConfig.pairValues.${pairKey}`),
  }))
})

const confirmDisabled = computed(() => blockingConflictMessages.value.length > 0)

function updateRole(id: string, value: string | null) {
  localEntries.value = localEntries.value.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          selectedRole: (value || undefined) as StructuredCompareRole | undefined,
        }
      : entry,
  )
}

function applyInferredRoles() {
  localEntries.value = localEntries.value.map((entry) => ({
    ...entry,
    selectedRole: localEffectiveRoles.value[entry.id],
  }))
}

function clearRoles() {
  localEntries.value = localEntries.value.map((entry) => ({
    ...entry,
    selectedRole: undefined,
  }))
}

function getRoleSelectPlaceholder(entry: LocalEntry): string {
  const effectiveRole = localEffectiveRoles.value[entry.id]
  if (effectiveRole && !entry.selectedRole) {
    return t('evaluation.compareConfig.keepAutoWithRole', {
      role: roleLabel(effectiveRole),
    })
  }

  return t('evaluation.compareConfig.keepAuto')
}

function getReasonLabel(reason: StructuredCompareBlockingReason): string {
  return t(`evaluation.compareConfig.reasonValues.${reason}`)
}

function getWarningLabel(reason: StructuredCompareWarningReason): string {
  return t(`evaluation.compareConfig.reasonValues.${reason}`)
}

function handleCancel() {
  show.value = false
}

function handleConfirm() {
  if (confirmDisabled.value) {
    return
  }

  const roles = Object.fromEntries(
    localEntries.value
      .filter((entry) => !!entry.selectedRole)
      .map((entry) => [entry.id, entry.selectedRole as StructuredCompareRole]),
  )

  emit('confirm', roles)
}
</script>

<style scoped>
.compare-role-config__preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  background: var(--n-color-embedded);
}

.compare-role-config__preview-header {
  display: grid;
  grid-template-columns: minmax(0, 180px) minmax(0, 1fr);
  gap: 12px;
}

.compare-role-config__preview-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compare-role-config__pair-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.compare-role-config__preview-reasons {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.compare-role-config__preview-reason,
.compare-role-config__alert-line {
  line-height: 1.5;
}

.compare-role-config__table {
  display: grid;
  gap: 10px;
}

.compare-role-config__row {
  display: grid;
  grid-template-columns: minmax(120px, 160px) minmax(0, 1fr) minmax(180px, 220px);
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
}

.compare-role-config__slot {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.compare-role-config__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

@media (max-width: 720px) {
  .compare-role-config__preview-header {
    grid-template-columns: 1fr;
  }

  .compare-role-config__row {
    grid-template-columns: 1fr;
  }
}
</style>
