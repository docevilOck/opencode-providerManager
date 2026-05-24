# Provider Home

## 1. 界面

```text
+----------------------------------------------------------------------------------------------+
| page         | Provider Manager                                                              |
|--------------+-------------------------------------------------------------------------------|
| >* provider  | Providers (3)                                                  Default: OpenAI |
|    agents    |-------------------------------------------------------------------------------|
|              | > * OpenAI          active   models: 12   default: gpt-4.1-mini   auth: ok   |
|              |   Anthropic         ready    models:  6   default: claude-3-7     auth: ok   |
|              |   OpenRouter        warn     models: 24   default: auto            auth: missing |
|              |                                                                               |
|              |-------------------------------------------------------------------------------|
|              | [Enter] Edit   [a] Add   [d] Delete   [t] Test   [s] Set Default              |
|              | [esc] Back To Sidebar / Close                                                 |
+----------------------------------------------------------------------------------------------+
```

## 2. 结构

- 左侧侧边栏：显示 page 列表
- 右侧内容区：显示当前 page 对应的 TUI
- `Provider Manager` 不再作为顶部独立标题栏，改为侧边栏 `provider` page 激活后的右侧内容标题
- 右侧标题始终跟随当前 active page，不跟随 sidebar 待确认光标提前变化
- provider 内容区：显示 provider 列表、默认 provider、选中项
- 状态提示区：显示短提示信息
- 底部操作栏：显示当前界面可用操作

当前侧边栏项：

- `provider`
- `agents`

侧边栏定位规则：

- 左侧 sidebar 不是临时入口，而是长期的一层导航结构
- 首阶段先固定 `provider` / `agents` 两项，不做可配置导航
- 未来允许继续扩展更多同层 page，但不影响当前实现结构

其中：

- `provider`：显示现有 Provider Manager 列表与操作区
- `agents`：显示 subagent 模型配置页或其占位页

agents 数据来源：

- 内置 agents：来自 opencode 运行时内置定义
- 用户可编辑 agents：统一来自全局 `~/.config/opencode/opencode.json` / `~/.config/opencode/opencode.jsonc` 中的 `agent` 配置段

当前页建议聚焦“可配置 agent 列表”，即：

- 展示内置 agents
- 合并展示全局 `opencode.json` 中的 agent 配置
- 如同名 agent 在多个来源同时存在，按全局显式配置覆盖内置默认
- 推荐优先级：全局 > 内置默认
- 当前工具只用于配置现有 agent 的模型相关字段，不承担 agent 的创建、删除或其他元数据管理

agents 页示意：

```text
+----------------------------------------------------------------------------------------------+
| page         | Subagent Model Config                                                        |
|--------------+-------------------------------------------------------------------------------|
|  * provider  | Agent Models (4)                                                              |
| >  agents    |-------------------------------------------------------------------------------|
|              | > build            model: openai/gpt-5      effort: medium   status: default  |
|              |   plan             model: <not set>         effort: -        status: incomplete|
|              |   explore          model: openai/gpt-5      effort: low      status: default  |
|              |   reviewer         model: anthropic/claude  effort: high     status: override |
|              |                                                                               |
|              |-------------------------------------------------------------------------------|
|              | [Enter] Configure Model                                                       |
|              | [esc] Back To Sidebar / Close                                                 |
+----------------------------------------------------------------------------------------------+
```

## 3. 列表字段

每一行 provider 显示：

- `displayName`
- `status`
- `modelCount`
- `defaultModel`
- `authStatus`

provider 页头部显示：

- provider 总数
- 当前默认 provider

默认 provider 在列表行内额外显示：

- 最左侧默认标记 `*`

字段规则：

- `name` 作为 provider 唯一主键
- `name` 唯一性校验大小写不敏感
- `name` 显示保留用户最近一次保存时的原始大小写
- `name` 过长时单行截断并追加 `...`
- `defaultModel` 过长时单行截断并追加 `...`
- `models` 只显示模型总数
- `auth` 只显示配置状态，不主动做连通性校验
- 首页不显示 `baseUrl`

## 4. 交互

### 4.1 进入

- 用户输入 `/provider`
- plugin 读取 provider 配置
- 渲染带侧边栏的 page shell
- 初始焦点默认落在左侧侧边栏
- 默认选中 `provider`

### 4.2 侧边栏选择

