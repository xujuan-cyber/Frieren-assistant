# Web 版部署

先一句话说明它的定位：

**Web 版只是前端页面，不是模型代理层。**

无论你使用官方在线站还是自己部署静态站，模型请求都会由浏览器直接发往模型服务。

## 它和 Docker、MCP 是什么关系

这三者很容易混淆，可以先按下面理解：

| 方式 | 你会得到什么 | 适合什么 |
| --- | --- | --- |
| Web 版 | 一个可访问的前端页面 | 在线使用、静态托管 |
| Docker | Web 页面 + 容器内 `/mcp` 服务 | 自托管、局域网部署 |
| 独立 MCP | 只有 MCP 服务，不带 Web 页面 | 接入 MCP 客户端 |

如果你想一次起 Web 和 MCP，优先看 [Docker 基础部署](docker-basic.md)。

如果你只关心 MCP 接入方式，直接看 [MCP 服务器](../user/mcp-server.md)。

## 什么时候适合用 Web 版

适合：

- 主要连接公开 HTTPS 模型 API
- 想快速上线一个可访问的前端站点
- 不需要访问 `http://localhost` 之类的本地接口

不太适合：

- 主要连接 Ollama、LM Studio、本地网关
- 需要访问企业内网且跨域策略严格的 API
- 想靠“前端部署”来绕过浏览器限制

## 最简单的 2 种用法

### 1. 直接使用官方在线站

地址：<https://prompt.always200.com>

这是最省事的方式，但浏览器限制依然存在：

- 数据默认保存在当前浏览器本地
- 请求会直接发送给你配置的模型服务
- 如果模型服务不允许浏览器跨域访问，在线站同样无法绕过

### 2. 自己部署静态站

仓库根目录提供了 `vercel.json`，可以直接部署到 Vercel。

如果你不使用 Vercel，也可以把构建产物部署到任意静态托管平台。

## 部署到 Vercel

推荐流程：

1. Fork 本仓库
2. 在 Vercel 中导入该仓库
3. 保持仓库根目录为项目根目录
4. 配置环境变量
5. 部署

### 常用环境变量

文本模型：

```bash
VITE_OPENAI_API_KEY=...
VITE_GEMINI_API_KEY=...
VITE_ANTHROPIC_API_KEY=...
VITE_DEEPSEEK_API_KEY=...
VITE_SILICONFLOW_API_KEY=...
VITE_ZHIPU_API_KEY=...
VITE_DASHSCOPE_API_KEY=...
VITE_OPENROUTER_API_KEY=...
VITE_MODELSCOPE_API_KEY=...
VITE_MINIMAX_API_KEY=...
```

自定义 OpenAI 兼容接口：

```bash
VITE_CUSTOM_API_KEY=...
VITE_CUSTOM_API_BASE_URL=https://your-api.example.com/v1
VITE_CUSTOM_API_MODEL=your-model-name
```

### 可选：站点密码保护

如果你在 Vercel 上设置：

```bash
ACCESS_PASSWORD=your_password
```

站点会先显示密码页。对应逻辑由根目录的 `middleware.js` 和 `api/auth.js` 提供。

## 部署到其他静态托管

本地构建：

```bash
pnpm install
pnpm build
```

构建完成后，Web 前端产物位于：

```text
packages/web/dist
```

把这个目录部署到 Nginx、OSS、S3、Cloudflare Pages 或其他静态托管平台即可。

!!! note
    如果你不用 Vercel，自行部署静态文件时，`ACCESS_PASSWORD` 密码页和 `/api/auth` 不会自动存在；那是 Vercel 方案里的能力。

## Web 版最大的限制在哪里

问题通常不在“页面能不能打开”，而在“浏览器能不能连上模型服务”。

### CORS

如果模型服务没有返回允许浏览器跨域的响应头，Web 版会直接失败。

### Mixed Content

如果你的站点是 `https://...`，但模型接口是 `http://localhost:...`，浏览器通常会拦截。

### 企业网络策略

如果公司网络拦截未知 API 域名、限制自签名证书或要求代理，前端站点本身并不能自动解决这些问题。

## 什么时候该改用别的方案

如果你遇到下面这些需求，通常应该换到别的方式：

- 连接 Ollama / LM Studio：优先 [桌面应用](desktop.md)
- 连接局域网 HTTP 接口：优先 [桌面应用](desktop.md)
- 想同时提供 Web 和 MCP：优先 [Docker 基础部署](docker-basic.md)
- 只想对外提供 MCP：看 [MCP 服务器](../user/mcp-server.md)

## 相关页面

- [桌面应用](desktop.md)
- [Docker 基础部署](docker-basic.md)
- [MCP 服务器](../user/mcp-server.md)
- [连接问题](../help/connection-issues.md)
