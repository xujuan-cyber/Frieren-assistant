# 三种部署方式的代理架构对比

## 📋 概述

本文档对比分析了项目在三种不同部署方式下的API代理架构，说明了Docker代理功能的设计如何与现有架构保持一致。

## 🏗️ 架构对比

### 1. Vercel部署架构

```
用户浏览器
    ↓ (前端应用)
Vercel Edge Runtime
    ├── 静态文件服务 (/)
    ├── API代理 (/api/proxy.js)
    └── 流式代理 (/api/stream.js)
    ↓ (代理请求)
外部LLM API服务
    ↓ (响应)
用户浏览器
```

**特点**：
- 使用Vercel Edge Functions作为代理层
- 自动处理CORS和跨域问题
- 支持流式响应
- 有30秒超时限制

**代理实现**：
- `api/proxy.js` - 处理普通HTTP请求
- `api/stream.js` - 处理流式响应
- `api/vercel-status.js` - 环境检测端点

### 2. Desktop (Electron) 架构

```
Electron渲染进程 (前端)
    ↓ (IPC通信)
Electron主进程
    ↓ (Node.js fetch)
外部LLM API服务
    ↓ (响应)
Electron主进程
    ↓ (IPC通信)
Electron渲染进程 (前端)
```

**特点**：
- 通过Electron主进程处理所有API请求
- 绕过浏览器的同源策略限制
- 无跨域问题
- 支持完整的Node.js API

**代理实现**：
- 主进程IPC处理器
- 直接使用Node.js的fetch API
- 无需额外的代理服务

### 3. Docker部署架构（简化版）

```
用户浏览器
    ↓ (前端应用)
Docker容器
├── Nginx (端口80)
│   ├── 静态文件服务 (/)
│   ├── MCP代理 (/mcp -> localhost:3000)
│   ├── API转发 (/api/proxy -> 127.0.0.1:3001)   [简化]
│   ├── 流式转发 (/api/stream -> 127.0.0.1:3001) [简化]
│   └── 状态检测 (/api/docker-status)
├── Node Proxy (端口3001)                          [新增]
│   ├── /api/proxy?targetUrl=... (零依赖实现)
│   └── /api/stream?targetUrl=... (流式透传)
├── MCP服务器 (端口3000)
└── Supervisor (进程管理)
    ↓ (node-proxy转发)
外部LLM API服务
    ↓ (响应)
用户浏览器
```

**特点**：
- **简化的nginx配置**：只做本地转发，避免复杂动态代理
- **零依赖Node.js代理**：使用内置模块实现
- **受信环境假设**：简化安全配置
- **完整功能支持**：普通请求和流式响应

**代理实现**：
- nginx简单的proxy_pass配置
- Node.js处理所有代理逻辑
- 最简CORS配置（Allow-Origin: *）

## 🔄 代理流程对比

### API调用流程

#### Vercel环境
```
前端 → 检测Vercel环境 → 构造代理URL → /api/proxy?targetUrl=... → Vercel Edge Function → 外部API
```

#### Desktop环境
```
前端 → 检测Electron环境 → IPC调用 → 主进程fetch → 外部API
```

#### Docker环境（简化版）
```
前端 → 检测Docker环境 → 构造代理URL → /api/proxy?targetUrl=... → nginx转发 → Node.js代理 → 外部API
```

### 环境检测机制

| 环境 | 检测方式 | 检测端点 | 缓存机制 |
|------|----------|----------|----------|
| Vercel | fetch('/api/vercel-status') | /api/vercel-status | localStorage |
| Desktop | window.electronAPI存在性检查 | 无需网络请求 | 内存检测 |
| Docker | fetch('/api/docker-status') | /api/docker-status | localStorage（复用Vercel模式） |

## 🔧 技术实现对比

### 代理URL构造

#### 统一的getProxyUrl函数
```typescript
export const getProxyUrl = (baseURL: string | undefined, isStream: boolean = false): string => {
  if (!baseURL) return '';

  const origin = isBrowser() ? window.location.origin : '';
  const proxyEndpoint = isStream ? 'stream' : 'proxy';

  // Vercel和Docker使用相同的URL格式
  return `${origin}/api/${proxyEndpoint}?targetUrl=${encodeURIComponent(baseURL)}`;
};
```

