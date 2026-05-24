# Provider Manager 数据流细节

## 回指

- 数据流总览：`provider-manager-overview.md`
- 结构定义：`../structures/provider-manager-context.md`
- 状态枚举：`../structures/provider-manager-states.md`

## 1. `/provider` 打开

1. `src/index.ts` 注册的 `/provider` handler 接收 slash command。
2. handler 调用 `ProviderManagerService.loadProviderList()`。
3. `ProviderManagerService` 通过 `OpencodeConfigReader` 读取：
   - `providers.json`
   - `auth.json`
   - `settings.json`
   - `provider-manager.json`
   - `opencode.json/opencode.jsonc`
   - opencode 运行时内置 agents
4. reader 生成 `OpencodeConfigSnapshot`。
5. `ProviderNormalizer` 将 provider/auth/settings/plugin 数据标准化为 `ManagedProviderSummary[]`。
6. `AgentModelConfigService` 合并 `builtinAgents` 与 `globalOpencodeJson.agent`，生成 `AgentModelSummary[]`。
7. `ProviderManagerShell` 创建 `PageShellState`：
   - `pages=['provider','agents']`
   - `activePage='provider'`
   - `sidebarCursorPage='provider'`
   - `focusRegion='sidebar'`
   - `pageStates.provider={ selectedIndex: 0, scrollOffset: 0 }`
   - `pageStates.agents={ selectedIndex: 0, scrollOffset: 0 }`
8. shell 渲染 provider 首页 view model。

## 2. sidebar 切页

1. `focusRegion='sidebar'` 时，shell 消费 sidebar 按键。
2. `Up/Down` 调用 `PageStateService.moveSidebarCursor()`，只修改 `sidebarCursorPage`。
3. 若 `sidebarCursorPage !== activePage`，`statusLine` 写入切页提示。
4. `Enter` 调用 `PageStateService.activateSidebarPage()`：
   - 保存旧 `activePage` 对应 `PageContentState`
   - 设置 `activePage=sidebarCursorPage`
   - 读取新 page 的 `PageContentState`
   - 设置 `focusRegion='content'`
5. shell 根据新的 `activePage` 选择右侧 screen：
   - `provider` -> `ProviderHomeScreen`
   - `agents` -> `AgentModelConfigScreen`

## 3. provider 编辑保存

1. `activePage='provider'` 且 `focusRegion='content'` 时，`Enter` 打开 `ProviderEditScreen`。
2. 编辑页从当前 `ManagedProviderSummary` 创建 `ProviderEditDraft`。
3. 字段编辑、协议选择、模型拉取、模型默认配置只更新 draft。
4. `Ctrl+S` 调用 `ProviderValidator.validateProviderDraft()`：
   - `name` 非空
   - `name` 与其他 provider 大小写不敏感唯一
   - `baseUrl` 非空且为合法 URL
   - `apiType` 属于 `ProviderApiType`
   - 当前有模型时 `defaultModel` 属于 `models.id`
   - `protocolChanged=true` 时重新校验 `models/defaultModel`
5. 校验失败时，错误写入 `ProviderEditDraft.validationErrors`，页面停留编辑态。
6. 校验通过后，`OpencodeConfigWriter` 写回 provider 相关配置。
7. 写入成功后重新读取并标准化 provider 列表。
8. 首页按保存后的 `name` 重新定位 selectedIndex；只改大小写时不改变排序位置。

## 4. provider 获取模型

1. 编辑页按 `f` 前检查 `baseUrl`、`apiKey`、`apiType`。
2. 检查失败时不打开请求流程，只写短提示或置灰动作。
3. 检查通过后打开 `ModalState.kind='fetch-models'`，`phase='loading'`。
4. 请求完成后：
   - 成功：`phase='success'`，候选模型进入 modal 内部选择集。
   - 失败：`phase='failure'`，错误摘要进入 modal。
5. 成功态下 `Space` 切换单个模型，`a` 选中全部，`Enter` 确认。
6. 确认后把已选模型转换为 `ProviderModelConfig[]`，合并 `ProviderEditDraft.modelConfigDefaults`，写入 `ProviderEditDraft.models`。
7. `esc` 关闭 modal 时放弃 modal 内未确认选择。

## 5. agents 模型配置保存

1. `activePage='agents'` 且 `focusRegion='content'` 时，`Enter` 打开 `AgentModelPickerModal`。
2. `AgentModelOptionService` 基于 `ManagedProviderSummary[]` 生成 `ModelOptionSet`。
3. modal 创建 `AgentModelDraft`，初始 `step='select-provider'`。
4. provider 阶段确认后：
   - 写入 `draft.provider`
   - 清空 `draft.model` 与 `draft.reasoningEffort`
   - 进入 `select-model`
5. model 阶段确认后：
   - 写入 `draft.model`
   - 读取该模型的 reasoning 候选
   - 有候选则进入 `select-reasoning`
   - 无候选则直接生成保存 payload
6. reasoning 阶段确认后写入 `draft.reasoningEffort`，生成保存 payload。
7. `AgentModelConfigService.saveAgentModelConfig()` 将 payload 合并到全局 `agent` 配置段。
8. 保存成功后重新生成 `AgentModelSummary[]`，返回 agents 列表并保持原 agent 选中项。
