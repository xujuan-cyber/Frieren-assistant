import { ref } from 'vue'
import type { Ref } from 'vue'

export interface ModelSelectorsHooks {
  optimizeModelSelect: Ref<any>
  testModelSelect: Ref<any>
}

export function useModelSelectors(): ModelSelectorsHooks {
  const optimizeModelSelect = ref(null)
  const testModelSelect = ref(null)

  return {
    optimizeModelSelect,
    testModelSelect
  }
} 