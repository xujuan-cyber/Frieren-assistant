# 常见问题

这里收集了用户在配置和使用 Prompt Optimizer 时最常遇到的基础问题和解决方案。

## 🔑 API配置相关

### Q: API密钥在哪里获取？

#### OpenAI API密钥获取

```bash
# 获取步骤
1. 访问 platform.openai.com
2. 注册并登录账户（需要验证手机号）
3. 进入 "API Keys" 页面
4. 点击 "Create new secret key" 创建密钥
5. 复制并保存密钥（只显示一次）

# 注意事项
- 确保账户有足够的使用额度
- API密钥格式：sk-proj-... 或 sk-...
- 建议设置使用限制防止超额
```

#### Google Gemini API密钥获取

```bash
# 获取步骤  
1. 访问 ai.google.dev
2. 使用Google账户登录
3. 点击 "Get API key" 按钮
4. 创建新项目或选择现有项目
5. 生成API密钥并复制保存

# 使用说明
- Gemini Pro免费版有一定限制
- 支持多种编程语言SDK
- API密钥格式：AIza...
```

#### DeepSeek API密钥获取

```bash
# 获取步骤
1. 访问 platform.deepseek.com
2. 注册并完成实名认证
3. 在API管理页面创建密钥
4. 充值账户余额（按用量付费）

# 优势特点
- 性价比极高的大模型服务
- 支持长上下文（最高320K）
- API调用速度快，稳定性好
```

#### 其他主流模型提供商

**智谱AI (GLM)**:
```bash
官网: open.bigmodel.cn
特点: 国内领先的大模型服务
价格: 相对便宜，质量不错
适用: 中文任务优化较好
```

**SiliconFlow**:
```bash
官网: cloud.siliconflow.cn  
特点: 提供多种开源模型API
价格: 极具竞争力
适用: 预算有限的用户
```

**火山方舟（字节跳动）**:
```bash
官网: console.volcengine.com
特点: 企业级模型服务
价格: 按需付费，有免费额度
适用: 企业用户和开发者
```

### Q: 为什么配置好API密钥后仍然无法连接到模型服务？

#### 问题根源：跨域限制（CORS）

**问题解释**：
Prompt Optimizer是纯前端应用，浏览器出于安全考虑会阻止直接访问不同源的API服务。这是Web安全的基础机制，不是应用的缺陷。

#### 解决方案对比

| 方案 | 难度 | 稳定性 | 功能完整性 | 推荐指数 |
|------|------|--------|------------|----------|
| 桌面版 | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🔥🔥🔥🔥🔥 |
| Vercel代理 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 🔥🔥🔥🔥 |
| 自部署 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🔥🔥🔥 |
| API中转 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 🔥🔥🔥 |

#### 具体解决方案

**方案1：使用桌面版（最推荐）**
```bash
# 下载地址
GitHub: https://github.com/linshenkx/prompt-optimizer/releases

# 优势
✅ 无跨域限制，支持所有API
✅ 完美支持本地模型（Ollama、LM Studio等）
✅ 更好的性能和稳定性
✅ 自动更新功能

# 适用人群
经常使用本工具的用户
需要连接本地模型的用户
对性能要求较高的用户
```

**方案2：使用Vercel代理**
```bash
# 使用方法
1. 在模型设置中勾选"使用Vercel代理"
2. 配置API密钥正常使用
3. 代理会自动处理跨域问题

# 注意事项
- 代理服务有一定的延迟
- 免费版Vercel有调用限制
- 某些模型可能不支持代理
```

**方案3：自行部署到Vercel**
```bash
# 部署步骤
1. Fork项目到自己的GitHub
2. 在Vercel中导入项目
3. 设置环境变量（API密钥等）
4. 部署完成后获得专属域名

# 优势
- 完全控制的代理服务  
- 无使用限制
- 可自定义配置
```

### Q: 自定义模型如何配置？

#### 配置步骤

```javascript
// 配置参数说明
模型名称: 自定义标识（如：my-api）
API Base URL: API服务的基础地址
模型: 具体的模型名称
API密钥: 认证密钥

// 示例配置
{
  "name": "DeepSeek",
  "baseURL": "https://api.deepseek.com",
  "model": "deepseek-chat",
  "apiKey": "sk-..."
}
```

#### 常见自定义模型配置

**Ollama本地模型**:
```javascript
模型名称: Ollama
API Base URL: http://localhost:11434/v1
模型: qwen2.5:7b（根据实际安装的模型）
API密钥: dummy_key（任意值）
```

**LM Studio**:
```javascript  
模型名称: LMStudio
API Base URL: http://localhost:1234/v1
模型: 在LM Studio中显示的模型名
API密钥: lm-studio（或任意值）
```

**OneAPI中转**:
```javascript
模型名称: OneAPI
API Base URL: https://your-oneapi-domain.com/v1
模型: 具体模型标识
API密钥: 在OneAPI中生成的令牌
```

## 🌐 网络连接问题

### Q: 本地Ollama如何解决连接问题？

#### Ollama连接配置

**Step 1: 设置跨域策略**

