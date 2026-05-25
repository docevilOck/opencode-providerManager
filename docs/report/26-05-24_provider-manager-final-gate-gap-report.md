# Provider Manager final-gate 偏差审查记录

## 结论

`blocked`

当前代码已通过现有自动化测试和 TypeScript 构建，核心实现已基本贴近 `docs/plans/26-05-23_provider-manager` 中 architecture、detail、TUI 与交互文档定义的首阶段目标。本轮已调用独立 final-gate reviewer：首轮给出 `blocked` 并指出真实 TUI route 与纯文本 renderer 分叉、空状态动作置灰和 fetch failure 摘要等偏差；主 agent 已按项修复；复审结论为 `need-info`，确认 4 项实现偏差已解决。随后已执行受限 `ai-slop-cleaner` cleanup，并重新跑通自动化测试和构建；cleanup 后独立复审仍为 `need-info`，确认 cleanup 未破坏设计一致性。本轮已补充部分真实 opencode TUI 宿主证据：本地插件能安装到临时项目 `.opencode/tui.json`，TUI 启动会读取该配置并加载 `file:///E:/Repo/opencode-providerManager/plugin`。但仍无法在当前自动化 shell 中完成 `/provider` 交互、键盘分发、modal focus lock 和异步路径验证，因此仍不能给出 final-gate `pass`。

## 对照范围

- 架构文档：`docs/plans/26-05-23_provider-manager/architecture/provider-manager-extension.md`
- 执行计划：`docs/plans/26-05-23_provider-manager/exec_plans/provider-manager-plugin.md`
- 结构文档：`docs/plans/26-05-23_provider-manager/detail/structures/provider-manager-context.md`
- 状态文档：`docs/plans/26-05-23_provider-manager/detail/structures/provider-manager-states.md`
- 主流程：`docs/plans/26-05-23_provider-manager/detail/flows/provider-manager-main.md`
- TUI 文档：`docs/plans/26-05-23_provider-manager/tui/provider-home.md`
- TUI 文档：`docs/plans/26-05-23_provider-manager/tui/provider-edit.md`
- 代码范围：`plugin/src/index.tsx`、`plugin/src/core/**`、`plugin/src/tui/**`、`plugin/src/types/**`、`plugin/src/infra/**`
- 验证证据：`npm test`、`npm run build`，均在 `plugin/` 下通过

## 已修复偏差

