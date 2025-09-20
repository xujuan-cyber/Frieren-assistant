import { computed, ref, type Ref, inject } from 'vue'
import type { AppServices } from '../types/services'
import type { ImageRequest, ImageResult, ImageModelConfig } from '@prompt-optimizer/core'

export function useImageGeneration() {
  const services = inject<Ref<AppServices | null>>('services')
  const generating = ref(false)
  const progress = ref<string | number | { phase: string; progress: number }>('idle')
  const error = ref<string>('')
  const result = ref<ImageResult | null>(null)

  const imageModels = ref<(ImageModelConfig & { key: string })[]>([])
  
  const loadImageModels = async () => {
    if (!services?.value?.imageModelManager) {
      imageModels.value = []
      return
    }
    try {
      const models = await services.value.imageModelManager.getEnabledModels()
      imageModels.value = models
    } catch (error) {
      console.error('Failed to load image models:', error)
      imageModels.value = []
    }
  }

  const generate = async (modelKey: string, req: ImageRequest) => {
    if (!services?.value?.imageService) throw new Error('Image service not available')
    error.value = ''
    result.value = null
    generating.value = true
    progress.value = 'queued'
    try {
      const res = await services.value.imageService.generate(req, modelKey, {
        onProgress: (s: string | number) => { progress.value = s },
      })
      result.value = res
      progress.value = 'done'
    } catch (e: any) {
      error.value = e?.message || String(e)
      progress.value = 'error'
      throw e
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

