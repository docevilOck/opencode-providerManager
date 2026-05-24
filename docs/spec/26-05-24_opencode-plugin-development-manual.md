# opencode plugin 开发与迁移手册

## 1. 文档目的

本手册用于统一 `opencode-providerManager` 仓库的目标定位、目录规划和迁移方向。

当前仓库不再以历史 `pi` 扩展为最终交付形态，而是转为一个 opencode plugin，用于管理 provider 的浏览、编辑、测试、默认项切换和相关配置落盘。

## 2. 当前目标

- 在 opencode 内提供 `/provider` 入口
- 通过 TUI 方式管理 provider 列表和详情
- 统一 provider、认证和设置相关配置的读取与写回
- 为后续 plugin 骨架、命令注册和配置迁移提供文档基线

## 3. 仓库角色

### 3.1 当前角色

- 文档优先的 plugin 设计仓库
- Provider Manager plugin 的实现预研与规格沉淀仓库
- 历史扩展方案向 opencode plugin 迁移的中间站

### 3.2 后续角色

- `plugin/` 目录承载实际 plugin 源码
- `docs/spec/` 承载规范与开发手册
- `docs/plan/` 承载分阶段实现计划
- `examples/` 承载最小可运行示例与联调样例

## 4. 建议目录规划

```text
docs/
├─ spec/
│  └─ 26-05-24_opencode-plugin-development-manual.md
├─ plan/
└─ plans/
   └─ 26-05-23_provider-manager/
      ├─ architecture/
      └─ tui/

plugin/
examples/
extensions/   # 历史扩展实现、迁移参考或兼容代码
```

## 5. 配置视角

当前文档统一按 opencode plugin 视角描述配置来源：

- `~/.config/opencode/providers.json`
- `~/.config/opencode/auth.json`
- `~/.config/opencode/settings.json`
- `~/.config/opencode/plugins/provider-manager/provider-manager.json`

说明：

- 这些路径当前作为设计文档中的目标路径约定
- 若后续 opencode 实际插件 API 或配置布局不同，应以真实运行时能力为准，并同步更新本文档与设计稿

## 6. 核心功能范围

首阶段建议覆盖：

1. Provider 首页列表展示
2. Provider 编辑页
3. 默认 provider 设置
4. Provider 删除与新增
5. Provider 连接测试
6. 模型拉取与默认模型配置

暂不在首阶段强行引入：

- 复杂权限系统
- 多层缓存抽象
- 非必要后台同步逻辑
- 与当前目标无关的泛化框架封装

## 7. 现有设计文档

- [Provider Manager Plugin 实现架构](../plans/26-05-23_provider-manager/architecture/provider-manager-extension.md)
- [Provider Home 界面说明](../plans/26-05-23_provider-manager/tui/provider-home.md)
- [Provider Edit 界面说明](../plans/26-05-23_provider-manager/tui/provider-edit.md)

这些文档当前已经切换到 plugin 口径，但仍保留历史文件路径，以减少一次性重命名带来的噪音。

## 8. 迁移原则

- 只改必要语义，不做无关扩写
- 先统一仓库定位，再补实现骨架
- 先保证文档之间术语一致，再推进代码落地
- 历史 `extensions/` 内容只作为参考，不再作为最终交付形态

## 9. 建议下一步

1. 初始化 `plugin/` 目录与入口文件
2. 明确 opencode plugin 的实际注册 API 和命令生命周期
3. 将架构文档中的模块名映射到真实源码目录
4. 为 Provider Home / Edit 设计补充状态流转和最小实现清单
