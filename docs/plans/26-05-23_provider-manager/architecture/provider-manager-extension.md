# Provider Manager Plugin 实现架构

## 1. 目标

- 在 opencode 内提供统一的 `/provider` 入口
- 通过 plugin 内 TUI 管理 provider
- 首阶段先实现带 page shell 的 provider 首页、provider 编辑页，以及 agents 模型配置页
- `/provider` 入口同时承担 provider 管理与 subagent 模型绑定配置；两者共享 provider/model 候选数据，但落盘目标不同

## 2. 入口

- Slash command：`/provider`
- 输入 `/provider` 后进入带左侧 sidebar 的 Provider Manager page shell
- 初始 active page 为 `provider`，初始焦点落在 sidebar；按 `Enter` 后进入右侧 active page 内容区
- sidebar 首阶段固定包含 `provider` / `agents` 两个 page，切换 page 必须通过 `Enter` 确认

## 3. 代码结构

```text
plugin/
├─ package.json
└─ src/
   ├─ index.ts
   ├─ tui/
   ├─ core/
   ├─ infra/
   └─ types/
```

建议细分：

```text
plugin/src/
├─ index.ts
├─ core/
│  ├─ provider-manager-service.ts
│  ├─ provider-normalizer.ts
│  ├─ provider-validator.ts
│  ├─ agent-model-config-service.ts
│  ├─ agent-model-option-service.ts
│  └─ page-state-service.ts
├─ infra/
│  ├─ path-resolver.ts
│  ├─ opencode-config-reader.ts
│  └─ opencode-config-writer.ts
├─ tui/
│  ├─ provider-manager-shell.ts
│  ├─ page-sidebar.ts
│  ├─ provider-home-screen.ts
│  ├─ provider-edit-screen.ts
│  ├─ agent-model-config-screen.ts
│  ├─ agent-model-picker-modal.ts
│  ├─ provider-row.ts
│  └─ agent-row.ts
└─ types/
   ├─ provider.ts
   ├─ agent.ts
   └─ tui.ts
```

## 4. 读取来源

- `~/.config/opencode/providers.json`
- `~/.config/opencode/auth.json`
- `~/.config/opencode/settings.json`
- `~/.config/opencode/plugins/provider-manager/provider-manager.json`
- `~/.config/opencode/opencode.json` / `~/.config/opencode/opencode.jsonc` 中的 `agent` 配置段

读取职责：

- provider 首页与 provider 编辑页读取 provider/auth/settings/plugin 私有配置，并写回 provider 相关配置
- agents 页读取 opencode 内置 agents 与全局 `opencode.json/opencode.jsonc` 的 `agent` 配置段
- agents 页只写回全局 `agent` 配置段中的模型相关字段，不写 provider 配置，不创建/删除 agent
- agents 页的 provider/model/reasoning 候选集优先复用 provider 首页已经标准化后的 provider 数据；无缓存时再从全局配置重新读取

## 5. 架构总览

Source: `docs/plans/26-05-23_provider-manager/architecture/provider-manager-extension.puml`

```text
+-------------------+       +----------------------------------+
|   opencode slash  | ----> | provider-manager plugin          |
|   router          |       | index.ts                         |
+-------------------+       +----------------+-----------------+
                                             |
                                             v
                              +-------------------------------+
                              | /provider handler             |
                              +---------------+---------------+
                                              |
                                              v
                              +-------------------------------+
                              | ProviderManagerShell          |
                              | activePage + focusRegion      |
                              +---------------+---------------+
                                              |
                +----------------------+----------------------+
                |                                             |
                v                                             v
      +---------------------------+              +---------------------------+
      | provider page             |              | agents page               |
      | ProviderManagerService    |              | AgentModelConfigService   |
      +-------------+-------------+              +-------------+-------------+
                    |                                            |
                    v                                            v
      +---------------------------+              +---------------------------+
      | providers/auth/settings   |              | builtin agents + global   |
      | plugin provider config    |              | opencode agent config     |
      +-------------+-------------+              +-------------+-------------+
                    |                                            |
                    +----------------------+---------------------+
                                           v
                              +---------------------------+
                              | shared provider/model     |
                              | option normalization      |
                              +---------------------------+
```

## 6. 模块

