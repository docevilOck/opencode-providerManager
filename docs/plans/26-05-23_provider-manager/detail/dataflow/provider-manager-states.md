# Provider Manager 状态数据流

## 回指

- 数据流总览：`provider-manager-overview.md`
- 状态枚举：`../structures/provider-manager-states.md`

## 状态持有者

| 状态 | 持有者 | 修改者 | 只读方 |
| --- | --- | --- | --- |
| `activePage` | `PageShellState` | `PageStateService.activateSidebarPage` | shell renderer、shortcut renderer |
| `sidebarCursorPage` | `PageShellState` | `PageStateService.moveSidebarCursor` | sidebar renderer、status line renderer |
| `focusRegion` | `PageShellState` | shell/modal/page handlers | key dispatcher |
| `pageStates.provider` | `PageShellState` | provider page list handler | provider page renderer |
| `pageStates.agents` | `PageShellState` | agents page list handler | agents page renderer |
| `modalState` | `PageShellState` | modal open/close handlers | key dispatcher、modal renderer |
| `ProviderEditDraft` | provider edit screen | edit field/modal/save handlers | validator、writer |
| `AgentModelDraft` | agent modal | modal step handlers | save payload builder |

## 分发规则

### 顶层按焦点分发

```text
key event
  -> focusRegion
    sidebar -> sidebar handler
    content -> activePage handler
    modal   -> modalState.kind handler
```

### content 按 activePage 分发

```text
content key event
  -> activePage
    provider -> ProviderHomeScreen
    agents   -> AgentModelConfigScreen
```

### modal 按 kind 分发

```text
modal key event
  -> modalState.kind
    fetch-models          -> FetchModelsModal
    agent-model-picker    -> AgentModelPickerModal
    protocol-select       -> ProtocolSelectModal
    model-config-defaults -> ModelConfigDefaultsModal
    leave-confirm         -> LeaveConfirmModal
    provider-test         -> ProviderTestModal
```

## 状态迁移

| 数据 | 迁移前 | 事件 | 迁移后 | 输出 |
| --- | --- | --- | --- | --- |
| shell | `sidebar/provider` | `Enter` | `content/provider` | provider 列表获焦 |
| shell | `content/provider` | `esc` | `sidebar/provider` | sidebar 光标回 active page |
| shell | `sidebar/provider` | `Down` | `sidebar/agents cursor` | 状态栏提示确认切页 |
| shell | `sidebar/agents cursor` | `Enter` | `content/agents` | agents 列表获焦 |
| provider edit | draft clean | 字段输入 | draft dirty | 更新字段值 |
| provider edit | draft dirty | `Ctrl+S` 校验失败 | draft dirty + errors | 字段级错误 |
| provider edit | draft dirty | `Ctrl+S` 成功 | provider 首页 | 列表重读 |
| fetch modal | `loading` | 请求成功 | `success` | 模型候选 |
| fetch modal | `success` | `Enter` | modal closed | draft.models 更新 |
| agent modal | `select-provider` | `Enter` | `select-model` | provider 选中，旧模型清空 |
| agent modal | `select-model` | `Enter` 且有 reasoning | `select-reasoning` | model 选中 |
| agent modal | `select-model` | `Enter` 且无 reasoning | modal closed | 全局 agent 配置写入 |
| agent modal | `select-reasoning` | `Enter` | modal closed | 全局 agent 配置写入 |

## 并发与异步边界

- 获取模型请求是异步边界；请求发起后 modal 进入 `loading`，请求结果只能更新当前仍打开且 provider 参数匹配的 modal。
- provider 测试请求是异步边界；测试取消后必须留下 `cancelled` 状态痕迹并关闭 modal。
- 配置写入必须串行化：同一时间只允许一个保存流程写 provider 配置或全局 agent 配置。
- TUI key event 不直接写配置，只能修改 draft、shell state 或触发 service 保存。

## 状态复位

- modal 正常关闭：`modalState=null`，`focusRegion='content'`。
- provider 编辑取消且无 dirty：释放 `ProviderEditDraft`，回 provider 首页。
- provider 编辑取消且 dirty：先进入 `leave-confirm`，确认后释放 draft。
- agent modal 取消：释放 `AgentModelDraft`，不写全局配置。
