# Prompt Optimizer (提示词优化器)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flinshenkx%2Fprompt-optimizer&env=VITE_GEMINI_API_KEY,VITE_DEEPSEEK_API_KEY&envDescription=API密钥配置&envLink=https%3A%2F%2Fgithub.com%2Flinshenkx%2Fprompt-optimizer%23%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F)

一个纯前端的提示词优化工具，帮助你优化和改进 AI 提示词。使用 Vue 3 + Vite 构建，支持多个 LLM 模型。

## 一键部署

1. 点击上方的 "Deploy with Vercel" 按钮
2. 在Vercel中配置以下环境变量:
   - `VITE_GEMINI_API_KEY`: Gemini API密钥
     - 访问 [Google AI Studio](https://makersuite.google.com/app/apikey) 创建API密钥
   - `VITE_DEEPSEEK_API_KEY`: DeepSeek API密钥
     - 访问 [DeepSeek API](https://platform.deepseek.com/api_keys) 创建API密钥
3. 完成部署

## 功能特点

- 🚀 纯前端应用，无需后端服务
- 🤖 支持多个 LLM 模型（DeepSeek、Gemini）
- 💾 本地保存历史记录和设置
- 🔑 API 密钥安全加密存储
- 📱 响应式设计，支持移动端
- ✨ 优雅的动画和交互效果
- 🌈 深色/浅色主题切换
- 📋 一键复制优化结果
- 🔄 历史记录管理
- 📝 提示词模板管理
- 🌊 流式响应支持
- 🎯 精确的错误处理
- 🧩 Chrome浏览器插件支持（开发中）

## 项目结构

```
prompt-optimizer/
├── packages/          # 项目包
│   ├── core/         # 核心功能包
│   │   ├── src/
│   │   │   ├── services/     # 核心服务实现
│   │   │   │   ├── llm/      # LLM服务基类和接口
│   │   │   │   ├── model/    # 模型管理核心
│   │   │   │   └── template/ # 模板服务基础
│   │   │   ├── types/        # 类型定义
│   │   │   ├── errors/       # 错误处理基类
│   │   │   └── utils/        # 工具函数
│   │   └── tests/            # 核心功能测试
│   ├── web/          # Web版本
│   │   ├── src/      # 源代码
│   │   │   ├── services/  # Web平台特定服务
│   │   │   │   ├── llm/   # LLM服务实现
│   │   │   │   ├── model/ # 模型管理实现
│   │   │   │   └── template/ # 模板服务实现
│   │   │   └── components/   # Vue组件
│   │   └── tests/    # Web功能测试
│   └── extension/    # Chrome插件版本（开发中）
│       └── src/      # 插件源代码
├── docs/            # 项目文档
├── tests/           # E2E测试
└── tools/           # 工具脚本
```

### 核心包职责

#### Core包 (@prompt-optimizer/core)
- 提供核心业务逻辑实现
- 定义统一的接口规范
- 实现平台无关的基础设施
- 提供可复用的工具函数
- 统一的错误处理机制
- 类型定义和验证

#### Web包 (@prompt-optimizer/web)
- 实现Web平台UI
- 继承和实现核心服务
- 处理Web特定的功能
- 提供用户交互界面

#### 插件包 (@prompt-optimizer/extension)
- 实现Chrome插件功能
- 复用核心包的功能
- 处理插件特定的API
- 提供轻量级界面

## 功能清单

### 核心功能
- [x] 提示词输入和优化
  - [x] 多模型支持（DeepSeek、Gemini）
  - [x] 实时字数统计
  - [x] 一键清空输入
  - [x] 优化结果预览
  - [x] 提示词模板管理
  - [x] 流式响应支持
  - [x] 精确错误处理
- [ ] Chrome插件支持
  - [ ] 选中文本快捷优化
  - [ ] 右键菜单集成
  - [ ] 快捷键支持
  - [ ] 历史记录同步

### 设置与配置
- [x] API 密钥管理
  - [x] 加密存储
  - [x] 快速验证
- [x] 界面主题切换
- [x] 语言切换
- [x] 模板配置

### 历史记录
- [x] 本地历史记录
  - [x] 按时间排序
  - [x] 搜索过滤
  - [x] 一键重用
  - [x] 删除记录

### 用户体验
- [x] 操作反馈
  - [x] 复制成功提示
  - [x] 保存成功提示
  - [x] 加载动画
- [x] 移动端适配
  - [x] 响应式布局
  - [x] 触摸手势支持

## 在线体验

访问：[在线地址](#) (TODO: 添加部署后的地址)

## 本地开发

### 环境要求

- Node.js >= 16
- npm >= 7

### 安装依赖
```bash
# 安装 pnpm（如果未安装）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 环境变量

1. 在项目根目录创建 `.env.local` 文件
2. 添加以下配置（也可以在应用内配置）：
VITE_GEMINI_API_KEY=你的Gemini API密钥
VITE_DEEPSEEK_API_KEY=你的DeepSeek API密钥

### 开发命令

```bash
# 启动 web 开发服务器
pnpm dev:web

# 启动 core 包开发模式（监听修改）
pnpm dev:core

# 构建项目
pnpm build        # 构建所有包
pnpm build:core   # 只构建 core 包
pnpm build:web    # 只构建 web 包

# 运行测试
pnpm test         # 运行所有测试
pnpm test:core    # 运行 core 包测试
pnpm test:web     # 运行 web 包测试
```

### 启动开发服务器
```bash
pnpm dev:web
```
访问 `http://localhost:5173` 查看应用

### 构建生产版本
```bash
pnpm build
```

构建后的文件将生成在 `packages/web/dist` 目录下

### 发布到vercel
```bash
# 第一次使用需要安装vercel
npm install -g vercel
# 登录vercel
vercel login

# 发布项目
vercel --prod
```

## 使用说明

### Web版本
1. 首次使用需要配置 API 密钥：
   - 点击右上角的 ⚙️ 设置按钮
   - 输入相应的 API 密钥
   - 点击保存

2. 优化提示词：
   - 在输入框中输入需要优化的提示词
   - 选择想要使用的 AI 模型
   - 点击"开始优化"按钮

3. 查看历史记录：
   - 点击右上角的 📜 历史按钮
   - 可以查看之前的优化记录
   - 点击"重新使用"可以快速恢复历史提示词

### Chrome插件版本（开发中）
1. 从Chrome商店安装插件（即将上线）
2. 配置API密钥：
   - 点击插件图标
   - 进入设置页面
   - 配置相应API密钥
3. 使用方式：
   - 选中文本右键优化
   - 点击插件图标使用完整功能
   - 使用快捷键触发（可自定义）

## 技术栈

- Vue 3 - 渐进式 JavaScript 框架
- Vite - 下一代前端构建工具
- TailwindCSS - 实用优先的 CSS 框架
- Vue Composition API - 组合式 API
- LangChain - LLM应用开发框架
- LocalStorage - 本地数据持久化
- CryptoJS - 数据加密
- Markdown-it - Markdown 渲染

## 贡献指南

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解更多详情

## 联系方式

如有问题或建议，欢迎提出 Issue 或 PR。