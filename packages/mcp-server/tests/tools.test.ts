/**
 * MCP Tools 基础测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CoreServicesManager } from '../src/adapters/core-services.js';
import { ParameterAdapter } from '../src/adapters/parameter-adapter.js';
import { MCPErrorHandler } from '../src/adapters/error-handler.js';

describe('MCP Server Tools', () => {
  let coreServices: CoreServicesManager;

  beforeAll(async () => {
    // 设置测试环境变量
    process.env.MCP_DEFAULT_MODEL_API_KEY = 'test-key';
    process.env.MCP_DEFAULT_MODEL_PROVIDER = 'openai';
    process.env.MCP_DEFAULT_MODEL_NAME = 'gpt-4';

    coreServices = CoreServicesManager.getInstance();
    
    // 注意：这里只测试初始化，不测试实际的 LLM 调用
    // 实际的 LLM 调用需要真实的 API 密钥
  });

  describe('ParameterAdapter', () => {
    it('应该正确验证提示词输入', () => {
      expect(() => ParameterAdapter.validatePromptInput('有效的提示词')).not.toThrow();
      expect(() => ParameterAdapter.validatePromptInput('')).toThrow('提示词必须是非空字符串');
      expect(() => ParameterAdapter.validatePromptInput('   ')).toThrow('提示词不能为空或只包含空白字符');
      expect(() => ParameterAdapter.validatePromptInput('a'.repeat(60000))).toThrow('提示词过长');
    });

    it('应该正确验证需求输入', () => {
      expect(() => ParameterAdapter.validateRequirementsInput('有效的需求描述')).not.toThrow();
      expect(() => ParameterAdapter.validateRequirementsInput('')).toThrow('需求描述必须是非空字符串');
      expect(() => ParameterAdapter.validateRequirementsInput('   ')).toThrow('需求描述不能为空或只包含空白字符');
      expect(() => ParameterAdapter.validateRequirementsInput('a'.repeat(15000))).toThrow('需求描述过长');
    });

    it('应该正确验证模板输入', () => {
      expect(() => ParameterAdapter.validateTemplateInput('valid-template')).not.toThrow();
      expect(() => ParameterAdapter.validateTemplateInput(undefined)).not.toThrow();
      expect(() => ParameterAdapter.validateTemplateInput('')).toThrow('如果提供模板，不能为空');
      expect(() => ParameterAdapter.validateTemplateInput('   ')).toThrow('如果提供模板，不能为空');
    });
  });

  describe('MCPErrorHandler', () => {
    it('应该正确转换验证错误', () => {
      const error = new Error('提示词必须是非空字符串');
      const mcpError = MCPErrorHandler.convertCoreError(error);

      expect(mcpError.code).toBe(-32000); // INTERNAL_ERROR (默认错误码)
      expect(mcpError.message).toContain('提示词必须是非空字符串');
    });

    it('应该正确转换优化错误', () => {
      const error = new Error('优化失败');
      error.name = 'OptimizationError';
      const mcpError = MCPErrorHandler.convertCoreError(error);

      expect(mcpError.code).toBe(-32001); // PROMPT_OPTIMIZATION_FAILED
      expect(mcpError.message).toContain('Prompt optimization failed');
    });

    it('应该将未知错误处理为内部错误', () => {
      const error = new Error('未知错误');
      const mcpError = MCPErrorHandler.convertCoreError(error);

      expect(mcpError.code).toBe(-32000); // INTERNAL_ERROR
      expect(mcpError.message).toContain('Internal error');
    });

    it('应该正确格式化错误信息', () => {
      const error = new Error('测试错误');
      error.name = 'TestError';
      const formatted = MCPErrorHandler.formatError(error);

      expect(formatted).toBe('TestError: 测试错误');
    });
  });
});
