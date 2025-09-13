# 桌面应用

Prompt Optimizer 桌面应用是功能最完整、体验最佳的版本，提供无限制的AI模型访问能力和完整的高级功能支持。

## 🖥️ 核心优势

桌面应用相比其他版本具有显著优势：

- ✅ **无跨域限制** - 作为原生桌面应用，完全摆脱浏览器跨域（CORS）问题
- ✅ **本地模型完美支持** - 直接连接 Ollama、LM Studio 等本地部署的模型
- ✅ **自动更新** - 支持自动检查和更新到最新版本
- ✅ **独立运行** - 无需浏览器，提供更快响应和更佳性能
- ✅ **完整功能** - 支持所有高级功能，无功能限制
- ✅ **稳定可靠** - 不受浏览器环境变化影响

## 📋 系统要求

### Windows 系统
- Windows 10/11 (64位)
- 至少 4GB 内存
- 100MB 可用磁盘空间
- Visual C++ Redistributable（通常已预装）

### macOS 系统
- macOS 10.15+ (Catalina及以上)
- Intel 或 Apple Silicon 处理器
- 至少 4GB 内存
- 100MB 可用磁盘空间

### Linux 系统
- Ubuntu 18.04+ / Debian 10+
- 或其他主流Linux发行版
- X11 或 Wayland 显示服务器
- 至少 4GB 内存

## 📥 下载和安装

### 官方下载渠道

