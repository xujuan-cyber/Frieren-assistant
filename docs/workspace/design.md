# Docker API代理功能设计文档

## 📋 概述

### 项目背景
当前项目支持三种部署方式：
- **Vercel部署**：使用Vercel的Edge Functions作为API代理处理跨域
- **Desktop版本**：通过Electron主进程处理API请求，无跨域问题
- **Docker部署**：目前只提供静态文件服务，前端直接调用外部API会遇到跨域问题

### 目标
为Docker部署环境添加API代理功能，实现与Vercel代理一致的用户体验，解决跨域问题。

### 核心原则
1. **架构一致性**：与现有Vercel代理保持相同的API接口和行为
2. **用户体验统一**：三种部署方式提供一致的代理功能和配置选项
3. **渐进式增强**：在现有Docker配置基础上扩展，不破坏现有功能
4. **简化优先**：默认不启用复杂安全防护（本地/受信环境）

## 🏗️ 系统架构

### 整体架构图（简化版）
```
Docker容器
├── Nginx (端口80)
│   ├── Web应用 (/)
│   ├── MCP代理 (/mcp -> localhost:3000)
│   ├── API转发 (/api/proxy -> 127.0.0.1:3001)
│   ├── 流式转发 (/api/stream -> 127.0.0.1:3001)
│   └── 状态检测 (/api/docker-status)
├── Node Proxy (端口3001)
├── MCP服务器 (端口3000)
└── Supervisor (进程管理)
```

### 代理流程图（简化版）
```
前端应用
    ↓ (检测环境)
环境检测逻辑
    ↓ (Docker环境)
启用Docker代理选项
    ↓ (用户选择使用代理)
构造代理URL
    ↓ (/api/proxy?targetUrl=...)
Nginx本地转发
    ↓ (127.0.0.1:3001)
Node.js代理服务
    ↓ (解析targetUrl并请求)
外部API服务
    ↓ (响应)
Node.js代理服务
    ↓ (添加CORS头)
Nginx本地转发
    ↓ (透传响应)
前端应用
```

## 🔧 技术实现

### 1. Nginx代理配置

#### 1.1 通用API代理（转发到本地 Node Proxy）
```nginx
# 将前端的 /api/proxy 转发到容器内的 Node 代理（127.0.0.1:3001）
location /api/proxy {
    # 本地转发到 Node Proxy（不直连外网）
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;

    # 透传关键信息
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # CORS由Node Proxy统一设置，避免重复头
}
```

#### 1.2 流式API代理（转发到本地 Node Proxy）
```nginx
# 将前端的 /api/stream 转发到容器内的 Node 代理（127.0.0.1:3001）
location /api/stream {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;

    # 流式转发配置
    proxy_buffering off;
    proxy_request_buffering off;
    add_header X-Accel-Buffering no always;

    # 透传关键信息
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # CORS由Node Proxy统一设置，避免重复头
}
```

#### 1.3 环境检测端点（简化版）
```nginx
# Docker环境状态检测
location /api/docker-status {
    add_header Content-Type 'application/json';
    # CORS由同源请求处理，无需额外设置

    return 200 '{"status": "available", "environment": "docker"}';
}
```

### 2. 前端环境检测扩展（简化版）

#### 2.1 Docker环境检测函数
```typescript
/**
 * 检查Docker API是否可用（简化版）
 */
export async function checkDockerApiAvailability(): Promise<boolean> {
  if (typeof window === 'undefined' || isRunningInElectron()) {
    return false;
  }

  try {
    const response = await fetch('/api/docker-status');
    if (response.ok) {
      const data = await response.json();
      return data.status === 'available';
    }
  } catch {
    // 忽略错误，返回false
  }

  return false;
}
```


