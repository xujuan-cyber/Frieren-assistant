# Electron 应用图标更新指南

本文档说明如何为 Electron 应用更新图标文件。

## 📁 当前图标结构

```
packages/desktop/icons/
├── app-icon.ico     # Windows 图标 (多分辨率)
├── app-icon.icns    # macOS 图标 (Apple 标准格式)
├── app-icon.png     # Linux 备用图标
├── 16x16.png        # 小图标 (托盘、工具栏)
├── 32x32.png        # 标准桌面图标
├── 48x48.png        # 大图标视图
├── 64x64.png        # 高 DPI 小图标
├── 128x128.png      # 中等 DPI 图标
├── 256x256.png      # 高 DPI 大图标
├── 512x512.png      # Retina 显示器
└── 1024x1024.png    # 超高清显示器
```

## 🛠️ 使用工具

**electron-icon-builder** - 专门为 Electron 应用设计的图标生成工具

### 安装
```bash
npm install -g electron-icon-builder
```

## 🔄 图标更新流程

### 准备工作
1. 准备新的源图片 (推荐 1024x1024 PNG 格式)
2. 确保图片质量高，背景透明

### Windows 系统
```powershell
# 删除旧图标目录并重新生成
rmdir /s /q packages\desktop\icons
electron-icon-builder --input=images\logo\v2.png --output=packages\desktop --flatten
ren packages\desktop\icons\icon.ico app-icon.ico
ren packages\desktop\icons\icon.icns app-icon.icns
copy images\logo\v2.png packages\desktop\icons\app-icon.png
```

### Linux/macOS 系统
```bash
# 删除旧图标目录并重新生成
rm -rf packages/desktop/icons
electron-icon-builder --input=images/logo/v2.png --output=packages/desktop --flatten
mv packages/desktop/icons/icon.ico packages/desktop/icons/app-icon.ico
mv packages/desktop/icons/icon.icns packages/desktop/icons/app-icon.icns
cp images/logo/v2.png packages/desktop/icons/app-icon.png
```

## 📋 配置说明

### package.json 配置
```json
{
  "build": {
    "win": { "icon": "icons/app-icon.ico" },    // Windows: 专用 ICO 文件
    "mac": { "icon": "icons/app-icon.icns" },   // macOS: 专用 ICNS 文件  
    "linux": { "icon": "icons/" }               // Linux: 目录模式，自动选择
  }
}
```

### 应用内图标配置
main.js 会根据平台自动选择合适的图标：
- Windows: 使用 app-icon.ico
- macOS: 使用 app-icon.icns  
- Linux: 优先使用 512x512.png 或 256x256.png

## ⚠️ 注意事项

### 源文件要求
- **格式**: PNG
- **尺寸**: 1024x1024 像素 (推荐)
- **质量**: 高清无损
- **背景**: 透明

### 注意事项
- ✅ 使用高质量源图片 (1024x1024 PNG)
- ✅ 确保背景透明
- ✅ 删除重建比复制更可靠

## 🧪 测试构建

更新图标后，测试各平台构建：

```bash
# 测试 Windows 构建
cd packages/desktop
pnpm run build

# 或测试跨平台构建
pnpm run build:cross-platform
```

## 📝 一键更新命令

假设您有新的图标文件 `images/logo/v2.png`：

### Windows 一键更新
```powershell
rmdir /s /q packages\desktop\icons && electron-icon-builder --input=images\logo\v2.png --output=packages\desktop --flatten && ren packages\desktop\icons\icon.ico app-icon.ico && ren packages\desktop\icons\icon.icns app-icon.icns && copy images\logo\v2.png packages\desktop\icons\app-icon.png
```

### Linux/macOS 一键更新
```bash
rm -rf packages/desktop/icons && electron-icon-builder --input=images/logo/v2.png --output=packages/desktop --flatten && mv packages/desktop/icons/icon.ico packages/desktop/icons/app-icon.ico && mv packages/desktop/icons/icon.icns packages/desktop/icons/app-icon.icns && cp images/logo/v2.png packages/desktop/icons/app-icon.png
```

---

**最后更新**: 2026-03-01  
**生成工具**: electron-icon-builder  
**当前源文件**: images/logo/1024-1024.svg（保留同名 PNG 作为位图参考）  
**SVG 转 PNG（圆角透明蒙版，推荐作为跨平台统一输入）**:

```bash
magick images/logo/1024-1024.svg -alpha set -colorspace sRGB -strip -resize 1024x1024! images/logo/_tmp-icon-square.png
magick images/logo/_tmp-icon-square.png \
  \( -size 1024x1024 xc:none -fill white -draw "roundrectangle 0,0 1024,1024 224,224" \) \
  -alpha off -compose CopyOpacity -composite images/logo/1024-1024.png
rm -f images/logo/_tmp-icon-square.png
```

macOS Dock 图标建议使用圆角（避免直角黑底在 Dock 上显得突兀）：

```bash
# 生成圆角临时 PNG，然后用 electron-icon-builder 产出 icns
magick images/logo/1024-1024.png \
  \( -size 1024x1024 xc:none -fill white -draw "roundrectangle 0,0 1024,1024 224,224" \) \
  -alpha off -compose CopyOpacity -composite images/logo/_mac-icon-src.png

electron-icon-builder --input=images/logo/_mac-icon-src.png --output=images/logo/_icon-build-mac-tmp --flatten
cp images/logo/_icon-build-mac-tmp/icons/icon.icns packages/desktop/icons/app-icon.icns
rm -rf images/logo/_icon-build-mac-tmp images/logo/_mac-icon-src.png
```
