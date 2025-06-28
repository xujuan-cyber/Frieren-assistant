# 服务单例模式重构计划 (Singleton Refactor Plan)

## 1. 问题背景

经过深入排查，我们发现当前架构存在一个核心缺陷：**服务实例在模块导入时被过早创建（Eager Instantiation）**，并作为单例（Singleton）在多个包之间导出和传递。

这导致了以下严重问题：

1.  **"幽灵"服务**：在Electron的渲染进程中，意外地创建了一套基于 `Dexie` (IndexedDB) 的Web端服务。这些服务虽然未被最终使用，但占用了资源并造成了数据混乱的假象。
2.  **状态不一致**：由于服务实例的创建不感知运行环境，导致UI进程（看到的是Web版实例状态）和主进程（实际执行逻辑）之间存在状态不一致。
3.  **架构耦合**：`@prompt-optimizer/ui` 包不必要地导出了核心服务实例，使其职责不清，更像一个服务中转站而非纯UI库。
4.  **测试困难**：单例模式使得在测试中隔离和模拟服务变得非常困难。

## 2. 重构目标

本次重构的核心目标是**实现服务的延迟初始化（Lazy Initialization）和依赖注入（Dependency Injection）**，确保只在需要时、在正确的环境中、创建唯一正确的服务实例。

- **移除单例导出**：任何包（`core`, `ui`）都不应再导出预先创建好的服务实例。
- **统一初始化入口**：创建一个唯一的、环境感知的应用初始化器。
- **清晰的职责划分**：`core` 只提供服务类和工厂函数，`ui` 只提供UI组件和Hooks，应用入口（`App.vue`）负责编排。

## 3. 实施计划

### 阶段一：改造 Core 包，移除单例导出 (已完成)

**目标**：将所有服务的单例导出模式（`export const service = new Service()`) 改为工厂函数模式 (`export function createService()`)。

**步骤**：
1.  **`services/storage/factory.ts`**: 移除 `storageProvider` 单例导出。
2.  **`services/model/manager.ts`**: 移除 `modelManager` 单例导出，并使 `createModelManager` 显式接收 `storageProvider`。
3.  **`services/template/manager.ts`**: 移除 `templateManager` 单例导出，并使其工厂函数接收依赖。
4.  **`services/history/manager.ts`**: 移除 `historyManager` 单例导出，并使其工厂函数接收依赖。
5.  **`index.ts`**: 更新入口文件，确保只导出模块和工厂函数，移除所有单例和不应由 Core 包暴露的代理（proxy）文件。

**期间发现的偏差及处理**：

*   **`TemplateManager` 的深层依赖**：
    *   **发现**：`TemplateManager` 依赖另一个未被发现的单例 `templateLanguageService`。
    *   **措施**：对 `services/template/languageService.ts` 进行了相同的重构，移除了单例并创建了 `createTemplateLanguageService` 工厂函数。相应地，`createTemplateManager` 现在接收 `storageProvider` 和 `languageService` 两个实例作为参数。

*   **`index.ts` 的导出清理**：
    *   **发现**：`index.ts` 导出了属于应用层的 `electron-proxy.ts` 文件。
    *   **措施**：清理了 `index.ts`，移除了这些不应由 `core` 包暴露的导出项，使 API 更纯净。

### 阶段二：净化 UI 包，停止导出服务

**目标**：让 `@prompt-optimizer/ui` 回归其纯粹的UI库职责。

6.  **`packages/ui/src/index.ts`**
    - [ ] **移除**所有从 `@prompt-optimizer/core` 重新导出的服务实例，例如：
        ```typescript
        // --- 需要被删除的导出 ---
        export {
            templateManager,
            modelManager,
            historyManager,
            dataManager,
            storageProvider,
        } from '@prompt-optimizer/core'
        ```

### 阶段三：创建统一的应用初始化器

**目标**：将所有初始化逻辑收敛到一个可复用的 `composable` 中。

