# Provider Edit

## 1. 界面

```text
+----------------------------------------------------------------------------------+
| Edit Provider                                                                    |
+----------------------------------------------------------------------------------+
| Editing: OpenAI                                                                  |
|----------------------------------------------------------------------------------|
| Name           : OpenAI                                                          |
| Base URL       : https://api.openai.com/v1                                       |
| API Type       : openai-responses                                                |
| API Key        : ************                                                    |
| Default Model  : gpt-4.1-mini                                                    |
| Models         : 12                                                              |
| Headers        : Authorization: Bearer ***                                       |
|----------------------------------------------------------------------------------|
| [Up/Down] Move   [Enter] Edit Field   [f] Fetch Models   [e] Edit Model Config   |
| [Ctrl+S] Save                                                                    |
| [esc] Back                                                                       |
+----------------------------------------------------------------------------------+
```

## 2. 结构

- 顶部标题栏：显示 `Edit Provider`
- 当前对象栏：显示当前编辑的 provider `name`
- 表单区：显示当前 provider 的可编辑字段
- 状态提示区：显示保存结果、校验错误、plugin 级不可执行提示
- 底部操作栏：显示当前界面可用操作

## 3. 字段

编辑页包含以下字段：

- `name`
- `baseUrl`
- `apiType`
- `apiKey`
- `defaultModel`

显示规则：

- `name` 作为 provider 唯一主键
- `name` 可以修改
- `name` 唯一性校验大小写不敏感
- `name` 显示保留用户最近一次保存时的原始大小写
- `baseUrl` 在编辑页完整显示
- `apiKey` 默认掩码显示
- `models` 只读显示当前模型总数
- `defaultModel` 必须属于当前 provider 已配置的模型集合
- 当前 provider 还没有任何模型时，允许 `defaultModel` 暂时为空
- 当前 provider 没有任何模型时，可先保存基础配置，后续拉取或补充模型后再完成默认模型配置
- 模型未单独编辑时，按默认配置处理

模型默认配置：

- 上下文窗口大小：`256k`
- 最大输出大小：`128k`
- 输入内容类型：`text,image`
- 可用推理等级：`minimal`、`low`、`medium`、`high`、`xhigh`

## 4. 交互

### 4.1 进入

- 首页左侧选中 `provider` 并进入右侧内容区后，按 `Enter` 进入当前 provider 编辑页
- 编辑页打开后，默认焦点落在 `name` 字段

### 4.2 字段选择

- `Up`：移动到上一个字段
- `Down`：移动到下一个字段
- 到最后一个字段继续按 `Down`，保持在最后一个字段
- 到第一个字段继续按 `Up`，保持在第一个字段

### 4.3 字段编辑

- `Enter`：进入当前字段编辑态
- 字段编辑完成后，回到字段选中态
- 当前字段有校验错误时，保留在当前字段
- `apiType` 编辑时，不直接输入
- `apiType` 编辑时，打开协议选择弹窗
- `apiType` 允许在编辑已有 provider 时修改
- 协议选择弹窗显示当前支持的协议类型列表
- `apiType` 表示请求协议类型，不等同于 provider 厂商名
- provider 厂商、网关或托管平台差异主要通过 `baseUrl` 和认证配置体现
- 协议选择弹窗使用 `Up` / `Down` 移动
- 协议选择弹窗按 `Enter` 选中当前协议并返回编辑页
- 修改 `apiType` 后，当前 `defaultModel` 和已获取模型列表进入待确认状态
- 修改 `apiType` 后，如果现有模型集合与新协议不再兼容，保存前应清空或要求用户重新确认

协议选择弹窗：

```text
                           +------------------------------------------+
                           | Select API Protocol                      |
                           +------------------------------------------+
                            | > openai-responses                       |
                            |   openai-chat                            |
                            |   openai-compatible-chat                 |
                            |   anthropic-messages                     |
                            |   gemini                                 |
                            |   bedrock-converse                       |
                            |                                          |
                            | [Up/Down] Move   [Enter] Select          |
                            | [esc] Close                              |
                            +------------------------------------------+
```

### 4.4 保存

- `Ctrl+S`：保存当前编辑内容
- 保存前执行字段校验
- 如果修改过 `apiType`，则必须重新校验 `defaultModel` 和当前模型集合是否仍然有效
- 校验通过后写回 provider 配置
- 如果当前 provider 已配置模型，则 `defaultModel` 必须落在当前模型集合内
- 如果当前 provider 没有任何模型，则允许 `defaultModel` 为空并先保存其他字段
- 保存成功后返回首页
- 返回首页后按新的 `name` 重新定位并保持选中
- 如果只修改 `name` 大小写，只更新显示值，不因大小写变化单独重排

### 4.5 返回

- `esc`：返回首页
- 有未保存修改时，先进入离开确认弹窗
- 无未保存修改时，直接返回首页

### 4.6 获取模型

- `f`：使用当前 `baseUrl`、`apiKey`、`apiType` 获取可用模型列表
- 执行 `f` 前，如果 `baseUrl`、`apiKey`、`apiType` 缺失，动作置灰或给出短提示
- 执行 `f` 后，打开获取模型弹窗
- 获取进行中时，弹窗显示 `Fetching models...`
- 获取完成后，弹窗显示全部可用模型
- 获取失败时，弹窗显示错误摘要

### 4.7 获取模型弹窗

