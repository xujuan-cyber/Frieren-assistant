# 项目地图

## 源代码目录 (src/)
- `src/api/` - API接口封装目录
  - `llm.js` - LLM API调用封装
- `src/assets/` - 静态资源目录
- `src/components/` - Vue组件目录
  - `PromptPanel.vue` - 提示词输入和优化面板
  - `InputPanel.vue` - 输入面板组件
  - `OutputPanel.vue` - 输出面板组件
- `src/services/` - 业务逻辑服务目录
  - `llm.js` - LLM服务实现
- `src/config/` - 配置文件目录
  - `models.js` - LLM模型配置
- `src/App.vue` - 根组件
- `src/main.js` - 应用入口文件
- `src/style.css` - 全局样式文件

## 测试目录 (tests/)
- `tests/unit/` - 单元测试
- `tests/integration/` - 集成测试
  - `services/llm/` - LLM服务测试
    - `common.test.js` - 通用测试
    - `gemini.test.js` - Gemini API测试
    - `deepseek.test.js` - DeepSeek API测试
    - `custom.test.js` - 自定义模型测试

## 文档目录 (docs/)
- `prd.md` - 产品需求文档
- `app-flow.md` - 应用流程
- `backend-structure.md` - 后端结构
- `frontend-guidelines.md` - 前端指南
- `tech-stack.md` - 技术栈
- `file-structure.md` - 文件结构

## 配置文件
- `.env.example` - 环境变量示例
- `.env.local` - 本地环境变量
- `package.json` - 项目配置
- `vite.config.js` - Vite配置
- `tailwind.config.js` - TailwindCSS配置
- `vitest.config.js` - Vitest测试配置
- `.cursorrules` - Cursor IDE配置
- `.gitignore` - Git忽略配置

## 工作区文件
- `scratchpad.md` - 开发笔记和任务规划
- `experience.md` - 项目经验总结
- `cursor_tips.md` - AI辅助开发指南 