- `index.tsx` 复用 `PageStateService` 的 sidebar 状态迁移，避免入口层维护另一套 sidebar 状态逻辑。
- provider 新增从一次性多 prompt 保存调整为 `ProviderEditDraft` 草稿页，保存前统一走 `handleProviderSaveAction`。
- provider 编辑页渲染复用 `renderProviderEditScreen`，并显示 `validationErrors`。
- provider 编辑页已增加字段焦点状态，`Up/Down` 在 `name/baseUrl/apiType/apiKey/defaultModel` 之间移动，`Enter` 按当前字段分发编辑。
- provider 编辑页已增加 `defaultModel` 选择入口，基于当前 draft 的 `models` 候选设置默认模型。
- `apiType` 协议选择使用文档内定义的 `protocol-select` modal，并在协议变化后清空待确认模型与默认模型。
- 脏草稿按 `esc` 时进入 `leave-confirm` 模态确认，不再直接丢弃。
- agents 模型配置每阶段写入 `agent-model-picker` modalState，模态期间禁用 shell 导航。
- provider 编辑页已增加 `f` 获取模型入口，使用 `fetch-models` modalState 锁定 shell，并将确认后的模型写入当前 draft。
- provider 编辑页已增加 `e` 模型默认配置入口，使用 `model-config-defaults` modalState 锁定 shell，并更新当前 draft 的模型默认参数。
- provider 首页已增加 `s` 设置默认 provider、`d` 删除 provider、`t` provider 测试入口，并补了默认 provider 删除保护。
- 服务层已补 `setDefaultProvider` 与 `deleteProvider`，并用测试覆盖 settings/provider/auth 写回路径。
- agents 模型选择弹窗已补纯状态机能力并接入实际 TUI keymap：`Up/Down/Enter/Esc/Backspace/可打印字符` 直接更新 `modalState.draft`，最终确认才写回全局 agent 配置段。
- model config defaults 已覆盖文档列出的四类字段：context window、max output、input types、reasoning levels。
- 新增 `ProviderRuntimeService`，按 provider 协议构造模型列表端点，真实调用 `fetch` 获取模型 ID，并为 provider test 复用同一连通性检查路径。
- fetch models 已从输入模型 ID 的最小闭环改为 `loading -> success/failure` 异步状态流；成功时将远端模型写入当前 draft，失败时写入字段级错误，并已通过 `AbortController` 向底层 fetch 传递取消信号。
- provider test 已从通知式闭环改为 `testing -> success/failure` 异步状态流，并显示测试结果；关闭 modal 时会中止当前 runtime 请求。
- 首页底部操作栏已在文本 shell 与 TUI shell 中按当前页面渲染基础快捷操作提示。
- provider/agents 内容区已接入 `scrollOffset` 和固定窗口渲染，`visibleScrollOffset` 已补边界 clamp，避免尾部窗口越界。
- provider 首页文本渲染已补 `Providers (n) Default: ...` 页头，agents 页已补 `Agent Models (n)` 页头，并测试 active page 标题不跟随 sidebar cursor 提前变化。
- provider 保存校验错误已保留字段级 `ValidationIssue`，编辑页渲染器已把字段错误插入对应字段行下方，并用渲染测试固定。
- provider 编辑页已补 `API Key` 字段掩码显示，符合 `provider-edit.md` 的默认掩码要求。
- fetch models 取消路径已补运行中 `AbortSignal` 观测测试，确认底层 fetcher 可收到 abort 并返回取消失败结果。
- fetch models 成功态已改为候选模型缓存在 modal 内，支持 `Up/Down`、`Space`、`a` 和 `Enter` 确认；只有确认后才把选中模型写入 `ProviderEditDraft.models`，符合 states 文档“确认前只存在 modal 内”的约束。
- modal 渲染已补 fetch models 成功态 checkbox 列表、provider test、leave confirm、protocol select、model defaults 与 agent picker 的统一文本出口。
- model defaults 已从连续宿主选择器改为显式 modal 临时态：打开时带入当前默认配置，支持 `Up/Down` 移动 context/max/input/reasoning 字段，`Enter` 编辑 context window 与 max output，`Space` 切换 input type 与 reasoning 多选，`Ctrl+S` 后才写回当前 provider 编辑会话。
- 删除 provider 已从复用 `leave-confirm` 改为独立 `provider-delete-confirm` modal；默认 provider 进入确认页后会提示先切换默认 provider，并在执行删除前再次阻止删除。
- provider test 进行中关闭 modal 会中止请求，并在当前会话内的 provider 行留下 `test:cancelled` 状态痕迹。
- 不可执行动作已补短提示：空 provider 列表下 `Enter/d/t/s` 不再隐式新增或静默返回，会显示 `No provider selected. Press [a] to add one.`；非草稿状态下 `f/e/Ctrl+S` 显示 `Open or add a provider before using this action`。
- provider 首页行渲染已按 TUI 文档补齐长字段截断：`displayName` 与 `defaultModel` 过长时单行截断并追加 `...`，避免列表行破坏布局。
- provider 保存顺序已补齐文档约束：新增 provider 写入 `providers.json` 时插入到默认 provider 后第一位；编辑或改名时保留原有位置，不因改名重新追加到末尾。
- 短提示状态已补过期语义：`statusLine` 支持 `expiresAt`，短提示统一约 2 秒后过期；文本渲染会过滤过期提示，TUI 层对 `setShell` 写入的短提示安排定时清理。
- 独立 reviewer 指出的真实 Solid TUI route 分叉已修复：provider 页显示 `Providers (n) Default: ...`，行内容复用 `renderProviderRow` 的 `displayName/status/modelCount/defaultModel/authStatus` 语义；agents 页显示 `Agent Models (n)`，行内容复用 `renderAgentRow` 并包含 `effort`。
- 空 provider 状态的底部操作栏已补不可执行表现：真实 TUI route 用灰色文本表示 `Enter/d/t/s` 不可执行，文本 shell 用 `(disabled)` 明确标注不可执行动作。
- fetch models 失败态已在 `modalState` 中承载 `message` 错误摘要，并在失败弹窗中渲染具体错误。
- 已执行受限 `ai-slop-cleaner` cleanup：收敛 `page-state-service` 的边界 clamp、`fetch-model-modal-service` 的选中项 clamp、`provider-runtime-service` 的失败结果和错误消息格式化；补充 fetch modal selection clamp 与 provider runtime failure message 回归测试。

## 仍然不一致的问题

### P1 证据不足或实现需继续精确化

- 已调用独立 final-gate reviewer，首轮结论为 `blocked`；本报告已记录并修复 reviewer 明确指出的 4 项偏差。修复后复审结论为 `need-info`，未再指出阻断级实现偏差。cleanup 阶段已执行，cleanup 后复审仍为 `need-info`，确认 cleanup 未引入设计偏离；剩余缺口为真实 opencode TUI 宿主验证证据。

### P2 证据不足

- 自动化测试已覆盖服务层设置默认与删除保护、删除确认默认 provider 提示、runtime fetch/test 服务、fetch models modal 确认写入、model defaults modal 完整字段渲染、AbortSignal 取消观测、agent modal 纯状态机、字段级错误布局、page shell 状态与滚动窗口边界。真实 opencode TUI 宿主已验证到“临时项目安装本地插件”和“TUI 启动加载本地插件”，但没有验证 `/provider` 交互进入、键盘分发、弹窗焦点锁定与渲染行为。
- 现有 `index.test.ts` 覆盖命令注册和核心 handler 行为，但完整 TUI 草稿页全链路仍主要依赖单元级状态测试和类型构建。