- 弹窗在编辑页中心显示
- 弹窗打开后，编辑页其他按键全部锁住
- 每个模型前显示可选框
- 未选中状态显示 `[ ]`
- 选中状态显示 `[x]`
- `Up` / `Down`：移动当前模型
- `Space`：切换当前模型的选中状态
- `a`：选中全部可用模型
- `Enter`：把当前弹窗中已选中的模型写入当前 provider 的可用模型列表
- `esc`：关闭弹窗并放弃本次弹窗内未确认的模型选择

获取模型弹窗：

加载态：

```text
                       +------------------------------------------------------+
                       | Fetch Models                                         |
                       +------------------------------------------------------+
                       | Provider : OpenAI                                    |
| Protocol : openai-responses                          |
                       | Base URL : https://api.openai.com/v1                 |
                       |------------------------------------------------------|
                       | Fetching models...                                   |
                       |                                                      |
                       | [esc] Cancel                                         |
                       +------------------------------------------------------+
```

成功态：

```text
                       +------------------------------------------------------+
                       | Fetch Models                                         |
                       +------------------------------------------------------+
                       | Provider : OpenAI                                    |
                       | Available Models (6)                                 |
                       |------------------------------------------------------|
                       | > [ ] gpt-4.1-mini                                   |
                       |   [ ] gpt-4.1                                        |
                       |   [ ] o4-mini                                        |
                       |   [ ] gpt-4o                                         |
                       |   [ ] gpt-4o-mini                                    |
                       |   [ ] text-embedding-3-large                         |
                       |                                                      |
                       | [Up/Down] Move [Space] Toggle [a] All                |
                       | [Enter] Confirm [esc] Close                          |
                       +------------------------------------------------------+
```

失败态：

```text
                       +------------------------------------------------------+
                       | Fetch Models                                         |
                       +------------------------------------------------------+
                       | Provider : OpenAI                                    |
                       |------------------------------------------------------|
                       | Failed to fetch models                               |
                       | 401 Unauthorized                                     |
                       | Check API key or protocol settings                   |
                       |                                                      |
                       | [Enter] OK [esc] Close                               |
                       +------------------------------------------------------+
```

### 4.8 模型配置编辑

- `e`：打开模型配置弹窗
- 模型配置弹窗用于编辑当前待加入模型的统一默认参数
- 模型配置弹窗打开后，编辑页其他按键全部锁住
- 模型配置弹窗字段包括：
- 上下文窗口大小
- 最大输出大小
- 输入内容类型
- 可用推理等级
- 输入内容类型提供两个选项：
- `text`
- `text,image`
- 可用推理等级提供以下多选项：
- `minimal`
- `low`
- `medium`
- `high`
- `xhigh`
- 未进入模型配置弹窗编辑时，模型按默认配置处理
- 模型配置弹窗保存后，后续通过 `Enter` 写入的模型使用当前弹窗里确认过的配置

模型配置弹窗：

```text
                       +------------------------------------------------------+
                       | Model Config Defaults                                |
                       +------------------------------------------------------+
                       | Context Window Size : 256k                           |
                       | Max Output Size     : 128k                           |
                       | Input Type          : text,image                     |
                       | Reasoning Levels                                       |
                       |   [x] minimal                                         |
                       |   [x] low                                             |
                       |   [x] medium                                          |
                       |   [x] high                                            |
                       |   [x] xhigh                                           |
                       |                                                      |
                       | [Up/Down] Move [Enter] Edit [Space] Toggle           |
                       | [Ctrl+S] Save [esc] Close                            |
                       +------------------------------------------------------+
```

### 4.9 一键全选模型

- `a` 在获取模型弹窗内执行“全选当前全部可用模型”
- 全选后，所有模型可选框更新为 `[x]`
- 全选后仍可通过 `Space` 单独取消某个模型

## 5. 校验

### 5.1 Name

- `name` 不能为空
- `name` 唯一性校验大小写不敏感
- `name` 与其他 provider 重名时，不允许保存
- `name` 重名时，在输入框下方显示 `Provider name already exists`

### 5.2 Base URL

- `baseUrl` 不能为空
- `baseUrl` 必须是合法 URL

### 5.3 Default Model

- 当前 provider 已配置模型时，`defaultModel` 不能为空
- 当前 provider 已配置模型时，`defaultModel` 必须属于当前模型集合
- 当前 provider 没有任何模型时，`defaultModel` 可以为空

### 5.4 API Type

- `apiType` 必须是当前支持的协议类型之一
- 当前支持值包括：
- `openai-responses`
- `openai-chat`
- `openai-compatible-chat`
- `anthropic-messages`
- `gemini`
- `bedrock-converse`
- 修改 `apiType` 后，必须重新校验现有模型集合与 `defaultModel`
- 修改 `apiType` 后，如果当前模型集合已不可信，可要求用户重新拉取模型

## 6. 状态

### 6.1 正常状态

- 字段按当前配置显示
- 当前焦点字段高亮

### 6.2 校验错误状态

- 错误显示在对应字段下方
- 页面停留在当前编辑页
- 不丢失用户已填内容

### 6.3 保存成功状态

- 保存成功后返回首页
- 首页刷新当前 provider 行内容

### 6.4 离开确认状态

- 存在未保存修改时，按 `esc` 打开离开确认弹窗
- 弹窗显示当前修改尚未保存
- `[Enter] Confirm`：放弃修改并返回首页
- `[esc] Close`：关闭弹窗并回到编辑页

### 6.5 获取模型弹窗状态

- 加载态：显示 `Fetching models...`
- 成功态：显示可选模型列表
- 失败态：显示错误摘要和关闭操作

### 6.6 模型配置弹窗状态

- 默认打开时带入默认模型配置
- 保存后更新当前编辑会话中的模型默认参数
