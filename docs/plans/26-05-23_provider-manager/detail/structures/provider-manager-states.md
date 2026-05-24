# Provider Manager 状态枚举与分发约束

## 范围

本文定义实现阶段需要显式建模的状态枚举、分发字段和状态迁移约束。结构总览见 `provider-manager-context.md`。

## PageId

```ts
type PageId = 'provider' | 'agents'
```

- 持有者：`PageShellState.pages`、`activePage`、`sidebarCursorPage`。
- 修改者：`PageStateService`。
- 分发方式：按 `activePage` 做右侧内容、标题、底部操作栏分发；按 `sidebarCursorPage` 做 sidebar 光标渲染。

## FocusRegion

```ts
type FocusRegion = 'sidebar' | 'content' | 'modal'
```

- `sidebar`：`Up/Down` 移动 sidebar 光标，`Enter` 提交切页或回到当前 page 内容区，`esc` 关闭界面。
- `content`：按 active page 分发给 provider 或 agents 内容区。
- `modal`：全部按键先交给当前 `modalState`，shell 不处理 sidebar 与 page 导航。

## ModalState

```ts
type ModalState =
  | { kind: 'provider-test'; providerName: string; phase: ProviderTestPhase }
  | { kind: 'leave-confirm'; target: 'provider-edit' }
  | { kind: 'protocol-select'; selectedIndex: number }
  | { kind: 'fetch-models'; phase: FetchModelsPhase; selectedIndex: number; selectedModelIds: Set<string> }
  | { kind: 'model-config-defaults'; selectedField: string }
  | { kind: 'agent-model-picker'; draft: AgentModelDraft }
```

- 持有者：`PageShellState.modalState`。
- 修改者：打开模态的 screen 与对应 modal handler。
- 分发方式：先按 `kind` 分发，再按内部 `phase` 或 `draft.step` 分发。
- 约束：`modalState !== null` 时 `focusRegion` 必须为 `modal`。

## ProviderApiType

```ts
type ProviderApiType =
  | 'openai-responses'
  | 'openai-chat'
  | 'openai-compatible-chat'
  | 'anthropic-messages'
  | 'gemini'
  | 'bedrock-converse'
```

- 持有者：`ManagedProviderSummary.apiType`、`ProviderEditDraft.apiType`。
- 修改者：协议选择弹窗确认后修改 draft。
- 约束：修改后必须让 `ProviderEditDraft.protocolChanged=true`，保存前重新校验模型集合和默认模型。

## FetchModelsPhase

```ts
type FetchModelsPhase = 'loading' | 'success' | 'failure'
```

- 持有者：`ModalState.kind='fetch-models'`。
- 修改者：获取模型异步任务完成或失败后更新。
- 分发方式：`loading` 只接受取消；`success` 接受选择、全选、确认；`failure` 接受关闭。
- 约束：`success` 确认前的选择只存在 modal 内，确认后才写入 `ProviderEditDraft.models`。

## AgentModelStep

```ts
type AgentModelStep = 'select-provider' | 'select-model' | 'select-reasoning'
```

- 持有者：`AgentModelDraft.step`。
- 修改者：`AgentModelPickerModal`。
- 分发方式：每个 step 复用搜索、上下移动、确认和返回处理，但候选来源不同。
- 约束：模型不支持 reasoning 时，`select-model` 确认后直接保存并关闭弹窗。

## 状态迁移约束

| 入口状态 | 事件 | 出口状态 | 必须检查 |
| --- | --- | --- | --- |
| `focusRegion=sidebar` | `Enter` | `content` | 提交 `activePage=sidebarCursorPage` |
| `focusRegion=content` | `esc` | `sidebar` | `sidebarCursorPage=activePage` |
| `focusRegion=content` | 打开弹窗 | `modal` | 写入非空 `modalState` |
| `focusRegion=modal` | 弹窗关闭 | `content` | 清空 `modalState` |
| `AgentModelDraft.select-provider` | 确认 provider | `select-model` | 清空旧 model/reasoning |
| `AgentModelDraft.select-model` | 确认 model | `select-reasoning` 或保存 | 检查 reasoning 候选是否存在 |
| `ProviderEditDraft` | 保存 | 返回 provider 首页 | 校验 name/baseUrl/apiType/defaultModel |

## 下游引用

- 结构总览：`provider-manager-context.md`
- 数据流状态说明：`../dataflow/provider-manager-states.md`
- 流程图：`../flows/provider-manager-main.md`