#### 2.3 代理URL生成扩展
```typescript
/**
 * 获取API代理URL（支持Vercel和Docker环境）
 */
export const getProxyUrl = (baseURL: string | undefined, isStream: boolean = false): string => {
  if (!baseURL) {
    return '';
  }

  const origin = isBrowser() ? window.location.origin : '';
  const proxyEndpoint = isStream ? 'stream' : 'proxy';

  // 返回完整的绝对URL
  return `${origin}/api/${proxyEndpoint}?targetUrl=${encodeURIComponent(baseURL)}`;
};

/**
 * 检查当前环境是否支持代理
 */
export const isProxyAvailable = (): boolean => {
  // 可以是Vercel环境或Docker环境
  return isVercel() || isDocker();
};

/**
 * 检查是否在Docker环境中（简化版）
 */
export const isDocker = (): boolean => {
  // 简化实现：可以通过检测特定的环境标识
  // 或者与checkDockerApiAvailability结合使用
  return false; // 具体实现根据需要调整
};
```

### 3. 前端UI集成

#### 3.1 模型配置选项扩展
在现有的模型配置界面中添加Docker代理选项：

```typescript
// 模型配置接口扩展
interface ModelConfig {
  // ... 现有配置
  useVercelProxy?: boolean;  // 现有Vercel代理选项
  useDockerProxy?: boolean;  // 新增Docker代理选项
}
```

#### 3.2 UI组件更新
```vue
<!-- 在模型配置组件中添加Docker代理选项 -->
<template>
  <div class="proxy-options">
    <!-- Vercel代理选项（现有） -->
    <div v-if="proxyAvailability.vercel" class="proxy-option">
      <label>
        <input
          type="checkbox"
          v-model="modelConfig.useVercelProxy"
        />
        使用Vercel代理
      </label>
    </div>

    <!-- Docker代理选项（新增） -->
    <div v-if="proxyAvailability.docker" class="proxy-option">
      <label>
        <input
          type="checkbox"
          v-model="modelConfig.useDockerProxy"
        />
        使用Docker代理
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { checkProxyAvailability } from '@/utils/environment';

const proxyAvailability = ref({ vercel: false, docker: false });

onMounted(async () => {
  proxyAvailability.value = await checkProxyAvailability();
});
</script>
```


## 📊 监控和日志（简化版）

### 2. 简单日志记录
在Node.js代理中添加基础日志：

```js
// 简单的请求日志
const logRequest = (req, targetUrl, status, startTime) => {
  const duration = Date.now() - startTime;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${targetUrl} -> ${status} (${duration}ms)`);
};

