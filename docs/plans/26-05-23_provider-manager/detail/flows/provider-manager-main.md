# Provider Manager 主流程图

## 回指

- 流程图总览：`provider-manager-overview.md`
- 数据流总览：`../dataflow/provider-manager-overview.md`
- 数据流细节：`../dataflow/provider-manager-details.md`
- 结构体：`../structures/provider-manager-context.md`

## 图回答的问题

这张图描述一次 `/provider` 会话中，数据如何从配置读取进入 shell，如何按 page 和 modal 分发，并在 provider 保存或 agents 保存后回到列表状态。

## ASCII 图

```text
+-------------------+
| /provider handler |
+---------+---------+
          |
          v
+--------------------------+
| OpencodeConfigSnapshot   |
+------------+-------------+
             |
             v
+--------------------------+
| ProviderManagerShell     |
| PageShellState           |
+------+-------------------+
       |
       +------------------------------+
       |                              |
       v                              v
+--------------+              +---------------+
| provider page|              | agents page   |
+------+-------+              +-------+-------+
       |                              |
       v                              v
+--------------+              +---------------------+
| edit draft   |              | agent model draft   |
+------+-------+              +----------+----------+
       |                                 |
       v                                 v
+--------------+              +---------------------+
| provider cfg |              | global agent cfg    |
+--------------+              +---------------------+
```

## 主流程说明

1. `/provider handler` 只负责进入插件会话并触发配置读取。
2. `OpencodeConfigSnapshot` 是所有原始配置的唯一入口。
3. provider 与 agents 各自生成标准化摘要，交给 `ProviderManagerShell` 渲染。
4. shell 先按 `focusRegion` 分发按键，再按 `activePage` 或 `modalState.kind` 分发。
5. provider 编辑保存通过 `ProviderEditDraft` 校验后写 provider 配置。
6. agents 模型配置通过 `AgentModelDraft` 最终确认后写全局 agent 配置段。
7. 保存成功后重新读取或重新标准化摘要，回到对应列表。

## PlantUML 图源

- `provider-manager-main.puml`
