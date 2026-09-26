# Frieren assistant 🚀

<div align="center">

[English](README.md) | [中文](README.zh-CN.md)

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)

A multi-mode AI prompt optimization and translation assistant.

</div>

## 📖 Introduction

**Frieren assistant** is a powerful AI prompt workbench: optimize, test, evaluate, and save prompts as reusable assets — plus a dedicated translation assistant. It ships as a web application, a desktop application, a Chrome extension, and supports Docker deployment.

## ✨ Features

- 📝 **Dual Mode Optimization**: system prompt and user prompt optimization
- 🔄 **Analysis & Evaluation**: analysis, single-result evaluation, and multi-result comparison
- 🤖 **Multi-model Integration**: OpenAI, Gemini, DeepSeek, Grok, Zhipu AI, SiliconFlow, MiniMax, and more
- 🖼️ **Image Generation**: Text-to-Image, Image-to-Image, and Multi-Image workspaces
- 🌐 **Translation Assistant**: dedicated workspace with language pairs, styles, and glossaries
- 🚀 **Assistant Launcher**: pick between the prompt assistant and the translation assistant at startup
- 📱 **Multi-platform**: web, desktop (auto-update), Chrome extension, Docker
- 🧩 **MCP Protocol Support**: integrate with MCP-compatible applications such as Claude Desktop
- ⚙️ **Model Parameters**: per-model configuration (size, style, etc.)

## 🚀 Quick Start

### Desktop (recommended)

Download the latest installer from [GitHub Releases](https://github.com/xujuan-cyber/Frieren-assistant/releases):

- **Installer**: recommended — supports auto-update
- **Archive**: portable, unzip and run

The desktop app has no browser CORS restrictions, so you can connect to any provider — including local Ollama or APIs with strict security policies.

### Web deployment

- **Vercel**: one-click deploy or manual import — see the [Vercel guide](docs/user/deployment/vercel_en.md)
- **Cloudflare**: see the [Cloudflare guide](docs/user/deployment/cloudflare-pages_en.md)
- **Docker**: see the [Docker guide](mkdocs/docs/en/deployment/docker-basic.md)

### Chrome extension

Build it yourself from source (see [Development](#development)) and load it via `chrome://extensions` → Developer mode → Load unpacked, pointing at `packages/extension/dist`.

### MCP server

See the [MCP guide](docs/user/mcp-server_en.md).

## 💻 Development

```bash
git clone https://github.com/xujuan-cyber/Frieren-assistant.git
cd Frieren-assistant
pnpm install
```

Requires Node.js >= 24.15.0 (engine-strict is enabled).

```bash
pnpm dev:web        # web app in dev mode
pnpm dev:desktop    # desktop app in dev mode
pnpm build:desktop  # build the desktop installer
pnpm typecheck:core # type check the core package
pnpm typecheck:ui   # type check the UI package
```

More documentation lives under [`docs/`](docs/README.md) (sources for the mkdocs site are under [`mkdocs/docs/`](mkdocs/docs/)).

## 📄 License

This project is licensed under [AGPL-3.0](LICENSE).

It is based on [prompt-optimizer](https://github.com/linshenkx/prompt-optimizer) (© 2025 linshenkx, AGPL-3.0-only) with modifications. The original copyright notices are retained as required by the license.
