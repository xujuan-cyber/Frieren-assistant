# 私有仓库环境变量配置说明

## 问题描述
当你的GitHub仓库是私有的时候，`electron-updater`需要GitHub Personal Access Token来访问更新文件。

## 解决方案

### 1. 获取GitHub Personal Access Token
1. 访问 [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token" -> "Generate new token (classic)"
3. 设置以下权限：
   - **repo** (必需) - 完整的仓库访问权限
4. 复制生成的token（格式类似：`ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

### 2. 配置环境变量

#### 方法一：在exe安装目录创建.env.local文件（推荐）
1. 安装 `PromptOptimizer-1.2.0-win-x64.exe`
2. 找到安装目录，通常是：
   ```
   C:\Users\你的用户名\AppData\Local\Programs\PromptOptimizer\
   ```
3. 在该目录下创建一个名为 `.env.local` 的文件
4. 文件内容为：
   ```
   GH_TOKEN=你的GitHub_Personal_Access_Token
   ```
5. 保存文件并重启应用

#### 方法二：设置Windows系统环境变量
1. 右键"此电脑" -> "属性" -> "高级系统设置" -> "环境变量"
2. 在"系统变量"中点击"新建"
3. 变量名：`GH_TOKEN`
4. 变量值：你的GitHub Personal Access Token
5. 确定并重启应用

## 验证配置
启动应用后，在控制台日志中应该能看到：
```
[Main Process] ===== DOTENV LOADING DEBUG =====
[Main Process] App is packaged: true
[Main Process] .env.local exists: true
[Main Process] GH_TOKEN loaded from dotenv: true
```

## 注意事项
- 请妥善保管你的GitHub token，不要分享给他人
- 如果token过期，需要重新生成并更新配置
- 推荐使用方法一（.env.local文件），因为更容易管理和更新

## 故障排除
如果仍然遇到403错误：
1. 确认token有 `repo` 权限
2. 确认token未过期
3. 确认.env.local文件位置正确
4. 重启应用并查看控制台日志 