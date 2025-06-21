import { describe, it } from 'vitest';
import { createPromptService } from '../../../src/services/prompt/service';
import { modelManager } from '../../../src/services/model/manager';
import { templateManager } from '../../../src/services/template/manager';

describe('Advanced Optimize Template Real API Test', () => {
  it('should optimize "你是一个诗人" with real API', async () => {
    // 检查是否有可用的API密钥
    const hasApiKey = process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY || 
                     process.env.OPENAI_API_KEY || process.env.CUSTOM_API_KEY ||
                     process.env.VITE_GEMINI_API_KEY || process.env.VITE_DEEPSEEK_API_KEY || 
                     process.env.VITE_OPENAI_API_KEY || process.env.VITE_CUSTOM_API_KEY;
    
    if (!hasApiKey) {
      console.log('跳过真实API测试 - 未设置API密钥');
      return;
    }

    // 使用默认服务
    const promptService = createPromptService();

    await templateManager.ensureInitialized();

    // 获取可用的模型（getAllModels内部会自动初始化）
    const models = await modelManager.getAllModels();
    const availableModel = models.find(m => m.enabled);
    
    if (!availableModel) {
      console.log('跳过真实API测试 - 没有可用的模型');
      return;
    }

    console.log(`\n使用模型: ${availableModel.name} (${availableModel.provider})`);
    console.log('='.repeat(50));
    console.log('原始输入: "你是一个诗人"');
    console.log('='.repeat(50));

    try {
      const result = await promptService.optimizePrompt({
        optimizationMode: 'system',
        targetPrompt: '你是一个诗人',
        templateId: 'analytical-optimize',
        modelKey: availableModel.key
      });

      console.log('优化结果:');
      console.log('-'.repeat(50));
      console.log(result);
      console.log('-'.repeat(50));
      console.log('✅ 优化成功完成');
      
    } catch (error) {
      console.error('优化失败:', error.message);
    }
  }, 30000); // 30秒超时
}); 