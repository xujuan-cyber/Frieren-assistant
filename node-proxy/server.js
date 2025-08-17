import http from 'node:http';
import { Readable } from 'node:stream';

const PORT = process.env.PORT || 3001;
const STREAM_TIMEOUT = parseInt(process.env.STREAM_TIMEOUT || '300000'); // 默认5分钟
const PROXY_TIMEOUT = parseInt(process.env.PROXY_TIMEOUT || '120000');   // 默认2分钟

/**
 * 统一JSON响应函数
 */
function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

/**
 * 增强的请求日志
 */
function logRequest(req, targetUrl, status, startTime, requestId) {
  const duration = Date.now() - startTime;
  const timestamp = new Date().toISOString();
  const clientIP = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  console.log(`[${timestamp}] [${requestId}] ${clientIP} ${req.method} ${targetUrl} -> ${status} (${duration}ms)`);
}

/**
 * 生成简单的请求ID
 */
function generateRequestId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * 主要的代理服务器
 */
const server = http.createServer(async (req, res) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const url = new URL(req.url || '', 'http://localhost');
    const isStream = url.pathname === '/api/stream';
    let targetUrl = url.searchParams.get('targetUrl');
    
    // 验证targetUrl参数
    if (!targetUrl) {
      return json(res, 400, { error: 'Missing targetUrl parameter' });
    }

    // 自动将本地主机地址替换为 host.docker.internal 以便在 Docker 容器内访问宿主机
    // 同时验证 URL 的有效性
    try {
      const targetUrlObject = new URL(targetUrl);
      const localhostNames = ['localhost', '127.0.0.1', '[::1]'];
      if (localhostNames.includes(targetUrlObject.hostname)) {
        const originalHostname = targetUrlObject.hostname;
        targetUrlObject.hostname = 'host.docker.internal';
        targetUrl = targetUrlObject.toString();
        console.log(`[${new Date().toISOString()}] [${requestId}] Remapped localhost URL from ${originalHostname} to host.docker.internal. New target: ${targetUrl}`);
      }
    } catch {
      return json(res, 400, { error: 'Invalid targetUrl parameter' });
    }

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
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
      });
    }

    // 发起上游请求（添加超时防护：流式和普通请求不同超时）
    const controller = new AbortController();
    const timeoutMs = isStream ? STREAM_TIMEOUT : PROXY_TIMEOUT;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let upstream;
    try {
      upstream = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
        signal: controller.signal
      });
    } finally {
      // 确保定时器总是被清理，防止内存泄漏
      clearTimeout(timeoutId);
    }

    // 设置CORS头（简化版本）
    const origin = req.headers['origin'];
    if (origin && typeof origin === 'string') {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY');

    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      logRequest(req, targetUrl, 204, startTime, requestId);
      return res.end();
    }

    // 透传状态码和响应头
    res.statusCode = upstream.status;
    res.statusMessage = upstream.statusText;
    
    // 透传重要的响应头
    upstream.headers.forEach((val, key) => {
      // 跳过一些可能冲突的头
      if (!['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers'].includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    });

    // HEAD请求特殊处理（只返回头部，不处理响应体）
    if (req.method === 'HEAD') {
      logRequest(req, targetUrl, upstream.status, startTime, requestId);
      return res.end();
    }

    // 处理响应体
    if (isStream && upstream.body) {
      // 流式响应：WebStream → Node Readable 转换
      logRequest(req, targetUrl, upstream.status, startTime, requestId);
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      // 普通响应
      const buf = Buffer.from(await upstream.arrayBuffer());
      logRequest(req, targetUrl, upstream.status, startTime, requestId);
      res.end(buf);
    }

  } catch (error) {
    // 增强的错误处理
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${requestId}] Proxy error:`, error);
    logRequest(req, req.url || 'unknown', 'ERROR', startTime, requestId);

    if (!res.headersSent) {
      // 区分不同类型的错误并提供友好消息
      let statusCode = 500;
      let errorMessage = 'Internal server error';

      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        statusCode = 504;
        errorMessage = 'Request timeout - the target server took too long to respond';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        statusCode = 502;
        errorMessage = 'Bad gateway - unable to connect to target server';
      } else if (error.code === 'ECONNRESET') {
        statusCode = 502;
        errorMessage = 'Connection reset by target server';
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        statusCode = 400;
        errorMessage = 'Invalid target URL or request format';
      } else {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      json(res, statusCode, {
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          details: error.stack,
          requestId
        })
      });
    }
  }
});

// 启动服务器
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[${new Date().toISOString()}] Node Proxy server listening on 127.0.0.1:${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] Received SIGTERM, shutting down gracefully`);
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Node Proxy server closed`);
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] Received SIGINT, shutting down gracefully`);
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Node Proxy server closed`);
    process.exit(0);
  });
});