## 已确认一致的关键点

- `/provider` slash command 存在，并进入 provider manager route。
- 初始 shell 为 `activePage=provider`、`focusRegion=sidebar`。
- sidebar 使用 `activePage` 与 `sidebarCursorPage` 双状态，且 `Enter` 才提交切页。
- provider 与 agents 列表数据来自同一次标准化 provider/config 快照。
- agents 保存写回全局 `agent` 配置段，不写 provider 配置。
- provider 保存写回 provider/auth/settings 相关配置，并返回 provider 首页定位选中项。

## 后续修复顺序

1. 在真实 opencode TUI 宿主中人工验证 provider/agents 键盘分发、弹窗焦点锁定和滚动渲染。
2. 补真实 opencode TUI 宿主交互证据：`/provider` 进入 provider manager route、route 切换、键盘事件、modal focus lock、DialogPrompt/DialogSelect 行为、异步 fetch/test 取消、状态栏 TTL 重绘。

## 验证

- 命令：`npm test`
- 结果摘要：15 个测试文件、60 个测试全部通过；`provider-runtime-service.test.ts` 覆盖 fetch models、provider test、AbortSignal 取消观测和 provider connectivity 失败消息；`fetch-model-modal-service.test.ts` 覆盖 fetch models modal 内选择、selection clamp 与确认写入；`provider-manager-service.test.ts` 覆盖新增 provider 插入默认 provider 后、编辑/改名保留位置、默认 provider 删除保护与配置写回；`index.test.ts` 覆盖 fetch models、model defaults、删除确认 modal 渲染、fetch failure 错误摘要和不可执行动作短提示；`tui-rendering.test.ts` 覆盖 provider 行长字段截断、字段级错误布局和 API Key 掩码显示；`provider-manager-shell.test.ts` 覆盖过期短提示不再进入文本 shell与空状态动作 disabled 标注；`page-state-service.test.ts` 覆盖短提示 TTL 过期判断与滚动窗口边界；`agent-model-picker-modal.test.ts` 覆盖三阶段状态机
- 是否通过：通过
- 未覆盖风险：未覆盖完整 TUI 键盘交互与宿主 Dialog 行为

- 命令：`npm run build`
- 结果摘要：`tsc -p tsconfig.json` 退出码 0
- 是否通过：通过
- 未覆盖风险：只验证类型与编译，不证明交互符合设计

- 命令：`opencode plugin E:\Repo\opencode-providerManager\plugin --force --print-logs --log-level DEBUG`
- 结果摘要：在临时项目 `C:\Users\hasee\AppData\Local\Temp\opencode-provider-host-15393bf0835843c990e07a5ba50dcfb0` 中安装成功，生成 `.opencode/tui.json`，配置内容包含本地插件路径 `E:\Repo\opencode-providerManager\plugin`
- 是否通过：通过
- 未覆盖风险：只证明插件可被安装到临时 TUI 配置，不证明 route/command 可交互

- 命令：短时启动 `opencode --print-logs --log-level DEBUG`
- 结果摘要：TUI 启动日志显示读取临时项目 `.opencode\tui.json`，并加载 `file:///E:/Repo/opencode-providerManager/plugin`，日志含 `tui plugin metadata updated`
- 是否通过：部分通过
- 未覆盖风险：仅验证 TUI 启动加载插件，无人工/自动键盘交互证据

- 命令：`opencode run --command provider --format json --print-logs --log-level DEBUG --dangerously-skip-permissions`
- 结果摘要：失败，`opencode run` 返回 `Command not found: "provider"`；可用 command 列表不包含 TUI slash command，说明 run 模式不能替代 TUI 交互验证
- 是否通过：不通过，工具模式不适用
- 未覆盖风险：仍需真实 TUI 内输入 `/provider` 并观察 route、键盘和 modal 行为

- 命令：向 TUI stdin 管道输入 `/provider`
- 结果摘要：命令超时，raw TUI 未在当前非交互 shell 中完成可观测验证；已清理本轮启动的 opencode 子进程
- 是否通过：不通过，当前 shell 自动化方式不适用
- 未覆盖风险：仍需人工或专用 PTY 自动化完成真实交互验证

- 命令：`opencode run --interactive --demo /provider --print-logs --log-level DEBUG`
- 结果摘要：失败，stderr 明确返回 `--interactive requires a TTY stdout`
- 是否通过：不通过，当前 shell 工具不提供真实 TTY stdout
- 未覆盖风险：仍需真实终端/PTY 环境验证 `/provider` 交互路径
