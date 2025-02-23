# Prompt Optimizer (提示词优化器) 🚀

[![部署到 Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flinshenkx%2Fprompt-optimizer)

一个好用的提示词优化工具，帮助你优化和改进AI提示词，支持Web应用和Chrome插件。

## 📌 在线体验

- Web版：[https://prompt.always200.com](https://prompt.always200.com)
- Chrome插件：[Chrome商店地址]

![项目截图](images/screenshot.png)

## ✨ 核心特性

- 🎯 智能优化：基于LangChain的提示词优化引擎
- 🔄 多模型支持：集成Gemini、DeepSeek、OpenAI等多个模型
- 💾 本地存储：安全的历史记录和设置管理
- 📱 跨平台：支持Web应用和Chrome插件
- 🎨 优雅界面：响应式设计 + 流畅动画
- 🛡️ 安全可靠：API密钥加密存储

## 🚀 快速开始

### 方式一：使用在线版本（推荐）

1. 直接访问：[https://prompt.always200.com](https://prompt.always200.com)
2. 或者一键部署到自己的Vercel（API密钥可以稍后在设置界面配置）：
   [![部署到 Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flinshenkx%2Fprompt-optimizer)

### 方式二：安装Chrome插件
1. 从Chrome商店安装（即将上线）
2. 在任意页面右键即可使用提示词优化功能

### 方式三：本地开发（面向开发者）
如果你想参与开发，可以克隆源码到本地：

环境要求：
- Node.js >= 16
- pnpm >= 8

> **重要提示：** 本项目强制使用pnpm作为包管理器，请勿使用npm或yarn安装依赖，以确保依赖版本一致性。

```bash
# 1. 克隆项目
git clone https://github.com/linshenkx/prompt-optimizer.git
cd prompt-optimizer

# 2. 安装依赖
pnpm install

# 3. 启动开发服务
pnpm dev:web    # Web版
pnpm dev:ext    # 插件版
```

### 环境变量 {#environment-variables}
可以通过以下两种方式配置API密钥：

#### 1. 通过模型管理界面配置（推荐）
1. 点击界面右上角的"⚙️设置"按钮
2. 选择"模型管理"选项卡
3. 点击需要配置的模型（如Gemini、DeepSeek等）
4. 在弹出的配置框中输入对应的API密钥
5. 点击"保存"即可

支持的模型类型：
- OpenAI
- Gemini
- DeepSeek
- 自定义API（OpenAI兼容接口）

注意事项：
- API密钥会通过浏览器的安全存储机制加密保存
- 建议使用HTTPS环境进行配置
- 如使用自定义API，请确保接口格式兼容

#### 2. 通过环境变量配置
在 `packages/web` 目录下创建 `.env.local` 文件：

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

## 📦 项目结构

```
prompt-optimizer/
├── packages/                # 多包工程
│   ├── core/               # 核心功能
│   ├── ui/                 # UI组件库
│   ├── web/               # Web应用
│   └── extension/         # Chrome插件
├── docs/                  # 项目文档
└── tests/                 # 测试用例
```

## 🛠️ 开发命令

```bash
# === 开发环境 ===
pnpm dev:core              # 开发核心包
pnpm dev:ui               # 开发UI库
pnpm dev:web              # 开发Web版
pnpm dev:ext              # 开发插件版

# === 构建打包 ===
pnpm build:core           # 构建核心包
pnpm build:ui            # 构建UI库
pnpm build:web           # 构建Web版
pnpm build:ext           # 构建插件版

# === 测试相关 ===
pnpm test                # 运行所有测试
pnpm test:core           # 测试核心包
pnpm test:ui            # 测试UI库
```

## 📚 技术栈

- 🔧 **核心框架**
  - TypeScript 5.x
  - Vue 3.4.x
  - Vite 5.x
  - LangChain
  
- 🎨 **UI框架**
  - TailwindCSS 3.4.x
  - Vue组件库

- 📦 **工程化**
  - pnpm
  - Vitest
  - ESLint
  - Prettier

## 🗺️ 开发路线

- [x] 基础功能开发
- [x] Web应用发布
- [ ] Chrome插件发布
- [x] 自定义模型支持
- [ ] 国际化支持

## 📖 相关文档

- [使用教程](docs/quickstart.md)
- [配置说明](docs/configuration.md)
- [开发指南](docs/development.md)
- [常见问题](docs/faq.md)

## 🤝 参与贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m '添加某个特性'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 开源协议

本项目采用 MIT 协议 - 详见 [LICENSE](LICENSE) 文件

## 👥 联系我们

- 提交 Issue
- 发起 Pull Request
- 加入讨论组