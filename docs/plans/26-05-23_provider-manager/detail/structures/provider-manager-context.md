# Provider Manager 结构体总览

## 范围

本文定义 `/provider` 首阶段实现需要落地的核心状态结构、配置快照、provider 摘要、agent 摘要和编辑草稿。对应架构文档：`../../architecture/provider-manager-extension.md`。

## 结构清单

| 结构 | 类型 | 落地模块 | 职责 |
| --- | --- | --- | --- |
| `OpencodeConfigSnapshot` | 新增 | `types/provider.ts` | 承载一次配置读取的原始快照 |
| `ManagedProviderSummary` | 新增 | `types/provider.ts` | Provider 首页列表和候选集的标准化行数据 |
| `ProviderModelConfig` | 新增 | `types/provider.ts` | 单个模型的能力与默认参数 |
| `ProviderEditDraft` | 新增 | `types/provider.ts` | Provider 编辑页的会话态草稿 |
| `PageShellState` | 新增 | `types/tui.ts` | page shell 的 active page、sidebar 光标、焦点和模态态 |
| `PageContentState` | 新增 | `types/tui.ts` | 单个 page 的选中项和滚动位置 |
| `AgentModelSummary` | 新增 | `types/agent.ts` | agents 列表中单个 agent 的模型绑定摘要 |
| `AgentModelDraft` | 新增 | `types/agent.ts` | agents 模型配置弹窗的三阶段临时态 |
| `ModelOptionSet` | 新增 | `types/agent.ts` | provider/model/reasoning 候选集 |
| `ValidationIssue` | 新增 | `types/tui.ts` | 字段级与流程级校验错误 |

## 结构定义

### OpencodeConfigSnapshot

```ts
type OpencodeConfigSnapshot = {
  providersJson: unknown
  authJson: unknown
  settingsJson: unknown
  pluginJson: unknown
  globalOpencodeJson: unknown
  builtinAgents: BuiltinAgentDefinition[]
  loadedAt: number
}
```

- 生命周期：`/provider` 打开时创建；provider 保存、agent 保存或重新读取后整体替换。
- 所有权：`OpencodeConfigReader` 创建，`ProviderManagerService` 与 `AgentModelConfigService` 只读消费。
- 写入方：无字段级写入；需要刷新时重新生成新快照。
- 状态归属：属于服务层输入，不属于 TUI 状态。

### ManagedProviderSummary

```ts
type ManagedProviderSummary = {
  name: string
  id: string
  displayName: string
  baseUrl: string
  apiType: ProviderApiType
  modelCount: number
  defaultModel: string | null
  isDefault: boolean
  authStatus: 'ok' | 'missing' | 'invalid'
  status: 'active' | 'ready' | 'warn' | 'error'
  source: 'providers-json' | 'plugin-json'
  models: ProviderModelConfig[]
  createdOrder: number
}
```

- 生命周期：每次读取 provider 配置后由 `ProviderNormalizer` 生成。
- 所有权：`ProviderManagerService` 持有当前列表；TUI 行渲染只读使用。
- 修改方：不原地修改；新增、编辑、删除、设置默认后重新标准化。
- 关键约束：`name` 是唯一主键，唯一性比较大小写不敏感；显示保留最近保存的原始大小写。

### ProviderModelConfig

```ts
type ProviderModelConfig = {
  id: string
  contextWindow: string
  maxOutput: string
  inputTypes: Array<'text' | 'image'>
  reasoningEfforts: ReasoningEffort[]
}
```

- 生命周期：跟随 `ManagedProviderSummary.models`。
- 所有权：provider 配置拥有；agents 候选生成只读引用。
- 修改方：provider 编辑页获取模型弹窗和模型默认配置弹窗确认后更新 provider 配置。
- 关键约束：`defaultModel` 必须属于同一 provider 的 `models.id` 集合；无模型时可为空。

### ProviderEditDraft

```ts
type ProviderEditDraft = {
  originalName: string | null
  name: string
  baseUrl: string
  apiType: ProviderApiType
  apiKey: string
  defaultModel: string | null
  models: ProviderModelConfig[]
  modelConfigDefaults: ProviderModelConfigDefaults
  dirtyFields: Set<ProviderEditField>
  validationErrors: ValidationIssue[]
  protocolChanged: boolean
}
```

- 生命周期：进入新增或编辑页时创建；保存、取消或确认离开后释放。
- 所有权：`ProviderEditScreen` 持有，保存时交给 `ProviderManagerService`。
- 修改方：字段编辑、协议选择弹窗、获取模型弹窗、模型默认配置弹窗。
- 状态归属：全部是编辑会话态；保存前不得写回配置。
- 关键约束：`apiType` 变化后必须标记 `protocolChanged=true`，保存前重新校验模型集合和 `defaultModel`。