- 当前侧边栏选中项用 `>` 标识
- `Up`：选中上一个 page
- `Down`：选中下一个 page
- 选中移动到第一项时继续按 `Up`，保持在第一项
- 选中移动到最后一项时继续按 `Down`，保持在最后一项
- 侧边栏当前只允许单选
- 当前 active page 在侧边栏中始终可见
- 若光标位置与 active page 不一致，active page 与光标位置视为两个独立状态
- 首阶段视觉上可用 `>` 表示光标，用额外标记（如 `*`）表示 active page
- 侧边栏 `Up/Down` 只移动光标，不立即切换右侧内容
- sidebar 高度不足时，侧边栏自身独立滚动，不影响右侧内容区滚动位置
- page 名过长时，侧边栏固定宽度，单行截断并追加 `...`
- 当 sidebar 获焦且光标停在非 active page 上时，状态栏显示轻提示，如 `Press Enter to switch page`

### 4.3 进入右侧内容区

- 侧边栏焦点下按 `Enter`：在右侧显示当前 page 对应的 TUI
- 只有按 `Enter` 时，才把侧边栏当前项提升为 active page 并切换右侧内容
- 进入右侧内容区后，焦点切到该 page 的默认焦点位置
- `provider` page 进入后，焦点落在 provider 列表第一项或当前选中项
- `agents` page 进入后，默认焦点落在 agent 列表第一项或当前选中项
- 若对应 page 暂无可展示内容，则右侧显示占位页和短提示
- 如果侧边栏当前项已经是 active page，则按 `Enter` 不刷新页面，只把焦点切回右侧内容区
- 底部操作栏始终跟随当前 active page，不跟随 sidebar 待确认光标变化

### 4.4 provider 内容区选择

- 当前选中 provider 用 `>` 标识
- `Up`：选中上一项 provider
- `Down`：选中下一项 provider
- 选中移动到第一项时继续按 `Up`，保持在第一项
- 选中移动到最后一项时继续按 `Down`，保持在最后一项
- 列表超过一屏时，选中项超出当前可见区域后，列表跟随滚动一行
- 右侧内容区底部操作栏始终固定在页面底部
- provider 列表为空时不显示选中箭头

### 4.5 provider 内容区操作键

- `Enter`：进入当前 provider 编辑页
- `a`：进入新增 provider 页
- `d`：进入删除 provider 确认页
- `t`：进入 provider 测试页
- `s`：进入默认 provider 设置页
- `esc`：从右侧内容区返回左侧侧边栏焦点

### 4.6 关闭

- 当前焦点在左侧侧边栏时，按 `esc`：关闭 Provider Manager plugin 界面
- 当前焦点在右侧内容区时，按 `esc`：先返回左侧侧边栏
- 从右侧内容区返回左侧侧边栏后，光标回到当前 active page 对应的 sidebar 项

### 4.7 不可执行动作

- 当前不可执行的动作在底部操作栏置灰显示
- 置灰动作按下后不跳页、不弹窗
- 置灰动作按下后在状态提示区显示短提示
- 短提示文案统一为当前状态不可执行的提示
- 短提示约 2 秒后自动消失

### 4.8 测试弹窗

- 按 `t` 后，在当前页面中心显示测试通知弹窗
- 弹窗出现后，首页其他按键全部锁住
- 任一右侧模态弹窗打开时，整个 page shell 进入锁定态，左侧 sidebar 不可移动、不可切页
- 测试进行中，弹窗显示 `Testing...` 或测试进度
- 测试进行中按 `esc`：中断测试并关闭弹窗
- 中断测试后，返回首页并在当前 provider 行留下 `cancelled` 状态痕迹
- 测试完成后，弹窗显示结果摘要
- 测试完成后，弹窗底部显示 `[Enter] OK / [esc] Close`
- 关闭弹窗后返回首页，并保持原选中项

### 4.9 设置默认 provider

- 按 `s` 后直接生效
- 当前选中项已经是默认 provider 时，不弹确认页
- 当前选中项已经是默认 provider 时，在状态提示区显示短提示

### 4.10 删除 provider

- 按 `d` 后进入删除确认页
- 当前选中项是默认 provider 时，允许进入删除确认页
- 删除确认页执行删除前，必须先校验当前目标是否为默认 provider
- 目标是默认 provider 时，删除确认页阻止删除并提示先切换默认 provider
- 删除成功后，优先选中被删项的下一项
- 被删项已经是最后一项时，选中上一项
- 删除后列表为空时，返回首页空状态

