# Web版部署指南

本指南将详细介绍如何部署 Prompt Optimizer 的Web版本，包括在线版使用、Vercel部署和访问控制配置。

## 🌐 在线版本使用

### 直接访问（推荐）

**在线地址**：[https://prompt.always200.com](https://prompt.always200.com)

**在线版优势**：
- ✅ **即开即用** - 无需安装配置，打开即可使用
- ✅ **始终最新** - 自动获得最新功能和修复
- ✅ **跨平台支持** - 支持所有现代浏览器
- ✅ **数据安全** - 纯前端应用，数据仅存储在本地浏览器

**使用注意事项**：
- 所有数据存储在浏览器本地，清除浏览器数据会丢失配置
- API调用直接从浏览器发送到AI服务商，不经过中间服务器
- 受浏览器跨域限制，某些本地或特殊API可能无法访问

### 浏览器要求

**支持的浏览器**：
- Chrome 88+ （推荐）
- Firefox 85+
- Safari 14+
- Edge 88+

**必需功能**：
- 启用JavaScript
- 启用本地存储（localStorage）
- 支持现代Web标准（ES2020+）

## ☁️ Vercel部署

### 方式一：一键部署（快速）

**直接部署**：
[![部署到 Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flinshenkx%2Fprompt-optimizer)

**特点**：
- ✅ 部署快速，几分钟即可完成
- ❌ 无法跟踪源项目更新
- ❌ 更新需要重新部署

### 方式二：Fork后部署（推荐）

#### 步骤1：Fork项目

1. **访问源项目**：[GitHub - prompt-optimizer](https://github.com/linshenkx/prompt-optimizer)
2. **点击Fork按钮**：将项目Fork到你的GitHub账户
3. **等待Fork完成**：确保所有文件都已复制

#### 步骤2：Vercel导入

1. **登录Vercel**：访问 [vercel.com](https://vercel.com) 并登录
2. **新建项目**：点击"New Project"按钮
3. **导入GitHub仓库**：选择你Fork的prompt-optimizer项目
4. **配置项目**：
   - 项目名称：自定义项目名称
   - Framework Preset：选择"Vite"
   - 构建目录：保持默认设置

#### 步骤3：部署配置

**构建设置**：
- **Framework**: Vite
- **Build Command**: `pnpm build`
- **Output Directory**: `dist`
- **Node.js Version**: 18.x

**高级设置**：
- **环境变量**：根据需要配置API密钥和访问控制
- **域名设置**：可配置自定义域名
- **分支设置**：选择要部署的分支（通常是main或master）

### 环境变量配置

#### API密钥配置

在Vercel项目设置中的"Environment Variables"部分添加：

```
# OpenAI
VITE_OPENAI_API_KEY=your_openai_api_key

# Gemini
VITE_GEMINI_API_KEY=your_gemini_api_key

# DeepSeek  
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key

# 智谱AI
VITE_ZHIPU_API_KEY=your_zhipu_api_key

# SiliconFlow
VITE_SILICONFLOW_API_KEY=your_siliconflow_api_key
```

#### 自定义模型配置

支持配置无限数量的自定义模型：

```
# 自定义模型示例：Ollama
VITE_CUSTOM_API_KEY_ollama=dummy_key
VITE_CUSTOM_API_BASE_URL_ollama=http://localhost:11434/v1
VITE_CUSTOM_API_MODEL_ollama=qwen2.5:7b

# 自定义模型示例：其他OpenAI兼容API
VITE_CUSTOM_API_KEY_mymodel=your_api_key
VITE_CUSTOM_API_BASE_URL_mymodel=https://api.example.com/v1
VITE_CUSTOM_API_MODEL_mymodel=custom-model-name
```

**配置规则**：
- `VITE_CUSTOM_API_KEY_[modelname]`：API密钥
- `VITE_CUSTOM_API_BASE_URL_[modelname]`：API基础URL
- `VITE_CUSTOM_API_MODEL_[modelname]`：模型名称

#### 访问控制配置

```
# 访问控制（可选）
ACCESS_USERNAME=admin
ACCESS_PASSWORD=your_secure_password
```

启用后，访问应用需要输入用户名和密码。

### 部署后配置

#### 验证部署

1. **访问应用**：通过Vercel提供的URL访问应用
2. **功能测试**：测试基本的提示词优化功能
3. **API连接测试**：在模型管理中测试API连接
4. **环境变量验证**：确认配置的API密钥生效

#### 自动更新

**配置自动更新**：
1. 在Vercel项目设置中启用"Git Integration"
2. 每次原项目更新后，在你的Fork仓库中：
   - 点击"Sync fork"按钮
   - 或通过GitHub Desktop/命令行同步

**自动化同步**（高级用户）：
- 可以通过GitHub Actions自动同步上游更新
- 配置定时任务定期检查更新

## 🔒 访问控制

### 密码保护

**启用访问控制**：
通过环境变量配置访问密码：

```
ACCESS_USERNAME=admin
ACCESS_PASSWORD=your_secure_password
```

**访问流程**：
1. 用户访问应用时显示登录页面
2. 输入正确的用户名和密码
3. 登录成功后正常使用所有功能
4. 登录状态会保持到浏览器关闭

### IP白名单

**Vercel配置**：
在`vercel.json`文件中配置IP限制：

```json
{
  "functions": {
    "pages/api/auth.js": {
      "includeFiles": "**"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

### 企业部署

**内网部署**：
1. 将代码部署到内网Vercel或其他平台
2. 配置企业级访问控制
3. 集成企业SSO系统
4. 设置数据备份策略

## 🚀 性能优化

### 构建优化

**Vite配置优化**：
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'naive-ui']
        }
      }
    }
  }
})
```

**CDN加速**：
- Vercel自动提供全球CDN加速
- 支持静态资源缓存优化
- 自动压缩CSS/JS文件

### 缓存策略

**浏览器缓存**：
- 静态资源采用长期缓存
- API响应可配置缓存策略
- 用户数据存储在localStorage

## 🔧 故障排除

### 部署失败

**常见问题**：

1. **构建失败**
   ```
   Error: Build failed with exit code 1
   ```
   **解决方案**：
   - 检查Node.js版本是否为18.x
   - 确认package.json中的依赖版本
   - 检查环境变量配置

2. **内存不足**
   ```
   Error: JavaScript heap out of memory
   ```
   **解决方案**：
   - 在Vercel设置中调整内存限制
   - 优化构建配置减少内存使用

3. **域名解析问题**
   ```
   Error: Domain not found
   ```
   **解决方案**：
   - 检查DNS配置
   - 验证CNAME记录设置

### 运行时问题

**API调用失败**：
1. 检查环境变量是否正确配置
2. 验证API密钥是否有效
3. 确认模型服务状态正常
4. 检查跨域配置

**页面加载慢**：
1. 检查CDN缓存状态
2. 优化图片和静态资源
3. 启用Vercel的性能监控
4. 分析和优化关键渲染路径

## 📊 监控与分析

### Vercel Analytics

**启用分析**：
1. 在Vercel项目设置中启用Analytics
2. 查看访问量、性能指标
3. 分析用户行为数据
4. 监控错误率和响应时间

### 用户反馈

**收集反馈**：
- 通过GitHub Issues收集问题报告
- 设置用户反馈渠道
- 定期分析使用数据
- 根据反馈优化功能

## 🔄 更新和维护

### 版本更新

**跟踪更新**：
1. 关注原项目的Release页面
2. 定期同步Fork的仓库
3. 测试新版本的兼容性
4. 更新环境变量配置

**回滚策略**：
- Vercel支持一键回滚到之前版本
- 保持重要配置的备份
- 测试环境验证更新

### 数据备份

**用户数据**：
- 提醒用户定期导出数据
- 提供数据迁移指南
- 确保跨版本兼容性

---

通过本指南，你应该能够成功部署并配置自己的 Prompt Optimizer Web版本。如果遇到问题，请查看[帮助支持](../help/common-questions.md)或在GitHub提交Issue。