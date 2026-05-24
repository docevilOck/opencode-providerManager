# Provider Manager 错误路径

## 回指

- 数据流总览：`provider-manager-overview.md`
- 数据流细节：`provider-manager-details.md`
- 结构定义：`../structures/provider-manager-context.md`

## 配置读取错误

| 错误入口 | 检查点 | 处理 |
| --- | --- | --- |
| 文件不存在 | `OpencodeConfigReader` | 使用空配置或默认结构继续生成快照 |
| JSON/JSONC 解析失败 | `OpencodeConfigReader` | 返回读取错误，provider page 显示错误摘要 |
| 权限错误 | `OpencodeConfigReader` | 返回读取错误，底部只保留关闭操作 |

配置读取错误进入页面错误状态时，`PageShellState` 仍创建，sidebar 保持可见，`activePage='provider'`。

## provider 校验错误

| 字段 | 错误码 | 处理 |
| --- | --- | --- |
| `name` | `provider.name.empty` | 停留当前字段，字段下方显示错误 |
| `name` | `provider.name.duplicate` | 停留当前字段，提示重名 |
| `baseUrl` | `provider.baseUrl.invalid` | 停留编辑页，字段下方显示错误 |
| `apiType` | `provider.apiType.unsupported` | 打开协议选择或提示重新选择 |
| `defaultModel` | `provider.defaultModel.missing` | 有模型时阻止保存 |
| `defaultModel` | `provider.defaultModel.notFound` | 阻止保存，提示重新选择或拉取模型 |

校验错误只写入 `ProviderEditDraft.validationErrors`，不写配置。

## 获取模型错误

| 阶段 | 错误 | 处理 |
| --- | --- | --- |
| 请求前 | `baseUrl/apiKey/apiType` 缺失 | 不打开请求，给短提示或置灰动作 |
| loading | 用户 `esc` | 取消请求，关闭 modal，不改 draft |
| loading | 请求失败 | `FetchModelsPhase='failure'`，显示错误摘要 |
| success | 用户 `esc` | 放弃 modal 内选择，不改 draft.models |
| success | 确认空选择 | 允许写入空模型集合，随后 `defaultModel` 需按无模型规则校验 |

## agents 保存错误

| 错误入口 | 处理 |
| --- | --- |
| provider 候选为空 | provider 选择阶段显示空结果，无法确认 |
| model 候选为空 | model 选择阶段显示空结果，无法确认 |
| 全局配置写入失败 | 保持 agents 页选中项，状态栏显示保存失败 |
| 写入后重读失败 | 显示错误摘要，保留当前内存中最后一次可用列表 |

## 回退与重试

- provider 保存失败：保留 `ProviderEditDraft` 与 dirty 状态，允许用户修正后再次 `Ctrl+S`。
- 获取模型失败：modal 失败态关闭后回编辑页，允许用户修改字段后再次按 `f`。
- agent 保存失败：关闭或保持弹窗由错误发生点决定；未确认写入成功前不得更新 agents 列表为成功状态。
- 配置写入失败：不得更新内存中的标准化列表为已保存结果。