### 4.11 新增 provider 返回

- 新增页第一步先填写 `name`
- `name` 重名时，在输入框下方显示字段级错误
- 新增成功后退出空状态或返回列表状态
- 新增成功后，新 provider 插入到默认 provider 之后的第一位
- 新增成功后，首页自动选中新 provider
- 新增取消后，返回首页并保持原状态

### 4.12 编辑 provider 返回

- 编辑页允许修改 `name`
- `name` 重名时，在输入框下方显示字段级错误
- 保存成功后返回首页
- 保存成功后按新的 `name` 重新定位并保持选中
- 改名后只更新显示值，不因大小写变化单独重排

### 4.13 排序

- 默认 provider 置顶
- 其余 provider 按创建顺序排列
- provider 总数统计当前首页列表中的 provider 数量

### 4.14 page 状态记忆

- `provider` 和 `agents` 两个 page 分别记忆自己的右侧内容区状态
- `provider` page 至少记忆：当前选中 provider、滚动位置
- `agents` page 至少记忆：当前选中 agent、滚动位置
- 在两个 page 间来回切换时，返回后恢复各自之前的选中项和滚动位置
- 切换 page 时，不自动重置另一个 page 的列表状态

## 5. 状态

### 5.1 空状态

- 左侧侧边栏保持可见
- 右侧 `provider` 内容区显示空列表提示
- 空状态文案示例：`No providers configured. Press [a] to add one.`
- 底部保留全部操作键位
- `a` 和 `esc` 可执行
- 其他动作置灰

### 5.2 错误状态

- 左侧侧边栏保持可见
- 右侧内容区显示配置读取错误摘要
- 底部保留关闭操作

### 5.3 agents 占位状态

- 左侧侧边栏选中 `agents` 并按 `Enter` 后，右侧显示 `Subagent Model Config`
- 若 agents 页尚未实现完整表单，则先显示占位说明
- 占位文案示例：`Agent model configuration is not ready yet.`

### 5.4 agents 列表状态

- 右侧标题显示 `Subagent Model Config`
- 列表区显示当前可配置模型的 agent 列表
- agents 列表的数据来自 opencode agent 配置，而不是 provider 配置
- 首阶段应至少汇总以下来源：内置 agents、全局 `opencode.json/opencode.jsonc` 中的 `agent` 定义
- 仅显示“允许配置 model 的现有 agent”；不负责创建、删除或隐藏 agent
- 每行至少显示：agent 名、绑定模型、effort 档位、配置状态
- 配置状态至少区分：`default`、`override`、`incomplete`
- 内置默认且尚无全局覆写的 agent，状态显示为 `default` 或等价语义
- 已存在全局 model 覆写的 agent，状态显示为 `override` 或等价语义
- 未配置 model 的 agent 也必须显示，`model` 显示为 `<not set>`，`status` 显示为 `incomplete`
- 内置 agents 保持内置默认顺序；全局 `opencode.json` 中新增的非内置 agents 按配置出现顺序追加在后面
- 不因 `incomplete` 状态自动置顶，也不按字母序重排
- `Enter`：打开当前 agent 的模型配置弹窗
- `esc`：返回左侧侧边栏

### 5.5 agents 编辑弹窗

- agents 不进入独立编辑页，只使用一个居中的模型配置弹窗
- 弹窗只负责配置一个现有 agent 的模型相关信息：服务商、模型、推理强度
- 弹窗不负责修改 `mode`、`description`、`permission`、`prompt` 或其他 agent 元数据
- 弹窗分三阶段顺序选择：`provider` -> `model` -> `reasoning effort`
- 若当前模型不支持推理强度选择，则完成 `model` 选择后直接保存并关闭弹窗
- 整个弹窗流程在最后一步确认前都只保留临时态；只有最终完成时才一次性写入全局配置
- 中途按 `esc` 退出时，不写入任何半成品配置

#### 5.5.1 provider 选择阶段

```text
+----------------------------------------------------------------------------------+
| Select Provider                                                                  |
| Search: open                                                                     |
|----------------------------------------------------------------------------------|
| > OpenAI                                                                         |
|   OpenRouter                                                                     |
|   OpenAI Compatible                                                              |
|   Google                                                                         |
|   Anthropic                                                                      |
|----------------------------------------------------------------------------------|
| [Up/Down] Move   [Enter] Select   [esc] Cancel                                   |
+----------------------------------------------------------------------------------+
```