Linux/macOS:
```bash
# 设置环境变量
export OLLAMA_ORIGINS="*"
export OLLAMA_HOST="0.0.0.0:11434"

# 重启Ollama服务
systemctl restart ollama
# 或
killall ollama && ollama serve
```

Windows:
```cmd
# 设置环境变量（管理员权限）
setx OLLAMA_ORIGINS "*" /M
setx OLLAMA_HOST "0.0.0.0:11434" /M

# 重启服务
net stop ollama
net start ollama
```

**Step 2: 验证Ollama运行状态**
```bash
# 检查服务是否运行
curl http://localhost:11434/api/tags

# 应该返回已安装的模型列表
{
  "models": [
    {
      "name": "qwen2.5:7b",
      "model": "qwen2.5:7b",
      "modified_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Step 3: 在应用中配置**
```javascript
// 模型配置
自定义模型名称: ollama
API Base URL: http://localhost:11434/v1
API密钥: dummy_key（任意值，Ollama不验证）
模型名称: qwen2.5:7b（替换为实际模型）

// 测试连接
点击"测试连接"按钮验证配置是否正确
```

#### 常见Ollama问题解决

**问题1：端口被占用**
```bash
# 查找占用进程
netstat -tulpn | grep 11434
lsof -i :11434

# 更换端口
export OLLAMA_HOST="0.0.0.0:11435"
# 然后在应用中使用 http://localhost:11435/v1
```

**问题2：防火墙阻拦**
```bash
# Ubuntu/Debian
sudo ufw allow 11434

# CentOS/RHEL  
sudo firewall-cmd --add-port=11434/tcp --permanent
sudo firewall-cmd --reload

# Windows
# 在Windows防火墙中添加11434端口规则
```

**问题3：模型未安装**
```bash
# 拉取模型
ollama pull qwen2.5:7b
ollama pull llama3:8b

# 查看已安装模型
ollama list

# 运行模型测试
ollama run qwen2.5:7b "你好"
```

### Q: 为什么在线版无法连接本地模型？

#### 混合内容安全策略

**问题根源**：
现代浏览器的混合内容（Mixed Content）安全策略禁止HTTPS页面访问HTTP资源。由于在线版使用HTTPS，而本地模型通常使用HTTP，因此被浏览器阻止。

**具体表现**：
```bash
# 浏览器控制台错误信息
Mixed Content: The page at 'https://prompt.always200.com/' 
was loaded over HTTPS, but requested an insecure XMLHttpRequest 
endpoint 'http://localhost:11434/v1/chat/completions'. 
This request has been blocked.
```

#### 解决方案优先级

**方案1：桌面版（推荐）**
```bash
优势：
✅ 完全没有浏览器限制
✅ 完美支持HTTP和HTTPS
✅ 性能更好，功能更全
✅ 自动更新，使用便捷

下载：GitHub Releases或官网下载
```

**方案2：Docker本地部署**
```bash
# 使用HTTP协议访问
docker run -d -p 8081:80 linshen/prompt-optimizer
# 访问：http://localhost:8081

优势：
✅ HTTP环境无混合内容限制
✅ 完整功能支持
✅ 本地部署，数据安全
```

**方案3：Chrome插件（部分有效）**
```bash
# 从Chrome商店安装插件版本
插件在某些情况下可以绕过部分限制
但功能可能不如桌面版完整

适用：偶尔使用的用户
```

**方案4：浏览器设置（不推荐）**
```bash
# Chrome启用不安全内容（不推荐）
1. 点击地址栏左侧的锁图标
2. 选择"网站设置"
3. 将"不安全内容"设置为"允许"
4. 刷新页面重试

⚠️ 警告：这会降低浏览器安全性
```

### Q: 商业API跨域问题怎么解决？

#### 企业级API服务特点

大多数企业级AI服务（如火山方舟、Nvidia API、Azure OpenAI等）都有严格的跨域限制和安全策略，需要专门的解决方案。

#### 解决方案

**方案1：Vercel代理服务（推荐新手）**
```bash
# 使用步骤
1. 访问在线版：https://prompt.always200.com
2. 在模型设置中启用"使用Vercel代理"
3. 正常配置API密钥和模型
4. 系统自动通过代理访问API

# 支持的API
✅ 火山方舟 API
✅ Nvidia API  
✅ Azure OpenAI
✅ 大部分OpenAI兼容API
```

**方案2：自部署代理服务（推荐进阶用户）**
```bash
# OneAPI部署
1. 部署OneAPI到服务器
2. 配置各种模型的中转
3. 在应用中配置OneAPI地址
4. 通过中转服务访问各种API

# 优势
✅ 完全控制的代理服务
✅ 支持所有主流API
✅ 可以统一管理多个API密钥
✅ 提供使用统计和监控
```

**方案3：企业内网部署**
```bash
# 适用场景
企业内部使用
有自己的服务器资源
对数据安全有高要求

# 部署方式
Docker容器化部署
Kubernetes集群部署
传统服务器部署
```

---

**相关链接**：
- [连接问题](connection-issues.md) - 深入的连接问题解决方案
- [桌面应用](../deployment/desktop.md) - 桌面版安装和使用指南