### PageShellState

```ts
type PageShellState = {
  pages: PageId[]
  activePage: PageId
  sidebarCursorPage: PageId
  focusRegion: 'sidebar' | 'content' | 'modal'
  pageStates: Record<PageId, PageContentState>
  modalState: ModalState | null
  statusLine: StatusLine | null
}
```

- 生命周期：`/provider` 打开时创建；关闭 plugin 界面时释放。
- 所有权：`ProviderManagerShell` 持有，`PageStateService` 负责状态迁移。
- 修改方：sidebar 按键、右侧内容区按键、模态弹窗打开/关闭。
- 关键约束：`activePage` 与 `sidebarCursorPage` 是双状态；只有 sidebar 下 `Enter` 能提交切页。

### PageContentState

```ts
type PageContentState = {
  selectedIndex: number
  scrollOffset: number
}
```

- 生命周期：跟随 `PageShellState.pageStates`。
- 所有权：`PageStateService`。
- 修改方：对应 page 的 `Up/Down`、列表刷新后的重定位逻辑。
- 关键约束：provider 与 agents 分别维护，不因切换 page 重置另一个 page。

### AgentModelSummary

```ts
type AgentModelSummary = {
  name: string
  provider: string | null
  model: string | null
  reasoningEffort: ReasoningEffort | null
  status: 'default' | 'override' | 'incomplete'
  source: 'builtin' | 'global'
  isBuiltin: boolean
  displayOrder: number
}
```

- 生命周期：每次加载内置 agents 与全局 agent 配置后生成。
- 所有权：`AgentModelConfigService` 持有列表，`AgentModelConfigScreen` 只读渲染。
- 修改方：不原地修改；弹窗保存后重读或重新合并生成。
- 关键约束：同名 agent 使用全局显式配置覆盖内置默认；未配置 model 的 agent 仍显示为 `incomplete`。

### AgentModelDraft

```ts
type AgentModelDraft = {
  agentName: string
  provider: string | null
  model: string | null
  reasoningEffort: ReasoningEffort | null
  step: 'select-provider' | 'select-model' | 'select-reasoning'
  searchText: string
  candidateItems: SelectableOption[]
  selectedIndex: number
}
```

- 生命周期：agents 页按 `Enter` 打开弹窗时创建；最终确认或取消时释放。
- 所有权：`AgentModelPickerModal`。
- 修改方：弹窗内字符输入、`Backspace`、`Up/Down`、`Enter`、`esc`。
- 状态归属：临时态；最终确认前不得写入全局 `agent` 配置段。
- 关键约束：切换 provider 后必须清空旧 `model` 与 `reasoningEffort`。

### ModelOptionSet

```ts
type ModelOptionSet = {
  providers: SelectableOption[]
  modelsByProvider: Record<string, SelectableOption[]>
  reasoningByModel: Record<string, SelectableOption[]>
}
```

- 生命周期：打开 agent 弹窗前由 `AgentModelOptionService` 生成。
- 所有权：`AgentModelPickerModal` 只读使用。
- 来源：优先来自当前标准化 provider 列表；无缓存时从全局 provider 配置读取。
- 关键约束：不维护第二套 provider/model 数据源。

### ValidationIssue

```ts
type ValidationIssue = {
  field?: string
  code: string
  message: string
  severity: 'error' | 'warn'
}
```

- 生命周期：单次校验产生；字段修正或页面刷新后丢弃。
- 所有权：产生校验的 screen 或 service。
- 读写方：校验器写入，TUI 读取渲染字段级错误或状态提示。

## 状态读写边界

| 状态 | 创建者 | 修改者 | 只读消费者 |
| --- | --- | --- | --- |
| 配置快照 | `OpencodeConfigReader` | 无原地修改 | provider/agent service |
| provider 标准化列表 | `ProviderNormalizer` | 重新生成 | home screen、agent option service |
| page shell 状态 | `ProviderManagerShell` | `PageStateService` | sidebar、各 page screen |
| provider 编辑草稿 | `ProviderEditScreen` | 编辑页与其弹窗 | validator、writer |
| agent 模型草稿 | `AgentModelPickerModal` | 弹窗状态机 | agent config service |
| 校验错误 | validator/service | validator/service | TUI renderer |

## 下游引用

- 数据流：`../dataflow/provider-manager-overview.md`
- 流程图：`../flows/provider-manager-overview.md`