- 弹窗打开后默认先进入服务商选择阶段
- 列表显示当前可用服务商集合
- 服务商候选来源与 provider 页面保持一致，统一来自全局 opencode 配置中的 provider 相关数据
- 首选来源为 provider 页面已经加载并标准化后的 provider 列表数据
- 若当前页面尚未缓存 provider 列表，则回退到重新读取全局 provider 配置生成候选集
- `Up/Down`：上下移动当前选中服务商
- 用户输入可打印字符时，不触发其他动作，默认写入搜索输入框
- 输入框按当前关键字对服务商列表做模糊匹配
- `Backspace`：删除输入框最后一个字符
- `Enter`：确认当前服务商，并进入模型选择阶段
- `esc`：关闭弹窗，不保存修改
- 若切换到新的 provider，旧的 `model` 与 `reasoningEffort` 立即失效并清空，不做自动保留

#### 5.5.2 model 选择阶段

```text
+----------------------------------------------------------------------------------+
| Select Model                                                                     |
| Provider: OpenAI                                                                 |
| Search: gpt                                                                      |
|----------------------------------------------------------------------------------|
| > gpt-5                                                                          |
|   gpt-5-mini                                                                     |
|   gpt-4.1                                                                        |
|   gpt-4.1-mini                                                                   |
|----------------------------------------------------------------------------------|
| [Up/Down] Move   [Enter] Select   [esc] Back                                     |
+----------------------------------------------------------------------------------+
```

- 进入模型阶段后，顶部显示已选服务商
- 列表显示该服务商当前可用模型集合
- 模型候选来源与 provider 页面一致，优先使用 provider 相关数据中该服务商已存在的模型列表
- 若 provider 数据中没有模型缓存，则可从全局 opencode 配置里的对应 provider 模型定义中读取
- `Up/Down`：上下移动当前选中模型
- 用户输入可打印字符时，默认写入搜索输入框，并对模型列表做模糊匹配
- `Backspace`：删除输入框最后一个字符
- `Enter`：确认当前模型
- `esc`：返回上一阶段的服务商选择
- 若新 model 不支持旧 `reasoningEffort`，则清空旧值；若新 model 支持同名选项，可保留，否则重新进入推理强度选择或直接跳过

#### 5.5.3 reasoning effort 选择阶段

```text
+----------------------------------------------------------------------------------+
| Select Reasoning Effort                                                          |
| Provider: OpenAI   Model: gpt-5                                                  |
| Search:                                                                         |
|----------------------------------------------------------------------------------|
| > minimal                                                                        |
|   low                                                                            |
|   medium                                                                         |
|   high                                                                           |
|----------------------------------------------------------------------------------|
| [Up/Down] Move   [Enter] Select   [esc] Back                                     |
+----------------------------------------------------------------------------------+
```

- 只有当前模型支持可选推理强度时，才进入该阶段
- 列表显示当前模型支持的推理强度集合
- 推理强度候选来自全局 opencode 配置或 provider 相关模型元数据
- 若当前模型元数据未声明推理强度选项，则跳过该阶段
- `Up/Down`：上下移动当前选中推理强度
- 用户输入可打印字符时，默认写入搜索输入框，并对推理强度列表做模糊匹配
- `Backspace`：删除输入框最后一个字符
- `Enter`：确认当前推理强度，保存修改并关闭弹窗
- `esc`：返回上一阶段的模型选择

#### 5.5.4 输入规则

- 除方向键、`Enter`、`esc`、`Backspace` 外，其他可打印输入默认都写入搜索输入框
- 搜索输入框不区分大小写
- 当搜索结果为空时，列表区显示空结果提示，不自动关闭弹窗
- 空结果文案示例：`No matches found.`

#### 5.5.5 保存结果

- 最终保存值至少包括：`provider`、`model`
- 若存在推理强度选择，则额外保存 `reasoningEffort`
- provider/model/reasoning 的候选集都不单独维护新数据源，统一复用全局 opencode 配置与 provider 页面相关数据
- 用户确认保存后，统一写回全局 `~/.config/opencode/opencode.json` 或 `opencode.jsonc` 的 `agent` 配置段
- 保存后返回 agents 列表，并保持原 agent 选中状态
