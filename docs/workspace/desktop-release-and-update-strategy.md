
# 桌面端应用发布与智能更新系统 - 设计方案

## 1. 总体设计目标

构建一个专业、跨平台、用户体验优先的桌面应用更新系统。系统应为非侵入式，将完整的控制权交给用户，同时确保更新流程的稳定性和数据的安全性。

---

## 2. 打包与发布策略 (CI/CD)

**目标**: 自动化构建支持自动更新的安装包和供高级用户使用的便携包，并将其发布到 GitHub Releases。

- **涉及文件**:
  - `packages/desktop/package.json`
  - `.github/workflows/release.yml`

#### 2.1. 构建配置 (`package.json`)

1.  **核心依赖**: 添加 `electron-updater` 到 `dependencies`。
2.  **更新源配置**: 在 `build` 节点下，添加 `publish` 配置，指向项目的 GitHub 仓库（提供 `owner` 和 `repo`）。
3.  **多目标构建**:
    -   `win.target`: 设置为 `['nsis', 'zip']`，同时生成 Windows 安装包和便携包。
    -   `mac.target`: 设置为 `['dmg', 'zip']`，同时生成 macOS 安装包和便携包。
    -   `linux.target`: 设置为 `['AppImage', 'zip']`，同时生成 Linux 安装包和便携包。

#### 2.2. 自动化工作流 (`release.yml`)

1.  **上传所有产物**: 在 `build-windows`, `build-macos`, `build-linux` 这三个 `job` 中，修改 `actions/upload-artifact` 步骤，确保上传所有生成的文件（如 `*.exe`, `*.dmg`, `*.AppImage`, `*.zip`, `*.yml`），而不仅仅是 `.zip`。
2.  **发布所有产物**: 在最终的 `create-release` `job` 中，修改 `softprops/action-gh-release` 的 `files` 参数，使用通配符（如 `artifacts/**/*`）将所有下载的 `artifact` 文件附加到 GitHub Release 中。

---

## 3. 核心更新逻辑 (主进程)

**目标**: 编写健壮的主进程逻辑，作为整个交互式更新流程的后端引擎。

- **涉及文件**: `packages/desktop/main.js`

#### 3.1. `checkUpdate` 异步函数

1.  **读取持久化设置**: 在函数开始时，从 `PreferenceService` 异步读取 `updater.allowPrerelease` 和 `updater.ignoredVersion` 的值。
2.  **配置更新器**:
    -   根据读取到的偏好设置 `autoUpdater.allowPrerelease`。
    -   **必须**设置 `autoUpdater.autoDownload = false`，将下载控制权交给用户。
3.  **处理 `update-available` 事件**:
    -   **智能忽略**: 在回调函数第一行，进行判断：`if (info.version === ignoredVersion) return;`。如果发现的版本是用户忽略过的，则提前终止流程。
    -   **构建详情链接**: 根据 `package.json` 中的 `publish` 配置和 `info.version`，动态构建出指向 GitHub Release 页面的 `releaseUrl`。
    -   **发送通知**: 通过 IPC (`update-available-info`) 将包含版本信息和 `releaseUrl` 的对象发送给 UI 层。

#### 3.2. IPC 监听器

1.  `start-download-update`: 接收到 UI 层信号后，调用 `autoUpdater.downloadUpdate()`。
2.  `install-update`: 接收到 UI 层信号后，调用 `autoUpdater.quitAndInstall()`。
3.  `ignore-update`: 接收到 UI 层传来的版本号后，调用 `preferenceService.set('updater.ignoredVersion', version)` 进行持久化。
4.  `open-external-link`: 接收到 UI 层传来的 URL 后，使用 `shell.openExternal()` 安全地打开链接。

---

## 4. UI 交互方案 (前端)

**目标**: 提供一个位于右上角的、集信息展示与交互功能于一体的更新中心。

- **涉及文件**:
  - `App.vue` 或主布局文件
  - `components/UpdaterIcon.vue` (新)
  - `components/UpdaterPanel.vue` (新)
  - `composables/useUpdater.ts` (新)

#### 4.1. 核心组件

1.  **`UpdaterIcon.vue`**:
    -   **位置**: 在 `App.vue` 中，放置于现有 GitHub 和语言切换图标旁边。
    -   **交互**: 当有未被忽略的新版本时，图标上显示高亮（如小红点）。点击图标，会弹出一个面板 (`UpdaterPanel.vue`)。
2.  **`UpdaterPanel.vue` (更新面板)**:
    -   **默认视图**: 显示当前应用版本号，并提供一个开关用于设置并持久化“接收预览版更新”的选项。
    -   **更新可用视图**: 显示新版本号，并提供 “查看详情”、“下载更新”、“忽略此版本” 三个按钮。
    -   **下载中视图**: 显示一个实时更新的进度条。
    -   **下载完成视图**: 显示 “立即重启安装” 按钮。
3.  **`useUpdater.ts` (逻辑封装)**:
    -   **状态管理**: 集中管理所有响应式状态（`hasUpdate`, `updateInfo`, `downloadProgress` 等）。
    -   **逻辑封装**: 封装所有与主进程的 IPC 通信（`on` 和 `send`），让 UI 组件可以清晰地调用 `startDownload()`, `ignoreUpdate(version)` 等方法。

---

## 5. 数据存储与持久化

**目标**: 正确设定数据存储位置，并只持久化用户的明确选择，以确保体验的连续性。

- **涉及文件**:
  - `packages/desktop/main.js` (存储路径配置)
  - `PreferenceService` (用于持久化)

#### 5.1. 数据存储路径

1.  **目标**: 从项目一开始，就将数据存储位置设定在操作系统标准的、安全的用户数据目录中。
2.  **实施**: 在 `main.js` 中，找到实例化 `FileStorageProvider` 的地方，将其构造函数的路径参数直接修改为 `app.getPath('userData')`。
3.  **数据迁移**: **无需考虑**。由于产品尚未发布，不存在老用户数据迁移问题。

#### 5.2. 需要持久化的数据

1.  `updater.allowPrerelease` (布尔值): 用户是否愿意接收 Beta 版更新。由设置面板中的开关控制。
2.  `updater.ignoredVersion` (字符串): 用户选择忽略的特定版本号。由更新面板中的“忽略”按钮触发写入。
3.  **原则**: 所有关于新版本的信息、下载进度等，都应视为临时状态，每次应用启动时重新检测，以保证信息的准确性。 