7.  **创建 `packages/ui/src/composables/useAppInitializer.ts`**
    - [ ] **目的**: 作为应用启动的唯一入口，负责环境判断和服务实例化。
    - [ ] **输入**: 无。
    - [ ] **输出**:
        - `isInitializing` (ref<boolean>): 一个布尔值，指示服务是否正在初始化。
        - `services` (ref<Object | null>): 一个包含所有服务实例的对象，初始化完成后才会有值。
    - [ ] **内部逻辑**:
        1.  在 `onMounted` 钩子中执行异步初始化逻辑，确保DOM环境可用。
        2.  在函数内部创建 `storageProvider`。
        3.  使用 `createModelManager(storageProvider)` 等工厂函数创建所有服务实例。
        4.  将创建好的实例传入 `useServiceInitializer`，获取 `promptService`。
        5.  将所有服务实例打包成一个对象，赋值给 `services` ref。
        6.  在初始化开始和结束时，正确设置 `isInitializing` 的状态。

### 阶段四：重构应用入口 (`App.vue`)

**目标**：让应用入口变得简洁，只负责消费初始化器返回的服务。

8.  **修改 `packages/web/src/App.vue` & `packages/extension/src/App.vue`**
    - [ ] **移除**: 所有对服务实例的直接导入（如 `import { modelManager } from ...`）。
    - [ ] **调用**: 在 `<script setup>` 的顶层调用 `const { services, isInitializing } = useAppInitializer()`。
    - [ ] **模板绑定**: 使用 `v-if="isInitializing"` 在根节点显示加载状态，加载完成后再渲染主布局。
    - [ ] **服务使用**: 所有子组件或逻辑需要服务时，都通过 `services.value.modelManager` 的形式从 `ref` 中获取。
    - [ ] **清理**: 移除所有手动的、散落在 `onMounted` 里的初始化调用（如 `initBaseServices`），因为 `useAppInitializer` 已经统一处理。

## 4. 预期成果

-   **无"幽灵"服务**：`Dexie` 将只在Web环境下被创建一次，Electron的渲染进程中不再有它的踪迹。
-   **清晰的数据流**：依赖关系变为 `useAppInitializer` -> `App.vue` -> `Components`，单向且清晰。
-   **健壮的初始化**：所有服务都在正确的时机、以正确的配置被创建。
-   **彻底解决状态不一致问题**：因为服务实例的创建逻辑是统一且唯一的。

这个计划将从根本上解决我们发现的架构问题，为项目未来的可维护性和可扩展性奠定坚实的基础。

## 5. 重构反思与后续决策

本次重构成功地将核心服务从单例模式转换为了工厂函数模式，解决了环境隔离和状态不一致的根本问题。然而，在修复因此产生的大量测试失败的过程中，我们也总结出了一些宝贵的经验和需要进一步完善的设计决策：

### 5.1 关于强制调用 `ensureInitialized()`

- **现状反思**: 当前设计要求调用者在获取 `Manager` 实例后，必须手动调用 `await manager.ensureInitialized()` 来完成异步初始化。这虽然将实例的创建和初始化过程解耦，但也暴露了内部实现细节，增加了调用者的负担。
- **优化方向**: 更理想的设计是让工厂函数（如 `createTemplateManager`）本身成为一个异步函数，内部处理完所有初始化逻辑后，直接返回一个完全可用的实例 `Promise<Manager>`。这样调用者只需 `await` 一次，接口更简洁、封装性更好。
- **决策**: **暂时接受**当前的设计，但将其标记为**未来可优化的点**。当前的核心任务是稳定重构后的代码。

### 5.2 关于错误处理：坚持"快速失败"原则

- **问题发现**: 重构后的 `TemplateManager` 在初始化时若遇到存储错误，会静默地降级使用内置模板，而不是抛出错误。
- **决策**: 这掩盖了底层的严重问题，违反了"快速失败"(Fail-fast)原则。我们决定**修正此行为**。`TemplateManager` 在初始化遇到存储访问等关键错误时，**必须向上抛出异常**。由应用的顶层逻辑来捕获并决定如何处理（如向用户报错、进入安全模式等）。

