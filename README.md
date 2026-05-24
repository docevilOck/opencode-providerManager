# opencode-providerManager

`opencode-providerManager` 用于实现和维护一个 opencode plugin，目标是沉淀 provider 管理相关能力、配置结构和交互流程。

## 当前仓库状态

- Git 仓库已创建
- 远程仓库已绑定为 `git@github.com:docevilOck/opencode-providerManager.git`
- 当前仍处于从历史 `pi` 扩展方案向 opencode plugin 方案迁移的早期阶段

## 文档入口

- [opencode plugin 开发与迁移手册](docs/spec/26-05-24_opencode-plugin-development-manual.md)
- [Provider Manager 插件实现架构](docs/plans/26-05-23_provider-manager/architecture/provider-manager-extension.md)
- [Provider Home 界面说明](docs/plans/26-05-23_provider-manager/tui/provider-home.md)
- [Provider Edit 界面说明](docs/plans/26-05-23_provider-manager/tui/provider-edit.md)

## 建议目录规划

- `docs/spec/`：plugin 规范、接口设计、开发手册
- `docs/plan/`：迁移计划、实现拆分、阶段任务
- `examples/`：最小可运行示例、调试样例
- `plugin/`：opencode plugin 实际源码
- `extensions/`：历史扩展实现、迁移参考或兼容代码

## 建议下一步

1. 明确 plugin 的目标能力边界（provider 列表、编辑、测试、切换等）
2. 确定 opencode plugin 的目录结构、入口形式和配置读写方式
3. 将现有历史扩展设计文档逐步迁移为 plugin 视角的规范文档
4. 补齐 `plugin/` 目录初始化代码和最小可运行骨架

## Plugin 开发验证

Provider Manager 插件源码位于 `plugin/`。

常用命令：

```bash
cd plugin
npm install
npm test
npm run build
```

当前实现覆盖 `/provider` 入口、配置读取、provider 标准化、page shell 状态、provider/agent 列表渲染、agent 模型选择弹窗状态和配置写回最小闭环。
