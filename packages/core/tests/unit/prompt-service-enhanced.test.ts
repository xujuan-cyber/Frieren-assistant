import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PromptService } from '../../src/services/prompt/service'
import type { OptimizationRequest } from '../../src/services/prompt/types'

describe('PromptService Enhanced Features', () => {
  let promptService: PromptService
  let mockModelManager: any
  let mockLLMService: any
  let mockTemplateManager: any
  let mockHistoryManager: any

  beforeEach(() => {
    // Setup mocks
    mockModelManager = {
      getModel: vi.fn().mockResolvedValue({ id: 'test-model' })
    }
    
    mockLLMService = {
      sendMessage: vi.fn().mockResolvedValue('optimized result'),
      sendMessageStream: vi.fn()
    }
    
    mockTemplateManager = {
      getTemplate: vi.fn().mockImplementation((id: string) => {
        // Return null for non-existent templates
        if (id === 'non-existent-template') {
          return null
        }
        // Return valid template for existing IDs
        return {
          id: id,
          content: 'test template content {{originalPrompt}}',
          metadata: { promptType: 'system' }
        }
      }),
      listTemplatesByType: vi.fn().mockReturnValue([
        {
          id: 'user-prompt-optimize',
          content: 'user prompt template {{originalPrompt}}',
          metadata: { promptType: 'user', templateType: 'optimize' }
        }
      ])
    }
    
    mockHistoryManager = {
      addRecord: vi.fn().mockResolvedValue(undefined)
    }

    promptService = new PromptService(
      mockModelManager,
      mockLLMService,
      mockTemplateManager,
      mockHistoryManager
    )
  })

  describe('optimizePrompt', () => {
    it('should optimize system prompt successfully', async () => {
      const request: OptimizationRequest = {
        promptType: 'system',
        targetPrompt: 'test system prompt',
        modelKey: 'test-model',
        templateId: 'test-template'
      }

      const result = await promptService.optimizePrompt(request)

      expect(result).toBe('optimized result')
      expect(mockLLMService.sendMessage).toHaveBeenCalled()
      expect(mockHistoryManager.addRecord).toHaveBeenCalled()
    })

    it('should optimize user prompt successfully', async () => {
      const request: OptimizationRequest = {
        promptType: 'user',
        targetPrompt: 'test user prompt',
        modelKey: 'test-model',
        templateId: 'test-template'
      }

      const result = await promptService.optimizePrompt(request)

      expect(result).toBe('optimized result')
      expect(mockLLMService.sendMessage).toHaveBeenCalled()
    })

    it('should optimize user prompt without context successfully', async () => {
      const request: OptimizationRequest = {
        promptType: 'user',
        targetPrompt: 'test user prompt',
        modelKey: 'test-model'
      }

      const result = await promptService.optimizePrompt(request)

      expect(result).toBe('optimized result')
      expect(mockLLMService.sendMessage).toHaveBeenCalled()
    })

    it('should throw error for empty target prompt', async () => {
      const request: OptimizationRequest = {
        promptType: 'system',
        targetPrompt: '',
        modelKey: 'test-model'
      }

      await expect(promptService.optimizePrompt(request))
        .rejects.toThrow('Target prompt is required')
    })

    it('should throw error for empty model key', async () => {
      const request: OptimizationRequest = {
        promptType: 'system',
        targetPrompt: 'test prompt',
        modelKey: ''
      }

      await expect(promptService.optimizePrompt(request))
        .rejects.toThrow('Model key is required')
    })
  })

  describe('testPrompt', () => {
    it('should test prompts with proper context', async () => {
      const result = await promptService.testPrompt(
        'system prompt',
        'user prompt',
        'test-model'
      )

      expect(result).toBe('optimized result')
      expect(mockLLMService.sendMessage).toHaveBeenCalledWith(
        [
          { role: 'system', content: 'system prompt' },
          { role: 'user', content: 'user prompt' }
        ],
        'test-model'
      )
    })

    it('should test user prompt without system prompt', async () => {
      const result = await promptService.testPrompt(
        '',
        'user prompt only',
        'test-model'
      )

      expect(result).toBe('optimized result')
      expect(mockLLMService.sendMessage).toHaveBeenCalledWith(
        [
          { role: 'user', content: 'user prompt only' }
        ],
        'test-model'
      )
    })

    it('should throw error for empty user prompt', async () => {
      await expect(promptService.testPrompt(
        'system prompt',
        '',
        'test-model'
      )).rejects.toThrow('User prompt is required')
    })

    it('should throw error for empty model key', async () => {
      await expect(promptService.testPrompt(
        'system prompt',
        'user prompt',
        ''
      )).rejects.toThrow('Model key is required')
    })
  })

  describe('optimizePromptStream', () => {
    it('should handle streaming optimization', async () => {
      const request: OptimizationRequest = {
        promptType: 'system',
        targetPrompt: 'test prompt',
        modelKey: 'test-model'
      }

      const callbacks = {
        onToken: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn()
      }

      // Mock streaming behavior
      mockLLMService.sendMessageStream.mockImplementation(async (messages, modelKey, streamCallbacks) => {
        streamCallbacks.onToken('test')
        streamCallbacks.onToken(' result')
        await streamCallbacks.onComplete()
      })

      await promptService.optimizePromptStream(request, callbacks)

      expect(callbacks.onToken).toHaveBeenCalledWith('test')
      expect(callbacks.onToken).toHaveBeenCalledWith(' result')
      expect(callbacks.onComplete).toHaveBeenCalled()
      expect(mockHistoryManager.addRecord).toHaveBeenCalled()
    })
  })

  describe('testPromptStream', () => {
    it('should handle streaming context testing', async () => {
      const callbacks = {
        onToken: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn()
      }

      mockLLMService.sendMessageStream.mockImplementation(async (messages, modelKey, streamCallbacks) => {
        streamCallbacks.onToken('test')
        streamCallbacks.onToken(' response')
        await streamCallbacks.onComplete()
      })

      await promptService.testPromptStream(
        'system prompt',
        'user prompt',
        'test-model',
        callbacks
      )

      expect(mockLLMService.sendMessageStream).toHaveBeenCalledWith(
        [
          { role: 'system', content: 'system prompt' },
          { role: 'user', content: 'user prompt' }
        ],
        'test-model',
        callbacks
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle missing model key', async () => {
      const callbacks = {
        onToken: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn()
      }

      const request: OptimizationRequest = {
        promptType: 'system',
        targetPrompt: 'Test prompt',
        templateId: 'general-optimize',
        modelKey: '' // Empty model key
      }

      await expect(
        promptService.optimizePromptStream(request, callbacks)
      ).rejects.toThrow('Model key is required')
    })

    it('should handle undefined model key', async () => {
      const callbacks = {
        onToken: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn()
      }

      const request: OptimizationRequest = {
        promptType: 'system',
        targetPrompt: 'Test prompt',
        templateId: 'general-optimize',
        modelKey: undefined as any // Undefined model key
      }

      await expect(
        promptService.optimizePromptStream(request, callbacks)
      ).rejects.toThrow('Model key is required')
    })

    it('should handle missing template gracefully', async () => {
      const callbacks = {
        onToken: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn()
      }

      const request: OptimizationRequest = {
        promptType: 'system',
        targetPrompt: 'Test prompt',
        templateId: 'non-existent-template',
        modelKey: 'test-model'
      }

      await expect(
        promptService.optimizePromptStream(request, callbacks)
      ).rejects.toThrow('Template not found or invalid')
    })
  })
})
