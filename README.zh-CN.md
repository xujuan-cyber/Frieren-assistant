# Frieren assistant 🚀

<div align="center">

[English](README.md) | [中文](README.zh-CN.md)

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)

多模式 AI 提示词优化与翻译助手。

</div>

## 📖 项目简介

**Frieren assistant** 是一个强大的 AI 提示词工作台：优化、测试、评估提示词，并把它们沉淀为可复用的提示词资产；同时内置独立的翻译助手。支持 Web 应用、桌面应用、Chrome 扩展和 Docker 部署四种使用方式。

## ✨ 功能特性

- 📝 **双模式优化**：支持系统提示词与用户提示词优化
- 🔄 **分析与评估**：支持分析、单结果评估与多结果对比评估
- 🤖 **多模型接入**：OpenAI、Gemini、DeepSeek、Grok、智谱、硅基流动、MiniMax 等主流模型
- 🖼️ **图像生成**：文生图、图生图与多图工作区
- 🌐 **翻译助手**：独立翻译工作区，支持语言对、风格与术语表自定义
- 🚀 **助手启动页**：启动时在提示词助手与翻译助手之间选择
- 📱 **多平台**：Web、桌面（自动更新）、Chrome 扩展、Docker
- 🧩 **MCP 协议支持**：可接入 Claude Desktop 等 MCP 兼容应用
- ⚙️ **模型参数**：按模型配置尺寸、风格等参数

## 🚀 快速开始

### 桌面应用（推荐）

从 [GitHub Releases](https://github.com/xujuan-cyber/Frieren-assistant/releases) 下载最新版本：

- **安装程序**：推荐 — 支持自动更新
- **压缩包**：便携版，解压即用

桌面应用没有浏览器跨域（CORS）限制，可以直接连接任何 AI 服务，包括本地 Ollama 或有严格安全策略的商业 API。

### Web 部署

- **Vercel**：一键部署或手动导入，见 [Vercel 部署指南](docs/user/deployment/vercel.md)
- **Cloudflare**：见 [Cloudflare 部署指南](docs/user/deployment/cloudflare-pages.md)
- **Docker**：见 [Docker 部署指南](mkdocs/docs/zh/deployment/docker-basic.md)

### Chrome 扩展

从源码构建（见[本地开发](#-本地开发)），然后在 `chrome://extensions` 打开开发者模式 → 加载已解压的扩展程序，指向 `packages/extension/dist`。

### MCP 服务

见 [MCP 部署使用说明](docs/user/mcp-server.md)。

## 💻 本地开发

```bash
git clone https://github.com/xujuan-cyber/Frieren-assistant.git
cd Frieren-assistant
pnpm install
```

要求 Node.js >= 24.15.0（已启用 engine-strict）。

```bash
pnpm dev:web        # Web 开发模式
pnpm dev:desktop    # 桌面开发模式
pnpm build:desktop  # 构建桌面安装包
pnpm typecheck:core # core 包类型检查
pnpm typecheck:ui   # ui 包类型检查
```

更多文档见 [`docs/`](docs/README.md)（mkdocs 文档源在 [`mkdocs/docs/`](mkdocs/docs/)）。

## 📄 开源协议

本项目采用 [AGPL-3.0](LICENSE) 协议开源。

基于 [prompt-optimizer](https://github.com/linshenkx/prompt-optimizer)（© 2025 linshenkx，AGPL-3.0-only）修改而来，按协议要求保留原始版权声明。
