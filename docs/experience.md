# 项目核心经验总结

## 📋 核心知识点
- [架构设计](#架构设计) - API集成、模块化结构
- [错误处理](#错误处理) - 常见问题与解决方案  
- [测试规范](#测试规范) - 关键测试要点
- [开发实践](#开发实践) - Vue、工具配置、最佳实践
- [重要Bug修复](#重要bug修复) - 安全漏洞与性能问题

---

## 架构设计

### API集成核心原则
```js
// 统一OpenAI兼容格式
export default {
  baseURL: "https://api.openai.com/v1", 
  models: ["gpt-4", "gpt-3.5"],
  apiKey: import.meta.env.VITE_API_KEY // Vite项目必须使用import.meta.env
}
```

### 模块化结构
```
src/
├─ api/        # API封装层
├─ services/   # 业务逻辑  
├─ config/     # 配置管理
├─ components/ # UI组件
└─ prompts/    # 提示模板
```

### LLM服务设计要点
- **接口标准化**: 统一使用OpenAI格式
- **多服务商兼容**: Provider标识区分
- **敏感信息管理**: 环境变量+本地加密存储
- **用户自管理API密钥**: 避免后端开销，保持应用简单性

---

## 错误处理

### 核心处理策略
```js
// 统一错误处理模板
try {
  await apiCall();
} catch (err) {
  console.error("[API Error]", err.context);
  throw new Error("友好的错误提示");
}
```

### 常见问题速查表
| 问题 | 解决方案 | 日期 |
|------|----------|------|
| 模板ID与模型Key混淆 | 明确功能ID与API Key分离 | 2024-03-22 |
| 状态同步异常 | 增加状态同步处理函数 | 2024-03-22 |
| 全局Provider污染 | 显式传递模型参数 | 2024-03-22 |

---

## 测试规范

### 关键要点
1. **环境变量**: Vite项目使用 `import.meta.env.VITE_*`
2. **测试隔离**: 使用动态唯一标识符避免冲突
3. **错误场景**: 覆盖网络错误、无效Token等异常
4. **状态管理**: 独立测试数据库、正确清理状态

### 测试模板
```js
describe("功能测试", () => {
  beforeEach(() => {
    // 使用唯一标识符
    testId = `test-${Date.now()}`;
  });
  
  it("应正确处理异常", async () => {
    await expect(func()).rejects.toThrow("预期错误");
  });
});
```

---

## 开发实践

### Vue开发规范
```js
// ✅ 正确: 组件顶层调用Composable
const { data } = useFetch();

// ❌ 错误: 生命周期内调用
onMounted(() => {
  const { data } = useFetch(); // 禁止
});
```

### 工具配置
```bash
# 常用NPM命令
npm outdated          # 检查更新
ncu -u "eslint*"      # 安全更新指定包
npm run test          # 每次修改后必须执行
```

### 流式处理最佳实践
```js
// 统一流式处理器
const handlers = {
  onToken: (token) => result.value += token,
  onComplete: () => isLoading.value = false,
  onError: (error) => toast.error(error.message)
};
```

---

## 重要Bug修复

### 安全漏洞修复 (2024-12-20)
| Bug类型 | 风险等级 | 修复状态 |
|---------|----------|----------|
| UI配置导入验证不充分 | 中 | ✅ 已修复 |
| 数据迁移竞态条件 | 中 | ✅ 已修复 |
| 测试覆盖缺失 | 高 | ✅ 已修复 |

#### 关键修复示例
```ts
// UI配置导入安全验证
for (const [key, value] of Object.entries(typedData.userSettings)) {
  // 白名单验证
  if (!UI_SETTINGS_KEYS.includes(key as any)) {
    console.warn(`跳过未知的UI配置键: ${key}`);
    continue;
  }
  // 类型验证
  if (typeof value !== 'string') {
    console.warn(`跳过无效类型 ${key}: ${typeof value}`);
    continue;
  }
  await this.storage.setItem(key, value);
}
```

---

## 核心经验要点

### 配置管理
- 业务逻辑与API配置解耦
- 支持动态配置更新
- 环境变量使用Vite规范

### 错误处理
- 开发环境保留完整堆栈
- 生产环境友好提示+日志
- 统一错误处理机制

### 测试策略  
- 测试用例隔离
- 覆盖边界条件
- Mock最小必要依赖

### 安全考虑
- 输入验证白名单
- 防止原型污染
- 数据迁移原子性

### 性能优化
- 流式处理提升体验
- 组件懒加载
- 合理状态管理