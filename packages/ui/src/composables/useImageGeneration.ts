import { computed, ref, inject, type Ref } from 'vue'

import type { AppServices } from '../types/services'
import type { ImageRequest, ImageResult, ImageModelConfig } from '@prompt-optimizer/core'

export function useImageGeneration() {
  const services = inject<Ref<AppServices | null>>('services')
  const generating = ref(false)
  const progress = ref<string | number | { phase: string; progress: number }>('idle')
  const error = ref<string>('')
  const result = ref<ImageResult | null>(null)

  const imageModels = ref<ImageModelConfig[]>([])

  const loadImageModels = async () => {
    if (!services?.value?.imageModelManager) {
      imageModels.value = []
      return
    }
    try {
      // 直接使用 getEnabledConfigs 获取自包含的配置数据
      const enabledConfigs = await services.value.imageModelManager.getEnabledConfigs()
      imageModels.value = enabledConfigs
    } catch (error) {
      console.error('Failed to load image models:', error)
      imageModels.value = []
    }
  }

  const generate = async (req: ImageRequest) => {
    if (!services?.value?.imageService) throw new Error('Image service not available')
    error.value = ''
    result.value = null
    generating.value = true
    progress.value = 'queued'
    try {
      const res = await services.value.imageService.generate(req)
      result.value = res
      progress.value = 'done'
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      error.value = err.message
      progress.value = 'error'
      throw err
    } finally {
      generating.value = false
    }
  }

  return {
    services,
    imageModels,
    generating,
    progress,
    error,
    result,
    generate,
    loadImageModels
  }
}

