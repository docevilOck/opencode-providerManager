# Provider Manager 流程图总览

## 范围

本组流程图覆盖 `/provider` 打开、sidebar 切页、provider 编辑保存、agents 模型保存四条关键链路。

## 落地内容

- 主流程图：`provider-manager-main.md`
- 主流程图源：`provider-manager-main.puml`

## 拆分原因

主链路包含 shell 状态分发、provider 数据流和 agents 数据流。总览只保留索引和阅读路径，具体步骤放入主流程文档和图源，避免流程说明与数据流细节互相堆叠。

## 关联文档

| 类型 | 文档 | 用途 |
| --- | --- | --- |
| 结构体 | `../structures/provider-manager-context.md` | 核心结构定义、生命周期、读写方 |
| 状态枚举 | `../structures/provider-manager-states.md` | 状态枚举和分发约束 |
| 数据流总览 | `../dataflow/provider-manager-overview.md` | 主数据链路、边界和错误出口 |
| 数据流细节 | `../dataflow/provider-manager-details.md` | 字段流转和模块协作步骤 |
| 状态数据流 | `../dataflow/provider-manager-states.md` | 状态迁移和异步边界 |
| 错误路径 | `../dataflow/provider-manager-errors.md` | 错误出口、回退、重试 |

## 关键图源索引

- `provider-manager-main.puml`：主流程 PlantUML 源。

## 阅读顺序

1. `../structures/provider-manager-context.md`
2. `../dataflow/provider-manager-overview.md`
3. 本文
4. `provider-manager-main.md`
5. `provider-manager-main.puml`