- `src/index.ts`：注册 `/provider` 并挂载 plugin 入口
- `src/core/provider-manager-service.ts`：加载和标准化 provider
- `src/core/provider-normalizer.ts`：整理 provider 数据
- `src/core/provider-validator.ts`：校验 provider 名称、URL、协议类型、默认模型和模型集合
- `src/core/agent-model-config-service.ts`：合并内置 agents 与全局 agent 配置，生成 agents 页列表并处理模型配置保存
- `src/core/agent-model-option-service.ts`：基于 provider 数据生成 agent 弹窗里的 provider/model/reasoning 候选
- `src/core/page-state-service.ts`：维护 sidebar 光标、active page、focus region，以及各 page 的选中项和滚动位置
- `src/infra/opencode-config-reader.ts`：读取配置文件
- `src/infra/opencode-config-writer.ts`：写回 provider 配置和全局 agent 配置
- `src/infra/path-resolver.ts`：解析配置路径
- `src/tui/provider-manager-shell.ts`：渲染 page shell，协调 sidebar、右侧内容、底部操作栏和模态锁定态
- `src/tui/provider-home-screen.ts`：渲染 provider 首页
- `src/tui/page-sidebar.ts`：渲染左侧 page 侧边栏
- `src/tui/provider-edit-screen.ts`：渲染 provider 编辑页
- `src/tui/agent-model-config-screen.ts`：渲染 subagent 模型配置页
- `src/tui/agent-model-picker-modal.ts`：渲染 agent 模型选择弹窗
- `src/tui/agent-row.ts`：渲染 agent 行
- `src/tui/provider-row.ts`：渲染 provider 行

## 7. 数据模型

### 7.1 OpencodeConfigSnapshot

- `providersJson`
- `authJson`
- `settingsJson`
- `pluginJson`
- `globalOpencodeJson`
- `builtinAgents`

### 7.2 ManagedProviderSummary

- `name`
- `id`
- `displayName`
- `baseUrl`
- `apiType`
- `modelCount`
- `defaultModel`
- `isDefault`
- `authStatus`
- `source`

`apiType` 当前按协议类型建模，不按 provider 厂商名建模。首阶段文档约定支持：

- `openai-responses`
- `openai-chat`
- `openai-compatible-chat`
- `anthropic-messages`
- `gemini`
- `bedrock-converse`

### 7.3 ProviderHomeViewModel

- `pages`
- `activePage`
- `sidebarSelectedIndex`
- `focusRegion`
- `title`
- `items`
- `agents`
- `pageStates`
- `selectedIndex`
- `scrollOffset`
- `statusLine`
- `shortcutHints`

### 7.4 PageShellState

- `pages`：固定包含 `provider` / `agents`，未来可扩展同层 page
- `activePage`：右侧内容区当前实际显示的 page
- `sidebarCursorPage`：sidebar 当前光标停留的 page，可与 `activePage` 不同
- `focusRegion`：`sidebar` / `content` / `modal`
- `pageStates`：按 page 独立保存右侧内容区选中项和滚动位置
- `modalState`：当前模态弹窗状态；存在时锁定整个 page shell

状态规则：

- sidebar `Up/Down` 只移动 `sidebarCursorPage`，不改变 `activePage`
- sidebar `Enter` 才提交切页，并将焦点切到对应右侧内容区默认位置
- 右侧标题、内容区和底部操作栏全部跟随 `activePage`
- 从右侧内容区按 `esc` 返回 sidebar 时，sidebar 光标回到 `activePage`
- 模态弹窗打开时 `focusRegion=modal`，sidebar 和右侧 page 内容均不可操作

### 7.5 AgentModelSummary

- `name`
- `provider`
- `model`
- `reasoningEffort`
- `status`：`default` / `override` / `incomplete`
- `source`：`builtin` / `global`
- `isBuiltin`
- `displayOrder`

列表规则：

- 内置 agents 按内置默认顺序展示
- 全局配置中新增的非内置 agent 按配置出现顺序追加
- 同名 agent 由全局显式配置覆盖内置默认
- 未配置 model 的 agent 仍然展示，`model=<not set>`，`status=incomplete`

### 7.6 AgentModelDraft

- `agentName`
- `provider`
- `model`
- `reasoningEffort`
- `step`：`select-provider` / `select-model` / `select-reasoning`
- `searchText`
- `candidateItems`
- `selectedIndex`

保存规则：

- 弹窗流程结束前只保留临时态
- `esc` 中途退出不写入半成品配置
- 最终至少保存 `provider` 与 `model`
- 仅当当前模型支持推理强度时保存 `reasoningEffort`
- 最终写入全局 `opencode.json/opencode.jsonc` 的 `agent` 配置段

### 7.7 ProviderEditDraft

- `originalName`
- `name`
- `baseUrl`
- `apiType`
- `apiKey`
- `defaultModel`
- `models`
- `modelConfigDefaults`
- `dirtyFields`
- `validationErrors`

编辑规则：

- `apiType` 表示请求协议，不表示厂商名
- 修改 `apiType` 后，现有模型集合与 `defaultModel` 进入待确认状态，保存前必须重新校验
- 无模型时允许先保存基础配置，并暂时留空 `defaultModel`
- 模型配置弹窗只影响当前编辑会话内后续确认写入的模型默认参数

## 8. 界面文档

- [provider-home.md](/E:/Repo/opencode-providerManager/docs/plans/26-05-23_provider-manager/tui/provider-home.md)
- [provider-edit.md](/E:/Repo/opencode-providerManager/docs/plans/26-05-23_provider-manager/tui/provider-edit.md)

