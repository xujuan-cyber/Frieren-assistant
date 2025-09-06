# 配置示例文件

本目录包含各种服务和工具的配置示例文件，用于帮助开发者快速配置项目。

## 📁 文件说明

### API 配置示例
- **`openai.example.json`** - OpenAI API 配置示例
  - 包含API密钥、模型参数等配置
  - 用于设置OpenAI服务集成

- **`langfuse.example.json`** - Langfuse 配置示例  
  - 用于配置Langfuse追踪和分析服务
  - 包含项目密钥和端点设置

## 🚀 使用方法

1. **复制示例文件**：将需要的示例文件复制到项目根目录
   ```bash
   cp docs/examples/openai.example.json .env.local
   # 或者根据项目配置要求调整文件名和位置
   ```

2. **填写实际配置**：根据示例文件中的注释填写真实的API密钥和配置值

3. **环境变量配置**：某些配置可能需要设置为环境变量
   ```bash
   export OPENAI_API_KEY="your_actual_api_key"
   export LANGFUSE_PROJECT_KEY="your_project_key"
   ```

## ⚠️ 安全提醒

- **不要提交真实密钥**：确保不将包含真实API密钥的配置文件提交到版本控制
- **使用环境变量**：推荐使用环境变量存储敏感配置
- **检查.gitignore**：确保敏感配置文件已添加到.gitignore中

## 🔗 相关文档

- 项目配置指南：查看项目根目录的README.md
- API集成文档：查看对应的服务集成文档
- 环境变量配置：参考.env.example文件

---
**更新时间**: 2025-09-09  
**维护方式**: 配置示例应该与实际项目配置保持同步