// 在请求处理中使用
const startTime = Date.now();
try {
  const upstream = await fetch(targetUrl, { method: req.method, headers, body });
  logRequest(req, targetUrl, upstream.status, startTime);
  // ... 处理响应
} catch (error) {
  logRequest(req, targetUrl, 'ERROR', startTime);
  // ... 错误处理
}
```

### 3. 可选的nginx日志增强
如果需要更详细的nginx日志：

```nginx
# 可选：为代理请求启用独立日志
location /api/proxy {
    # 简单的访问日志
    access_log /var/log/nginx/proxy.log;

    # ... 其他配置
}
```

## 🧪 测试策略

### 1. 功能测试
- **基础代理功能**：测试普通HTTP请求的代理
- **流式代理功能**：测试SSE流式响应的代理
- **CORS处理**：测试跨域请求和预检请求
- **错误处理**：测试各种错误情况的处理

### 2. 安全测试
- **SSRF防护**：测试内网地址访问阻止
- **URL验证**：测试白名单机制
- **频率限制**：测试请求频率限制

### 3. 兼容性测试
- **多种LLM API**：测试OpenAI、Gemini、DeepSeek等API
- **不同请求类型**：测试GET、POST、OPTIONS等请求方法
- **各种认证方式**：测试Bearer Token、API Key等认证

## 📈 性能考虑

### 1. 缓存策略
- 对于模型列表等相对静态的API响应，可以考虑适当的缓存
- 对于流式响应，确保不启用缓存

### 2. 连接优化
- 启用HTTP/1.1持久连接
- 合理设置超时时间
- 优化代理缓冲区设置

### 3. 资源限制
- 设置合理的请求体大小限制
- 配置适当的并发连接数限制

## 🔄 部署和维护

### 1. 部署流程
1. 更新nginx配置文件
2. 重新构建Docker镜像
3. 更新前端代码
4. 测试代理功能
5. 更新文档

### 2. 维护注意事项
- 定期检查代理日志
- 监控代理性能指标
- 及时更新安全配置
- 保持与上游API的兼容性

---

## 📝 总结

本设计文档描述了Docker API代理功能的**简化实现方案**，采用**nginx本地转发 + Node.js代理服务**的架构：

### 核心特点
- **简化优先**：避免复杂的nginx动态代理配置
- **功能完整**：支持普通请求和流式响应代理
- **易于维护**：配置简单，代码清晰
- **适合场景**：Docker受信环境的实际需求

### 技术优势
- ✅ 零依赖的Node.js实现
- ✅ 简单的nginx本地转发
- ✅ 完整的流式响应支持
- ✅ 统一的错误处理
- ✅ 可选的安全增强

### 与现有架构的一致性
通过实现与Vercel代理相同的API接口（`/api/proxy`、`/api/stream`），确保了三种部署方式的用户体验统一，为Docker用户提供了完整的跨域解决方案。


### 3. Node Proxy 服务实现（最小可行方案）

#### 3.1 目录结构建议
```
/app/node-proxy
├── package.json        # 可选（若需独立依赖）
├── src
│   └── server.ts|js    # 主服务入口
└── dist
    └── server.js       # 构建输出（若用 TS）
```

#### 3.2 路由与行为约定
- 监听端口：3001（容器内）
- 路由：
  - `GET|POST|PUT|DELETE|OPTIONS /api/proxy?targetUrl=...`：常规请求代理
  - `GET|POST|OPTIONS /api/stream?targetUrl=...`：流式（SSE）转发
- 请求处理：
  - 读取 `targetUrl` 并校验为合法 URL
  - 透传除 `host/connection/content-length` 外的绝大部分头
  - 非 GET/HEAD 读取请求体并透传
- 响应处理：
  - 透传上游状态码、关键头
  - 设置 CORS：仅同源时回显 `$http_origin` 并添加 `Vary: Origin`
  - OPTIONS 预检直接 204
  - 错误统一返回 JSON `{ error: string }`

#### 3.3 最小代码示例（Node 18+，无外部依赖）
```js
import http from 'node:http';
import { Readable } from 'node:stream';

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '', 'http://localhost');
    const isStream = url.pathname === '/api/stream';
    const targetUrl = url.searchParams.get('targetUrl');
    if (!targetUrl) return json(res, 400, { error: 'Missing targetUrl' });

    // 复制请求头（排除会引发问题的头）
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (!['host', 'connection', 'content-length'].includes(k.toLowerCase()) && v) {
        headers.set(k, Array.isArray(v) ? v.join(',') : String(v));
      }
    }

    // 读取请求体（仅非GET/HEAD）
    let body = undefined;
    if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
      body = await new Promise((resolve) => {
        const chunks = []; req.on('data', c => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
      });
    }

    const upstream = await fetch(targetUrl, { method: req.method, headers, body });

    // CORS（同源示例，按需调整）
    const origin = req.headers['origin'];
    if (origin && typeof origin === 'string') {
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY');
      // 可根据同源策略决定是否回显 origin
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

    // 透传状态和部分响应头
    res.statusCode = upstream.status; res.statusMessage = upstream.statusText;
    upstream.headers.forEach((val, key) => res.setHeader(key, val));

    if (isStream && upstream.body) {
      // 流式透传（WebStream → Node Readable）
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    }
  } catch (e) {
    json(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
});

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

server.listen(3001, () => console.log('Node Proxy listening on 3001'));
```

> 说明：以上为最小示例，生产中可加入超时、重试、限流、日志等增强。