### 5.3 关于测试代码的严谨性

- **问题发现**: 部分旧的单元测试不够严谨，例如对动态生成的时间戳进行精确值比较，导致测试非常脆弱。
- **决策**: **修复这些不严谨的测试**。在断言中应使用 `expect.objectContaining` 进行部分匹配，或对动态值只做类型检查，而不是值检查，以增强测试的稳定性和可靠性。

## 6. 详细修改清单

根据代码审查，以下是为完成本次重构需要进行的具体代码修改。

### **阶段一：改造 Core 包**

1.  **文件**: `packages/core/src/services/storage/factory.ts`
    - [ ] **删除** (约 L125): `export const storageProvider = StorageFactory.createDefault();`

2.  **文件**: `packages/core/src/services/model/manager.ts`
    - [ ] **删除** (约 L427): `export const modelManager = ...`
    - [ ] **修改** (约 L428): `export function createModelManager(storageProvider?: IStorageProvider): ModelManager`
        - **改为**: `export function createModelManager(storageProvider: IStorageProvider): ModelManager`
        - **移除**: `storageProvider = storageProvider || StorageFactory.createDefault();`

3.  **文件**: `packages/core/src/services/template/manager.ts`
    - [ ] **删除** (约 L300): `export const templateManager = ...`

4.  **文件**: `packages/core/src/services/history/manager.ts`
    - [ ] **删除** (约 L230): `export const historyManager = ...`

5.  **文件**: `packages/core/src/services/data/manager.ts`
    - [ ] **删除** (约 L80): `export const dataManager = ...`
    - [ ] **修改** (构造函数): `constructor()` -> `constructor(modelManager: IModelManager, templateManager: ITemplateManager, historyManager: IHistoryManager)`
    - [ ] **修改** (工厂函数): `createDataManager()` -> `createDataManager(modelManager: IModelManager, templateManager: ITemplateManager, historyManager: IHistoryManager)`

### **阶段二：净化 UI 包**

6.  **文件**: `packages/ui/src/index.ts`
    - [ ] **删除** (约 L45-53):
        ```typescript
        export {
            templateManager,
            modelManager,
            historyManager,
            dataManager,
            storageProvider,
            createLLMService,
            createPromptService
        } from '@prompt-optimizer/core'
        ```
    - [ ] **新增**: 导出 `createDataManager` 等其他必要的工厂函数。

### **阶段三：创建统一的应用初始化器**

7.  **文件**: `packages/ui/src/composables/useAppInitializer.ts` (新建)
    - [ ] **创建文件**并实现以下逻辑：
        - 导入所有 `create...` 工厂函数和 `useServiceInitializer`。
        - 定义 `services` 和 `isInitializing` refs。
        - 在 `onMounted` 中：
            - 创建 `storageProvider`。
            - 创建所有服务实例 (`modelManager`, `templateManager` 等)。
            - 调用 `useServiceInitializer`。
            - 将所有服务实例聚合到 `services` ref 中。
            - 更新 `isInitializing` 状态。

### **阶段四：重构应用入口**

8.  **文件**: `packages/web/src/App.vue` & `packages/extension/src/App.vue`
    - [ ] **移除**: 所有对 `modelManager`, `templateManager`, `historyManager` 等服务单例的导入。
    - [ ] **替换**:
        - **旧**: `import { modelManager, ... } from '@prompt-optimizer/ui'`
        - **新**: `import { useAppInitializer } from '@prompt-optimizer/ui'`
    - [ ] **调用**: `const { services, isInitializing } = useAppInitializer();`
    - [ ] **包裹**: 在模板的根元素上使用 `v-if="!isInitializing"`，并添加一个 `v-else` 的加载状态。
    - [ ] **传递**: 将 `services.value` 作为 props 传递给需要的子组件，或在 `composable` 中使用 `services.value.modelManager` 等。
    - [ ] **清理**: 删除 `onMounted` 中手动的初始化逻辑。 