#### 环境特定的处理
```typescript
// 在LLM服务中的使用
if (modelConfig.useVercelProxy && isVercel()) {
  finalBaseURL = getProxyUrl(processedBaseURL, isStream);
} else if (modelConfig.useDockerProxy && isDocker()) {
  finalBaseURL = getProxyUrl(processedBaseURL, isStream);
} else if (isRunningInElectron()) {
  // Desktop环境直接使用原始URL，通过IPC处理
  finalBaseURL = processedBaseURL;
}
```

### CORS处理对比

| 环境 | CORS处理方式 | 配置位置 |
|------|--------------|----------|
| Vercel | Edge Function中设置响应头 | api/proxy.js, api/stream.js |
| Desktop | 无需处理（主进程请求） | 无 |
| Docker | nginx简单配置 + Node.js处理 | docker/nginx.conf + Node.js代理 |

### 流式响应处理

#### Vercel实现
```javascript
// api/stream.js
const { readable, writable } = new TransformStream();
const writer = writable.getWriter();
const reader = fetchResponse.body.getReader();
// 流式传输逻辑
```

#### Docker实现（简化版）
```nginx
# docker/nginx.conf - 简单转发
location /api/stream {
    proxy_pass http://127.0.0.1:3001;
    proxy_buffering off;
    proxy_request_buffering off;
    add_header X-Accel-Buffering no always;
}
```

```js
// Node.js代理 - 流式处理
if (isStream && upstream.body) {
  Readable.fromWeb(upstream.body).pipe(res);
}
```

## 🔒 安全说明（简化）

- Docker 部署通常用于本地/受信环境，本方案默认不启用复杂的安全保护。
- 若有需要，建议在外层网络设备或反向代理（或 Node Proxy 层）自行增加白名单、限流、日志等措施。
- 本文档仅保留最小的实现说明，避免过度设计。


## 🎯 核心对比

### 功能一致性
所有三种环境都提供：
- ✅ 自动跨域处理
- ✅ 流式响应支持
- ✅ 透明的用户体验
- ✅ 相同的API接口

## 📝 总结

### 简化方案的优势
Docker代理功能采用**简化优先**的设计理念，实现了：

1. **架构统一性**：三种部署方式都有一致的代理解决方案
2. **实现简洁性**：避免复杂的nginx动态代理配置
3. **维护便利性**：零依赖Node.js实现，配置简单
4. **功能完整性**：支持普通请求和流式响应代理

### 实施价值
通过**nginx本地转发 + Node.js代理服务**的简化架构，项目在所有部署环境中提供了一致的跨域解决方案，既满足了功能需求，又避免了过度工程化，是一个务实且可维护的选择。
  - SSE 流式透传（WebStream → Node 流）
  - OPTIONS 预检：204
  - 错误：统一 JSON（{ error: string }）

## 🔄 从旧方案迁移（Nginx 动态代理/DNS → Node Proxy）

1. 在容器内新增并启动 Node Proxy（监听 3001），实现 /api/proxy 与 /api/stream
2. 将 Nginx 的 /api/proxy、/api/stream 上游改为 http://127.0.0.1:3001
3. 删除（或忽略）与 resolver/DNS 相关的配置与文档描述
4. 验证：
   - 普通请求（OpenAI/Gemini/DeepSeek）能通过 /api/proxy 正常返回
   - 流式请求（SSE）打字机效果正常，首字节延迟可接受
   - OPTIONS 预检 204；同源策略与 CORS 头一致
5. 安全与运维：
   - 按需开启 Basic 认证与同源回显（Vary: Origin）
   - 可选：为 /api/* 定义 access_log 与限流（Nginx 或 Node Proxy）

## 🧩 可扩展性与自定义 API

- 任意 baseURL：保留 targetUrl 传参能力，支持自建 OneAPI/内网 API/厂商私有域名
- 无需改 Nginx：新增/变更上游 API 无需修改 Nginx，只需通过 targetUrl 传入
- 受限环境：若需要对可访问域名做控制，建议在 Node Proxy 层实现白名单/黑名单与审计（可选增强）

## 📝 总结

### 简化方案的优势
Docker代理功能采用**简化优先**的设计理念，实现了：

1. **架构统一性**：三种部署方式都有一致的代理解决方案
2. **实现简洁性**：避免复杂的nginx动态代理配置
3. **维护便利性**：零依赖Node.js实现，配置简单
4. **功能完整性**：支持普通请求和流式响应代理

### 实施价值
通过**nginx本地转发 + Node.js代理服务**的简化架构，项目在所有部署环境中提供了一致的跨域解决方案，既满足了功能需求，又避免了过度工程化，是一个务实且可维护的选择。
