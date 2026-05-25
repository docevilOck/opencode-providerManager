# Agent 批量切换 Provider 实现计划

> **给代理型执行者：** 必需子技能：使用 `superpowers:executing-plans` 按任务逐步实现这个计划。步骤使用复选框（`- [ ]`）语法跟踪。

**目标：** 在 agents 页面通过 `Ctrl+E` 进入批量选择模式，选择多个 agent 后按 `Enter` 从可覆盖这些 agent 当前模型集合的 provider 中选择目标 provider，并把选中 agent 的模型写回为 `provider/model`。

**架构：** 新增 agents 批量选择状态与 provider 选择 modal。可用 provider 由选中 agents 的当前 `model` 集合与每个 provider 的 `models.id` 集合求包含关系得到。批量保存复用全局 agent 写回路径，保持单 agent picker 不变。

**技术栈：** TypeScript、Solid TUI、Vitest、现有 `ProviderManagerData` / `PageShellState` / `writeGlobalAgentConfig`。

---

### 任务 1：状态和渲染

**文件：**
- 修改：`plugin/src/types/tui.ts`
- 修改：`plugin/src/tui/agent-row.ts`
- 修改：`plugin/src/tui/agent-model-config-screen.ts`
- 测试：`plugin/src/tui/tui-rendering.test.ts`

- [ ] **步骤 1：扩展类型**

在 `PageShellState` 增加 `agentBulkEdit`，包含 `enabled` 与 `selectedAgentNames`；在 `ModalState` 增加 `agent-provider-switch`，包含 `selectedIndex`、`providerNames`、`agentNames`。

- [ ] **步骤 2：更新 agent 行渲染**

`renderAgentRow` 支持批量选择参数，启用时在 agent 名前显示 `[ ]` / `[x]`；model 显示为 `provider/model`，缺失 provider 或 model 时保持 `<not set>`。

- [ ] **步骤 3：更新 agents 页渲染**

`renderAgentModelConfigScreen` 透传批量选择状态，页脚提示包含 `[Ctrl+E] Bulk Provider`，批量模式下提示 `[Space] Toggle   [a] All   [Enter] Provider   [esc] Cancel`。

- [ ] **步骤 4：补渲染测试**

覆盖 `OpenAI/gpt-5` 全称显示、批量模式 checkbox、选中状态。

### 任务 2：批量 provider 候选与保存

**文件：**
- 新建：`plugin/src/core/agent-provider-switch-service.ts`
- 测试：`plugin/src/core/agent-provider-switch-service.test.ts`
- 修改：`plugin/src/tui/provider-manager-shell.ts`
- 测试：`plugin/src/tui/provider-manager-shell.test.ts`

- [ ] **步骤 1：实现候选计算**

输入 agents、providers、selectedAgentNames，返回模型集合被完整覆盖的 provider 名称；忽略缺失 model 的 agent。

- [ ] **步骤 2：实现配置生成**

输入选中 agents 和 providerName，生成每个 agent 的 `{ model: `${providerName}/${agent.model}` }`，保留已有 `reasoningEffort`。

- [ ] **步骤 3：实现批量保存 handler**

在 shell 层新增 `handleAgentProviderSwitchAction`，逐个调用 `saveAgentModelConfig`，写完 reload 并回到 agents 页。

- [ ] **步骤 4：补服务和 shell 测试**

覆盖 provider 覆盖性过滤、保存多个 agent、保留 reasoning effort。

### 任务 3：真实 TUI 交互接入

**文件：**
- 修改：`plugin/src/index.tsx`
- 测试：`plugin/src/index.test.ts`

- [ ] **步骤 1：新增 `Ctrl+E` 入口**

仅 agents 页 content 区生效，进入批量模式并默认选中当前行 agent。

- [ ] **步骤 2：新增批量模式快捷键**

`Space` 切换当前 agent；`a` 全选全部 agents；`Enter` 打开 provider 候选 modal；`Esc` 退出批量模式。

- [ ] **步骤 3：新增 provider 候选 modal 操作**

modal 中 `Up/Down` 移动、`Enter` 确认保存、`Esc` 关闭；无可用 provider 时显示明确错误。

- [ ] **步骤 4：补命令注册和 modal 渲染测试**

覆盖 `provider-manager.agent-bulk.start/toggle/all/confirm` 命令注册、provider 候选 modal 文本。

### 任务 4：验证

**文件：**
- 修改：按测试失败修正涉及文件

- [ ] **步骤 1：运行针对性测试**

运行：`bun run test src/core/agent-provider-switch-service.test.ts src/tui/tui-rendering.test.ts src/tui/provider-manager-shell.test.ts src/index.test.ts`

- [ ] **步骤 2：运行构建**

运行：`bun run build`

- [ ] **步骤 3：运行全量测试**

运行：`bun run test`
