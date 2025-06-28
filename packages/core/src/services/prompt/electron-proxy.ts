import {
  IPromptService,
  OptimizationRequest,
  StreamHandlers,
} from './types';
import { PromptRecord } from '../history/types';

// Helper function to check if running in Electron renderer process
function isRunningInElectron(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).electronAPI !== 'undefined';
}

/**
 * Proxy for using PromptService in Electron renderer process.
 * It communicates with the main process via IPC.
 */
export class ElectronPromptServiceProxy implements IPromptService {
  private get api() {
    if (!isRunningInElectron() || !(window as any).electronAPI?.prompt) {
      // The `prompt` property will be added to the electronAPI in the desktop package's preload script.
      // This error indicates a potential mismatch between frontend expectations and the preload script's exposure.
      throw new Error('Electron Prompt API is not available in this environment.');
    }
    return (window as any).electronAPI.prompt;
  }

  async optimizePrompt(request: OptimizationRequest): Promise<string> {
    return this.api.optimizePrompt(request);
  }

  async iteratePrompt(
    originalPrompt: string,
    lastOptimizedPrompt: string,
    iterateInput: string,
    modelKey: string,
    templateId?: string
  ): Promise<string> {
    return this.api.iteratePrompt(originalPrompt, lastOptimizedPrompt, iterateInput, modelKey, templateId);
  }

  async testPrompt(
    systemPrompt: string,
    userPrompt: string,
    modelKey: string
  ): Promise<string> {
    return this.api.testPrompt(systemPrompt, userPrompt, modelKey);
  }

  async getHistory(): Promise<PromptRecord[]> {
    return this.api.getHistory();
  }

  async getIterationChain(recordId: string): Promise<PromptRecord[]> {
    return this.api.getIterationChain(recordId);
  }

  // Streaming methods are complex over IPC and are not implemented in the proxy for now.
  // They would require event-based communication rather than a simple invoke/handle.
  async optimizePromptStream(_request: OptimizationRequest, callbacks: StreamHandlers): Promise<void> {
    console.warn('optimizePromptStream is not implemented for Electron proxy.');
    // Fallback or throw error
    callbacks.onComplete();
  }

  async iteratePromptStream(
    _originalPrompt: string,
    _lastOptimizedPrompt: string,
    _iterateInput: string,
    _modelKey: string,
    handlers: StreamHandlers,
    _templateId: string
  ): Promise<void> {
    console.warn('iteratePromptStream is not implemented for Electron proxy.');
    handlers.onComplete();
  }

  async testPromptStream(
    _systemPrompt: string,
    _userPrompt: string,
    _modelKey: string,
    callbacks: StreamHandlers
  ): Promise<void> {
    console.warn('testPromptStream is not implemented for Electron proxy.');
    callbacks.onComplete();
  }
} 