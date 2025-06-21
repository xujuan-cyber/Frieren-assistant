import { describe, it } from 'vitest';
import { createPromptService } from '../../src/services/prompt/service';
import { modelManager } from '../../src/services/model/manager';
import { templateManager } from '../../src/services/template/manager';

describe('User Optimize Templates Comparison Test', () => {
  it('should compare all 3 core user-optimize templates with real API', async () => {
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

    // 测试输入：一个不同场景的模糊、有问题的用户提示词
    const testInput = '帮我学一下Python编程，想要快速上手，最好能做点实际项目，不要太难的';

    console.log(`\n🧪 用户优化提示词模板对比测试`);
    console.log(`🤖 使用模型: ${availableModel.name} (${availableModel.provider})`);
    console.log('='.repeat(80));
    console.log(`📝 测试输入（模糊的用户提示词）:`);
    console.log(`"${testInput}"`);
    console.log('='.repeat(80));

    // 用户优化模板列表 (优化后的3个核心模板，专业优化作为默认)
    const userOptimizeTemplates = [
      { id: 'user-prompt-professional', name: '专业优化' },
      { id: 'user-prompt-basic', name: '基础优化' },
      { id: 'user-prompt-planning', name: '任务规划' }
    ];

    const results: Array<{ template: string; result: string; error?: string }> = [];

    // 逐个测试每个模板
    for (const template of userOptimizeTemplates) {
      console.log(`\n🔍 测试模板: ${template.name} (${template.id})`);
      console.log('-'.repeat(60));
      
      try {
        const result = await promptService.optimizePrompt({
          optimizationMode: 'user',
          targetPrompt: testInput,
          templateId: template.id,
          modelKey: availableModel.key
        });

        console.log('✅ 优化结果:');
        console.log(result);
        
        results.push({
          template: `${template.name} (${template.id})`,
          result: result
        });
        
      } catch (error) {
        console.error(`❌ ${template.name} 优化失败:`, error.message);
        results.push({
          template: `${template.name} (${template.id})`,
          result: '',
          error: error.message
        });
      }
      
      console.log('\n' + '='.repeat(80));
      
      // 添加延迟避免API限制
      if (template.id !== 'user-prompt-steps') {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n🎯 实际测试结果:');
    results.forEach(result => {
      console.log(`\n• ${result.template}:`);
      if (result.error) {
        console.log(`  ❌ 失败: ${result.error}`);
      } else {
        console.log(`  ✅ 成功: ${result.result.substring(0, 100)}...`);
      }
    });

    console.log('\n✅ 对比测试完成');
  }, 30000);

  // 新增测试用例：商业场景
  it('should test business scenario optimization', async () => {
    const hasApiKey = process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY || 
                     process.env.OPENAI_API_KEY || process.env.CUSTOM_API_KEY ||
                     process.env.VITE_GEMINI_API_KEY || process.env.VITE_DEEPSEEK_API_KEY || 
                     process.env.VITE_OPENAI_API_KEY || process.env.VITE_CUSTOM_API_KEY;
    
    if (!hasApiKey) {
      console.log('跳过真实API测试 - 未设置API密钥');
      return;
    }

    const promptService = createPromptService();
    await templateManager.ensureInitialized();
    const models = await modelManager.getAllModels();
    const availableModel = models.find(m => m.enabled);
    
    if (!availableModel) {
      console.log('跳过真实API测试 - 没有可用的模型');
      return;
    }

    const testInput = "我们公司想要提升员工满意度，现在不太好，希望能有一些改进措施，最好是成本不高的那种";
    
    console.log('\n🧪 商业场景测试');
    console.log(`🤖 使用模型: ${availableModel.name} (${availableModel.provider})`);
    console.log('='.repeat(80));
    console.log(`📝 测试输入: "${testInput}"`);
    console.log('='.repeat(80));

    const templates = ['user-prompt-professional', 'user-prompt-basic', 'user-prompt-planning'];
    const templateNames = ['专业优化', '基础优化', '任务规划'];

    for (let i = 0; i < templates.length; i++) {
      console.log(`\n🔍 测试模板: ${templateNames[i]} (${templates[i]})`);
      console.log('-'.repeat(60));
      
      try {
        const result = await promptService.optimizePrompt({
          optimizationMode: 'user',
          targetPrompt: testInput,
          templateId: templates[i],
          modelKey: availableModel.key
        });
        
        console.log('✅ 优化结果:');
        console.log(result);
        console.log('='.repeat(80));
      } catch (error) {
        console.error(`❌ 优化失败: ${error.message}`);
      }
    }
  }, 30000);

  // 新增测试用例：技术问题
  it('should test technical problem optimization', async () => {
    const hasApiKey = process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY || 
                     process.env.OPENAI_API_KEY || process.env.CUSTOM_API_KEY ||
                     process.env.VITE_GEMINI_API_KEY || process.env.VITE_DEEPSEEK_API_KEY || 
                     process.env.VITE_OPENAI_API_KEY || process.env.VITE_CUSTOM_API_KEY;
    
    if (!hasApiKey) {
      console.log('跳过真实API测试 - 未设置API密钥');
      return;
    }

    const promptService = createPromptService();
    await templateManager.ensureInitialized();
    const models = await modelManager.getAllModels();
    const availableModel = models.find(m => m.enabled);
    
    if (!availableModel) {
      console.log('跳过真实API测试 - 没有可用的模型');
      return;
    }

    const testInput = "网站有时候很慢，用户体验不好，想优化一下性能，但是不知道从哪里入手";
    
    console.log('\n🧪 技术问题测试');
    console.log(`🤖 使用模型: ${availableModel.name} (${availableModel.provider})`);
    console.log('='.repeat(80));
    console.log(`📝 测试输入: "${testInput}"`);
    console.log('='.repeat(80));

    const templates = ['user-prompt-professional', 'user-prompt-basic', 'user-prompt-planning'];
    const templateNames = ['专业优化', '基础优化', '任务规划'];

    for (let i = 0; i < templates.length; i++) {
      console.log(`\n🔍 测试模板: ${templateNames[i]} (${templates[i]})`);
      console.log('-'.repeat(60));
      
      try {
        const result = await promptService.optimizePrompt({
          optimizationMode: 'user',
          targetPrompt: testInput,
          templateId: templates[i],
          modelKey: availableModel.key
        });
        
        console.log('✅ 优化结果:');
        console.log(result);
        console.log('='.repeat(80));
      } catch (error) {
        console.error(`❌ 优化失败: ${error.message}`);
      }
    }
  }, 30000);

  // 新增测试用例：生活场景
  it('should test lifestyle scenario optimization', async () => {
    const hasApiKey = process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY || 
                     process.env.OPENAI_API_KEY || process.env.CUSTOM_API_KEY ||
                     process.env.VITE_GEMINI_API_KEY || process.env.VITE_DEEPSEEK_API_KEY || 
                     process.env.VITE_OPENAI_API_KEY || process.env.VITE_CUSTOM_API_KEY;
    
    if (!hasApiKey) {
      console.log('跳过真实API测试 - 未设置API密钥');
      return;
    }

    const promptService = createPromptService();
    await templateManager.ensureInitialized();
    const models = await modelManager.getAllModels();
    const availableModel = models.find(m => m.enabled);
    
    if (!availableModel) {
      console.log('跳过真实API测试 - 没有可用的模型');
      return;
    }

    const testInput = "想要减肥，但是总是坚持不下来，有什么好办法吗，不要太痛苦的";
    
    console.log('\n🧪 生活场景测试');
    console.log(`🤖 使用模型: ${availableModel.name} (${availableModel.provider})`);
    console.log('='.repeat(80));
    console.log(`📝 测试输入: "${testInput}"`);
    console.log('='.repeat(80));

    const templates = ['user-prompt-professional', 'user-prompt-basic', 'user-prompt-planning'];
    const templateNames = ['专业优化', '基础优化', '任务规划'];

    for (let i = 0; i < templates.length; i++) {
      console.log(`\n🔍 测试模板: ${templateNames[i]} (${templates[i]})`);
      console.log('-'.repeat(60));
      
      try {
        const result = await promptService.optimizePrompt({
          optimizationMode: 'user',
          targetPrompt: testInput,
          templateId: templates[i],
          modelKey: availableModel.key
        });
        
        console.log('✅ 优化结果:');
        console.log(result);
        console.log('='.repeat(80));
      } catch (error) {
        console.error(`❌ 优化失败: ${error.message}`);
      }
    }
  }, 30000);

  // 新增英文版测试用例
  it('should test English templates fix', async () => {
    const hasApiKey = process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY || 
                     process.env.OPENAI_API_KEY || process.env.CUSTOM_API_KEY ||
                     process.env.VITE_GEMINI_API_KEY || process.env.VITE_DEEPSEEK_API_KEY || 
                     process.env.VITE_OPENAI_API_KEY || process.env.VITE_CUSTOM_API_KEY;
    
    if (!hasApiKey) {
      console.log('跳过真实API测试 - 未设置API密钥');
      return;
    }

    const promptService = createPromptService();
    await templateManager.ensureInitialized();
    
    // 切换到英文语言
    await templateManager.changeBuiltinTemplateLanguage('en-US');
    
    const models = await modelManager.getAllModels();
    const availableModel = models.find(m => m.enabled);
    
    if (!availableModel) {
      console.log('❌ No available model found');
      return;
    }

    console.log('\n🧪 English Templates Fix Test');
    console.log(`🤖 Using model: ${availableModel.name} (${availableModel.provider})`);
    console.log('================================================================================');
    console.log('📝 Test input: "I want to lose weight but always can\'t stick to it"');
    console.log('================================================================================');

    const testInput = "I want to lose weight but always can't stick to it, any good methods that are not too painful?";
    const templates = ['user-prompt-basic', 'user-prompt-professional', 'user-prompt-planning'];
    const templateNames = ['Basic Optimization', 'Professional Optimization', 'Task Planning'];

    for (let i = 0; i < templates.length; i++) {
      console.log(`\n🔍 Testing: ${templateNames[i]} (${templates[i]})`);
      console.log('------------------------------------------------------------');
      
      try {
        const result = await promptService.optimizePrompt({
          optimizationMode: 'user',
          targetPrompt: testInput,
          templateId: templates[i],
          modelKey: availableModel.key
        });
        
        console.log('✅ Optimization result:');
        console.log(result);
        console.log('================================================================================');
      } catch (error) {
        console.error(`❌ Optimization failed: ${error.message}`);
      }
    }
    
    // 切换回中文
    await templateManager.changeBuiltinTemplateLanguage('zh-CN');
    console.log('\n✅ English template fix test completed');
  }, 30000);
}); 