**GitHub Releases（推荐）**: [https://github.com/linshenkx/prompt-optimizer/releases](https://github.com/linshenkx/prompt-optimizer/releases)

### 安装包类型说明

#### 推荐：安装程序版本（支持自动更新）
- **Windows**: `Prompt-Optimizer-Setup-[版本].exe`
- **macOS**: `Prompt-Optimizer-[版本].dmg` 
- **Linux**: `Prompt-Optimizer-[版本].AppImage`

#### 备选：压缩包版本（免安装）
- **Windows**: `Prompt-Optimizer-[版本]-win.zip`
- **macOS**: `Prompt-Optimizer-[版本]-mac.zip`
- **Linux**: `Prompt-Optimizer-[版本]-linux.zip`

### Windows 安装详细步骤

#### 1. 下载安装程序
- 从GitHub Releases下载 `Prompt-Optimizer-Setup-[版本].exe`
- 确保从官方渠道下载，避免安全风险

#### 2. 运行安装程序
```bash
# 如果遇到Windows安全提示：
# 1. 点击"更多信息"
# 2. 点击"仍要运行"
# 3. 选择安装位置（推荐默认）
# 4. 点击"安装"按钮
```

#### 3. 完成安装
- 安装完成后应用会自动启动
- 桌面和开始菜单会创建快捷方式
- 首次启动可能需要几秒钟加载时间

#### 4. 常见问题处理

**安装失败**：
```bash
# 以管理员权限运行安装程序
# 右键点击安装包 -> "以管理员身份运行"
```

**缺少运行库**：
```bash
# 下载并安装Visual C++ Redistributable
# 链接：https://aka.ms/vs/17/release/vc_redist.x64.exe
```

### macOS 安装详细步骤

#### 1. 下载和挂载
- 下载 `.dmg` 安装包
- 双击挂载磁盘镜像

#### 2. 安装应用
- 将 Prompt Optimizer 拖拽到 Applications 文件夹
- 等待复制完成
- 弹出磁盘镜像

#### 3. 首次启动
```bash
# 如果出现"无法打开"提示：
# 方法1：按住Control键点击应用图标 -> 选择"打开" -> "打开"
# 方法2：系统偏好设置 -> 安全性与隐私 -> 通用 -> "仍要打开"
```

#### 4. 权限设置
- 首次启动可能需要授予网络访问权限
- 在"安全性与隐私"中允许应用运行
- 如需要，在"隐私"设置中允许网络访问

### Linux 安装详细步骤

#### AppImage 版本（推荐）

```bash
# 1. 下载AppImage文件
wget https://github.com/linshenkx/prompt-optimizer/releases/latest/download/Prompt-Optimizer-[版本].AppImage

# 2. 添加执行权限
chmod +x Prompt-Optimizer-[版本].AppImage

# 3. 运行应用
./Prompt-Optimizer-[版本].AppImage

# 4. 可选：集成到系统菜单
# 安装AppImageLauncher会自动处理集成
sudo apt install appimagelauncher
```

#### 压缩包版本

```bash
# 1. 下载并解压
wget https://github.com/linshenkx/prompt-optimizer/releases/latest/download/Prompt-Optimizer-[版本]-linux.zip
unzip Prompt-Optimizer-[版本]-linux.zip

# 2. 进入目录
cd Prompt-Optimizer-[版本]-linux

# 3. 运行应用
./prompt-optimizer
```

#### 依赖包安装

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0

# CentOS/RHEL
sudo yum install gtk3 libnotify nss libXScrnSaver libXtst xdg-utils at-spi2-atk

# Arch Linux
sudo pacman -S gtk3 libnotify nss libxss libxtst xdg-utils at-spi2-atk
```

## ⚙️ 功能特性

### 完整功能支持

桌面版支持所有Web版功能：
- **基础优化功能** - 完整的提示词优化能力
- **高级变量管理** - 复杂变量系统和上下文管理
- **工具调用功能** - Function Calling完整支持
- **多轮会话测试** - 复杂对话场景模拟
- **完整模型管理** - 无限制的模型配置

### 桌面专属特性

#### 无限制API访问
```javascript
// 支持任意API端点，无跨域限制
API Base URL: http://localhost:11434/v1  // Ollama
API Base URL: https://internal-api.company.com/v1  // 企业内网
API Base URL: http://192.168.1.100:1234/v1  // 局域网服务
```

#### 本地模型完美集成

**Ollama配置示例**：
```javascript
模型提供商: Custom
API Base URL: http://localhost:11434/v1
模型名称: qwen2.5:7b
API密钥: dummy_key (任意值，Ollama不需要)
```

**LM Studio配置**：
```javascript
API Base URL: http://localhost:1234/v1
模型名称: 根据LM Studio中加载的模型填写
API密钥: lm-studio (或任意值)
```

**Xinference配置**：
```javascript
API Base URL: http://localhost:9997/v1
模型名称: 部署的具体模型名称
API密钥: 根据Xinference配置填写
```

#### 高级网络配置

**HTTP/HTTPS代理支持**：
```bash
# 在设置->网络中配置代理
HTTP代理: http://proxy.company.com:8080
HTTPS代理: https://proxy.company.com:8080
认证: 用户名/密码（如需要）
```

**自定义请求头**：
```javascript
// 支持自定义HTTP请求头
Authorization: Bearer custom-token
X-API-Version: v2024-01
User-Agent: CustomPromptOptimizer/1.0
```

## 🛠️ 配置和使用

### 初次配置向导

#### 1. 模型配置
```bash
启动应用 -> 设置 -> 模型管理
1. 点击"添加模型"
2. 选择模型提供商（OpenAI、Gemini等）
3. 输入API密钥
4. 点击"测试连接"验证
5. 保存配置
```

#### 2. 界面个性化
- **主题设置**：日间模式、夜间模式、跟随系统
- **字体调整**：字体大小、字体族选择
- **语言设置**：中文、英文界面切换
- **布局配置**：侧边栏位置、面板大小

#### 3. 高级设置
- **网络代理**：HTTP/HTTPS代理配置
- **自动更新**：启用/禁用自动更新检查
- **数据存储**：本地数据存储位置
- **性能选项**：GPU加速、内存使用限制

### 数据管理

#### 数据存储位置
```bash
Windows: %APPDATA%\prompt-optimizer\
# 实际路径示例：C:\Users\用户名\AppData\Roaming\prompt-optimizer\

macOS: ~/Library/Application Support/prompt-optimizer/
# 实际路径示例：/Users/用户名/Library/Application Support/prompt-optimizer/

Linux: ~/.config/prompt-optimizer/
# 实际路径示例：/home/用户名/.config/prompt-optimizer/
```

#### 数据文件结构
```
prompt-optimizer/
├── config.json          # 应用配置
├── models.json          # 模型配置
├── history.db           # 历史记录数据库
├── templates/           # 模板文件
├── exports/            # 导出数据
└── logs/               # 应用日志
```

#### 数据备份策略
```bash
# 方法1：使用应用内导出功能
设置 -> 数据管理 -> 导出所有数据

# 方法2：直接复制数据文件夹
cp -r ~/.config/prompt-optimizer/ /backup/location/

# 方法3：自动备份脚本（Linux/macOS）
#!/bin/bash
BACKUP_DIR="/backup/prompt-optimizer/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR
cp -r ~/.config/prompt-optimizer/* $BACKUP_DIR/
```

## 🔄 自动更新

### 更新检查机制

桌面版具有智能更新系统（仅安装程序版本）：

#### 自动检查
- **启动时检查** - 每次启动检查是否有新版本
- **定期检查** - 每24小时后台检查一次
- **手动检查** - 设置中可手动检查更新

#### 更新策略
```javascript
// 更新设置选项
自动下载更新: 是/否
静默安装更新: 是/否（需要管理员权限）
更新通知: 立即通知/启动时通知/禁用通知
```

### 更新流程详解

#### 1. 检测阶段
```bash
# 应用会检查GitHub Releases API
检查URL: https://api.github.com/repos/linshenkx/prompt-optimizer/releases/latest
当前版本: v1.2.0
最新版本: v1.3.0
状态: 发现新版本
```

#### 2. 下载阶段
- 后台下载更新包到临时目录
- 显示下载进度和速度
- 支持断点续传和重试机制
- 验证下载文件的完整性和签名

#### 3. 安装阶段
```bash
# Windows
临时目录: %TEMP%\prompt-optimizer-update\
安装方式: 运行新的安装程序覆盖安装
重启方式: 自动关闭应用并重新启动

# macOS  
临时目录: /tmp/prompt-optimizer-update/
安装方式: 替换Applications中的应用包
重启方式: 重新启动应用

# Linux
临时目录: /tmp/prompt-optimizer-update/
安装方式: 替换AppImage文件
重启方式: 重新启动应用
```

#### 4. 异常处理
- **更新失败自动回滚** - 保留原版本可用性
- **网络中断重试机制** - 自动重试下载
- **手动更新备选方案** - 提供下载链接手动更新

## 🔧 故障排除

### Windows 常见问题

#### 应用启动问题

**问题：应用无法启动**
```bash
# 解决方案1：检查运行库
下载并安装: Microsoft Visual C++ Redistributable
链接: https://aka.ms/vs/17/release/vc_redist.x64.exe

# 解决方案2：以管理员权限运行
右键应用图标 -> "以管理员身份运行"

# 解决方案3：检查防病毒软件
将Prompt Optimizer添加到杀毒软件白名单
检查是否被误报为恶意软件
```

**问题：闪退或崩溃**
```bash
# 检查日志文件
路径: %APPDATA%\prompt-optimizer\logs\
查看: error.log 或 crash.log

# 常见解决方案
1. 更新显卡驱动
2. 关闭硬件加速
3. 重置应用配置
```

#### 网络连接问题

**问题：无法连接API**
```bash
# 检查防火墙设置
控制面板 -> 系统和安全 -> Windows Defender防火墙
允许Prompt Optimizer通过防火墙

# 检查代理设置
设置 -> 网络 -> 配置HTTP/HTTPS代理
确保代理配置正确

# 测试网络连通性
cmd -> ping api.openai.com
cmd -> nslookup api.openai.com
```

### macOS 常见问题

#### 安全和权限问题

**问题："无法打开，因为无法验证开发者"**
```bash
# 解决方案1：临时允许
按住Control键点击应用 -> 打开 -> 打开

# 解决方案2：系统设置允许
系统偏好设置 -> 安全性与隐私 -> 通用 -> "仍要打开"

# 解决方案3：命令行允许（高级）
sudo spctl --master-disable  # 临时禁用Gatekeeper
# 使用完毕后记得重新启用
sudo spctl --master-enable
```

**问题：网络权限被拒绝**
```bash
# 授予网络访问权限
系统偏好设置 -> 安全性与隐私 -> 隐私 -> 完全磁盘访问
添加Prompt Optimizer到允许列表

# 重置网络权限
sudo rm -rf ~/Library/Application Support/prompt-optimizer/
重新启动应用并重新授权
```

### Linux 常见问题

#### AppImage运行问题

**问题：AppImage无法运行**
```bash
# 安装FUSE支持
sudo apt install fuse libfuse2  # Ubuntu/Debian
sudo yum install fuse           # CentOS/RHEL
sudo pacman -S fuse2           # Arch Linux

# 添加执行权限
chmod +x Prompt-Optimizer-*.AppImage

# 在终端运行查看详细错误
./Prompt-Optimizer-*.AppImage --verbose
```

**问题：缺少系统库**
```bash
# 安装必需的依赖包
# Ubuntu/Debian
sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 libatspi2.0-0

# CentOS/RHEL
sudo yum install gtk3 libnotify nss libXScrnSaver libXtst at-spi2-atk

# Arch Linux
sudo pacman -S gtk3 libnotify nss libxss libxtst at-spi2-atk
```

#### 显示和主题问题

**问题：界面显示异常**
```bash
# 检查显示服务器
echo $XDG_SESSION_TYPE  # 应该显示 x11 或 wayland

# 设置缩放比例
export GDK_SCALE=1.5
./Prompt-Optimizer-*.AppImage

# 强制使用X11（如果Wayland有问题）
export GDK_BACKEND=x11
./Prompt-Optimizer-*.AppImage
```

## 💡 使用技巧

### 性能优化建议

#### 1. 硬件加速配置
```bash
# 启用GPU加速（如果支持）
设置 -> 高级 -> 硬件加速: 启用
重启应用生效

# 调整内存限制
设置 -> 高级 -> 最大内存使用: 2GB
根据系统配置调整
```

#### 2. 网络优化
```bash
# 配置连接超时
设置 -> 网络 -> 请求超时: 30秒
设置 -> 网络 -> 重试次数: 3次

# 使用HTTP/2（如果API支持）
设置 -> 高级 -> 启用HTTP/2: 是
```

### 工作流程优化

#### 1. 快捷键配置
```bash
# 常用快捷键（可自定义）
Ctrl+N: 新建优化任务
Ctrl+S: 保存当前配置
Ctrl+E: 导出结果
Ctrl+,: 打开设置
F11: 全屏模式
```

#### 2. 模板管理
- 创建常用场景的模板库
- 使用变量系统提高复用性
- 定期整理和更新模板内容
- 导出重要模板作为备份

---

**相关链接**：
- [Chrome插件](extension.md) - 浏览器插件版本使用指南
- [故障排除](../help/troubleshooting.md) - 更多问题解决方案