# Provider Manager 数据流总览

## 范围

本文串联 `/provider` 首阶段的主数据链路：配置读取、provider 首页渲染、sidebar 切页、provider 编辑保存、agents 模型配置保存。结构定义见 `../structures/provider-manager-context.md`，状态枚举见 `../structures/provider-manager-states.md`。

## 本次落地的数据流

| 数据流 | 入口 | 主要转换点 | 出口 |
| --- | --- | --- | --- |
| `/provider` 打开 | slash command handler | 读取配置快照、标准化 provider、合并 agents、初始化 shell | TUI 初始 view model |
| sidebar 切页 | shell key handler | `sidebarCursorPage` 更新、`activePage` 提交、page state 保存/恢复 | 新 active page 内容区 |
| provider 编辑保存 | provider edit screen | draft 校验、provider 配置写入、列表重读与重定位 | provider 首页刷新 |
| provider 获取模型 | provider edit modal | 请求参数校验、模型结果选择、模型默认配置合并 | `ProviderEditDraft.models` |
| agents 模型保存 | agent model modal | provider/model/reasoning 候选选择、全局 agent 覆写生成 | 全局 `agent` 配置段 |

## 主链路

```text
/provider handler
  -> OpencodeConfigReader
  -> OpencodeConfigSnapshot
  -> ProviderManagerService -> ManagedProviderSummary[]
  -> AgentModelConfigService -> AgentModelSummary[]
  -> ProviderManagerShell -> PageShellState
  -> ProviderHomeViewModel
```

## 数据边界

- 原始配置只进入 `OpencodeConfigSnapshot`，后续 TUI 不直接读取原始 JSON。
- provider 首页、provider 编辑页和 agents 候选集共享 `ManagedProviderSummary[]`。
- agents 列表的来源是内置 agents 与全局 `agent` 配置段，保存出口也是全局 `agent` 配置段。
- provider 编辑草稿与 agent 模型草稿都是会话态；确认保存前不写配置。
- `PageShellState` 只保存界面导航状态，不持有原始配置。

## 错误出口总览

| 位置 | 错误 | 出口状态 |
| --- | --- | --- |
| 配置读取 | 文件缺失、JSON 解析失败、权限失败 | provider 首页错误状态，sidebar 保持可见 |
| provider 标准化 | provider 字段缺失或不合法 | 行状态标记 `warn` 或页面错误摘要 |
| provider 编辑保存 | name/baseUrl/apiType/defaultModel 校验失败 | 留在编辑页，写入 `validationErrors` |
| 获取模型 | 缺少 baseUrl/apiKey/apiType 或请求失败 | fetch modal 失败态或短提示 |
| agents 保存 | provider/model 候选无效、写全局配置失败 | 弹窗或 agents 页状态提示 |

## 子文档

- `provider-manager-details.md`：逐步骤字段流转与模块协作。
- `provider-manager-states.md`：关键状态迁移、状态持有者和分发约束。
- `provider-manager-errors.md`：错误路径、回退、重试和状态复位。

## 流程图引用

- `../flows/provider-manager-overview.md`
- `../flows/provider-manager-main.md`
- `../flows/provider-manager-main.puml`

## 阅读顺序

1. `../structures/provider-manager-context.md`
2. 本文
3. `provider-manager-details.md`
4. `provider-manager-states.md`
5. `provider-manager-errors.md`
6. `../flows/provider-manager-overview.md`
