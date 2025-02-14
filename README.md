# Prompt Optimizer (提示词优化器)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flinshenkx%2Fprompt-optimizer&env=VITE_GEMINI_API_KEY,VITE_DEEPSEEK_API_KEY&envDescription=API密钥配置&envLink=https%3A%2F%2Fgithub.com%2Flinshenkx%2Fprompt-optimizer%23%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F)

一个基于LangChain的提示词优化工具，帮助你优化和改进AI提示词。使用Monorepo架构，支持Web应用和Chrome插件（开发中）。

## 功能特点

### 核心功能
- 🚀 多包架构，支持跨平台复用
- 🤖 集成LangChain，支持多个LLM模型
- 💾 本地存储历史记录和设置
- 🔑 API密钥安全加密存储
- 📱 响应式设计，支持移动端
- ✨ 优雅的动画和交互效果
- 🌈 深色/浅色主题切换
- 📋 一键复制优化结果
- 🔄 历史记录管理
- 📝 提示词模板管理
- 🌊 流式响应支持
- 🎯 精确的错误处理
- 🧩 Chrome插件支持（开发中）

### LLM支持
- 🤖 Gemini Pro
- 🔮 DeepSeek
- 🌟 OpenAI
- ⚡ 自定义API支持

## 快速开始

### 环境要求
- Node.js >= 16
- pnpm >= 8

### 安装
```bash
# 安装pnpm（如果未安装）
npm install -g pnpm

# 克隆仓库
git clone https://github.com/your-username/prompt-optimizer.git
cd prompt-optimizer

# 安装依赖
pnpm install
```

### 环境变量配置
1. 在项目根目录创建`.env.local`文件
2. 添加以下配置：
```env
# Gemini API配置
VITE_GEMINI_API_KEY=your_gemini_api_key

# DeepSeek API配置
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key

# 自定义API配置（可选）
VITE_CUSTOM_API_KEY=your_custom_api_key
VITE_CUSTOM_API_BASE_URL=your_custom_api_base_url
VITE_CUSTOM_API_MODEL=your_custom_model_name
```

### 开发命令

所有命令都可以在项目根目录下执行：

#### 核心包命令
```bash
# 开发模式
pnpm --filter core dev        # 或简写：pnpm -F core dev
                             # 开发核心包（监听模式）

# 构建
pnpm -F core build           # 构建核心包

# 测试
pnpm -F core test           # 运行核心包测试
pnpm -F core test:watch     # 监听模式运行测试
pnpm -F core test:coverage  # 运行测试覆盖率报告
```

#### Web应用命令
```bash
# 开发模式
pnpm dev:web               # 开发Web应用（根目录已配置的快捷命令）
# 或者使用
pnpm -F web dev           # 通过filter参数执行

# 构建
pnpm build:web            # 构建Web应用（根目录已配置的快捷命令）
# 或者使用
pnpm -F web build        # 通过filter参数执行

# 测试
pnpm -F web test         # 运行Web应用测试
```

#### 浏览器扩展命令
```bash
# 开发模式
pnpm dev:extension        # 开发浏览器扩展（根目录已配置的快捷命令）
# 或者使用
pnpm -F extension dev    # 通过filter参数执行

# 构建
pnpm build:extension     # 构建浏览器扩展（根目录已配置的快捷命令）
# 或者使用
pnpm -F extension build # 通过filter参数执行
```

#### 全局命令
```bash
pnpm test               # 运行所有包的测试
```

## 项目结构
```
prompt-optimizer/
├── packages/          # 项目包
│   ├── core/         # 核心功能包
│   │   ├── src/      # 核心源代码
│   │   └── tests/    # 核心包测试
│   ├── web/          # Web版本
│   │   ├── src/      # Web源代码
│   │   └── tests/    # Web测试
│   └── extension/    # Chrome插件（开发中）
├── docs/            # 项目文档
└── tools/           # 工具脚本
```

## 核心包功能 (@prompt-optimizer/core)

### 服务模块
- **LLM服务**: 统一的模型调用接口
- **模型管理**: 多模型配置和管理
- **提示词服务**: 提示词处理和优化
- **模板服务**: 提示词模板管理
- **历史记录**: 优化记录管理

### 特性
- TypeScript支持
- LangChain集成
- 统一错误处理
- 流式响应支持
- 完整类型定义

## Web应用功能 (@prompt-optimizer/web)

### 界面功能
- 提示词输入和优化
- 模型配置管理
- 模板管理
- 历史记录查看
- 主题切换
- 响应式设计

### 技术特点
- Vue 3组件
- TailwindCSS样式
- 流式响应UI
- 优雅动画效果

## 文档

### 开发文档
- [项目进度](docs/progress.md)
- [架构设计](docs/core-guidelines.md)
- [前端指南](docs/frontend-guidelines.md)
- [API文档](docs/api.md)

### 使用文档
- [快速开始](docs/quickstart.md)
- [配置指南](docs/configuration.md)
- [最佳实践](docs/best-practices.md)
- [常见问题](docs/faq.md)

## 技术栈

### 核心技术
- TypeScript 5.x
- Vue 3.4.x
- Vite 5.x
- LangChain
- TailwindCSS 3.4.x

### 开发工具
- pnpm
- Vitest
- ESLint
- Prettier
- TypeDoc

## 贡献指南

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交Pull Request

## 开源协议

本项目采用MIT协议 - 查看[LICENSE](LICENSE)文件了解更多详情。

## 联系方式

如有问题或建议，欢迎：
- 提交Issue
- 发起Pull Request
- 参与讨论