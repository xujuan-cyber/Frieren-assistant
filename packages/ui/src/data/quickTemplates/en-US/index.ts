import { systemPromptTemplates } from './systemPrompt'
import { userPromptTemplates } from './userPrompt'

export const enUSQuickTemplates = {
  system: systemPromptTemplates,
  user: userPromptTemplates
}

export * from './systemPrompt'
export * from './userPrompt'