当前已确认的关键规则：

- `name` 作为 provider 唯一主键
- `name` 唯一性校验大小写不敏感
- 默认 provider 置顶，其余按创建顺序排列
- 首页先进入 page 侧边栏焦点，再通过 `Enter` 进入右侧内容区
- 侧边栏支持 `provider` / `agents` 两个 page
- agents page 读取的是 opencode agent 配置源，而不是 provider 配置源
- agents page 当前只面向全局 agent 配置和内置默认配置，不处理项目级 agent 定义
- agents page 的用户修改统一落盘到全局 `opencode.json/opencode.jsonc` 的 `agent` 配置段
- agents 的编辑交互使用单弹窗三阶段流程：provider -> model -> reasoning effort
- agents 页只允许配置模型相关字段，不负责 agent 的创建、删除和其他元数据编辑
- agents 列表显示所有可配置模型的现有 agent；未配置 model 的项也要显示为 `incomplete`
- agents 列表状态至少区分 `default`、`override`、`incomplete`
- agents 列表排序按“内置默认顺序 + 全局新增 agent 追加”处理，不按状态动态重排
- agents 弹窗里的 provider/model/reasoning 候选集与 provider 页面共享同一批全局 opencode 配置数据
- agents 弹窗优先复用 provider 页面已经标准化后的数据，避免维护第二套来源
- sidebar 使用“active page + 光标位置”双状态模型；切页必须按 `Enter` 确认
- 右侧标题、底部操作栏和内容区始终跟随 active page，不跟随 sidebar 待确认光标变化
- 当 sidebar 获焦且光标停在非 active page 上时，状态栏给出 `Press Enter to switch page` 一类轻提示
- sidebar 与右侧内容区分别维护独立滚动状态；page 间状态分别记忆
- 模态弹窗打开时锁定整个 page shell，禁止 sidebar 导航
- provider 列表支持上下键选中和滚动
- 底部操作栏固定
- 测试结果通过首页中心通知弹窗展示
- provider 编辑页支持协议选择、获取模型、模型默认配置弹窗、离开确认弹窗
- provider 获取模型弹窗加载/成功/失败状态均锁定编辑页其他按键
- agents 编辑不进入独立页面，统一使用居中三阶段弹窗

## 9. 关键流程

### 9.1 `/provider` 打开

1. slash router 调用 plugin `/provider` handler
2. `ProviderManagerService` 读取并标准化 provider 数据
3. `AgentModelConfigService` 读取内置 agents 与全局 agent 配置，生成 agents 列表摘要
4. `ProviderManagerShell` 初始化 `activePage=provider`、`focusRegion=sidebar`
5. 渲染 sidebar、provider 首页内容区、状态提示区和底部操作栏

### 9.2 sidebar 切页

1. sidebar 获焦时，`Up/Down` 只更新 `sidebarCursorPage`
2. 光标停在非 active page 时，状态栏提示 `Press Enter to switch page`
3. 按 `Enter` 后提交 `activePage`
4. shell 保存旧 page 的选中项和滚动位置，并恢复新 page 的历史状态
5. 焦点进入新 active page 的右侧内容区默认位置

### 9.3 provider 编辑保存

1. 编辑页维护 `ProviderEditDraft`
2. 字段编辑只更新 draft，不立即写配置
3. `Ctrl+S` 触发字段校验、名称唯一性校验、协议类型校验、默认模型校验
4. 校验通过后写回 provider 相关配置
5. 返回 provider 首页，并按保存后的 `name` 重新定位选中项

### 9.4 agents 模型配置保存

1. agents 页 `Enter` 打开当前 agent 的模型配置弹窗
2. 弹窗依次选择 `provider`、`model`、可选 `reasoningEffort`
3. 每一步候选集复用 provider 数据与模型元数据
4. 中途 `esc` 只关闭或返回上一阶段，不写配置
5. 最终确认后写回全局 agent 配置段
6. 返回 agents 列表并保持原 agent 选中状态

## 10. 验证

- plugin 能被 opencode 正常加载
- 输入 `/provider` 能进入 provider 首页
- provider 为空时能显示空状态
- provider 非空时能正确显示列表和默认项
- 配置读取失败时能显示明确错误
- sidebar 能区分 active page 与待确认光标，且只有 `Enter` 才切页
- provider / agents 两个 page 能分别记忆选中项和滚动位置
- 模态弹窗打开时 sidebar 与右侧内容区均被锁定
- provider 编辑页保存前能校验 `name`、`baseUrl`、`apiType`、`defaultModel`
- 获取模型弹窗能覆盖加载、成功、失败和取消路径
- agents 页能合并内置 agents 与全局 agent 配置，并正确标记 `default` / `override` / `incomplete`
- agents 模型配置弹窗中途取消不落盘，最终确认后只写回全局 agent 配置段
