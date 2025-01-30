# 项目地图

## 源代码目录 (src/)
- `src/api/` - API接口封装目录
  - `llm.js` - LLM API调用封装
- `src/composables/` - Vue组合式函数目录
- `src/prompts/` - 提示词模板目录
- `src/components/` - Vue组件目录
  - `PromptPanel.vue` - 提示词输入和优化面板
  - `InputPanel.vue` - 输入面板组件
  - `OutputPanel.vue` - 输出面板组件
  - `ModelConfig.vue` - 模型配置组件
  - `ThemeToggle.vue` - 主题切换组件
  - `LoadingSpinner.vue` - 加载动画组件
- `src/services/` - 业务逻辑服务目录
  - `llm/` - LLM服务目录
    - `service.ts` - LLM核心服务
    - `errors.ts` - 错误处理常量
    - `types.ts` - 类型定义
  - `model/` - 模型配置管理目录
  - `prompt/` - 提示词服务目录
  - `promptManager.js` - 提示词管理服务
  - `themeManager.js` - 主题管理服务
- `src/config/` - 配置文件目录
  - `models.js` - LLM模型配置
  - `theme.js` - 主题配置
  - `prompts.js` - 提示词模板配置
- `src/App.vue` - 根组件
- `src/main.js` - 应用入口文件
- `src/style.css` - 全局样式文件

## 测试目录 (tests/)
- `tests/setup.js` - 测试环境配置文件
- `tests/unit/` - 单元测试
  - `components/` - 组件测试
  - `services/` - 服务测试
  - `utils/` - 工具函数测试
- `tests/integration/` - 集成测试
  - `services/llm/` - LLM服务测试
    - `common.test.js` - 通用测试
    - `gemini.test.js` - Gemini API测试
    - `deepseek.test.js` - DeepSeek API测试
    - `custom.test.js` - 自定义模型测试

## 文档目录 (docs/)
- `prd.md` - 产品需求文档
- `app-flow.md` - 应用流程
- `tech-stack.md` - 技术栈
- `file-structure.md` - 文件结构
- `frontend-guidelines.md` - 前端指南
- `ui-guidelines.md` - UI设计指南
- `testing-guidelines.md` - 测试指南

## 配置文件
- `.env.example` - 环境变量示例
- `.env.local` - 本地环境变量
- `package.json` - 项目配置
- `vite.config.js` - Vite配置
- `tailwind.config.js` - TailwindCSS配置
- `vitest.config.js` - Vitest测试配置
- `.cursorrules` - Cursor IDE配置
- `.windsurfrules` - Windsurf IDE配置
- `.gitignore` - Git忽略配置
- `postcss.config.js` - PostCSS配置
- `index.html` - 项目入口HTML文件

## IDE配置
- `.vscode/` - VSCode配置目录

## 工作区文件
- `README.md` - 项目说明文档
- `scratchpad.md` - 开发笔记和任务规划
- `experience.md` - 项目经验总结
- `cursor_tips.md` - AI辅助开发指南 