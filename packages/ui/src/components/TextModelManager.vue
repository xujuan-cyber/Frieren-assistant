<template>
  <div class="text-model-manager">
    <TextModelList
      :models="manager.models.value"
      :is-testing-connection-for="isTestingConnectionFor"
      :is-default-model="manager.isDefaultModel"
      @test="handleTestConnection"
      @edit="handleEditModel"
      @enable="handleEnableModel"
      @disable="handleDisableModel"
      @delete="handleDeleteModel"
    />

    <TextModelEditModal
      :show="showEditModal"
      :config-id="editingModelId || ''"
      @update:show="updateEditModalVisibility"
      @saved="handleModelUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTextModelManager } from '../composables/useTextModelManager'
import TextModelList from './TextModelList.vue'
import TextModelEditModal from './TextModelEditModal.vue'

const emit = defineEmits(['modelsUpdated'])
const { t } = useI18n()
const manager = useTextModelManager()
provide('textModelManager', manager)

const showEditModal = ref(false)
const editingModelId = ref<string | null>(null)
const isTestingConnectionFor = (id: string) => !!manager.testingConnections.value[id]
const handleModelUpdated = async (id?: string) => {
  await manager.loadModels()
  const targetId = id || manager.models.value[0]?.id
  if (targetId) {
    emit('modelsUpdated', targetId)
  }
}

const handleTestConnection = async (id: string) => {
  await manager.testConfigConnection(id)
}

const handleEditModel = async (id: string) => {
  await manager.prepareForEdit(id)
  editingModelId.value = id
  showEditModal.value = true
}

const updateEditModalVisibility = (value: boolean) => {
  showEditModal.value = value
  if (!value) {
    editingModelId.value = null
    manager.resetFormState()
  }
}

const handleEnableModel = async (id: string) => {
  await manager.enableModel(id)
  emit('modelsUpdated', id)
}

const handleDisableModel = async (id: string) => {
  await manager.disableModel(id)
  emit('modelsUpdated', id)
}

const handleDeleteModel = async (id: string) => {
  if (confirm(t('modelManager.deleteConfirm'))) {
    await manager.deleteModel(id)
    const firstId = manager.models.value[0]?.id
    if (firstId) {
      emit('modelsUpdated', firstId)
    }
  }
}

const openAddModal = async () => {
  await manager.prepareForCreate()
  editingModelId.value = null
  showEditModal.value = true
}

defineExpose({
  openAddModal,
  refresh: manager.loadModels
})

onMounted(async () => {
  await manager.loadProviders()
  await manager.loadModels()
  const firstId = manager.models.value[0]?.id
  if (firstId) {
    emit('modelsUpdated', firstId)
  }
})
</script>

<style scoped>
.text-model-manager {
  width: 100%;
}
</style>
