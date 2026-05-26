# opencode-providerManager

`opencode-providerManager` 用于实现和维护一个 OpenCode plugin，目标是沉淀 provider 管理相关能力、配置结构和交互流程。

## 仓库定位

- 仓库源码：`plugin/`
- 主要入口：OpenCode TUI `/provider`
- 当前形态：可打包发布的 npm 插件仓库

当前实现覆盖 `/provider` 入口、配置读取、provider 标准化、page shell 状态、provider/agent 列表渲染、agent 模型选择弹窗状态和配置写回最小闭环。

## 安装到 OpenCode

先发布 npm 包，再在 `opencode.json` 中声明：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@docevil/opencode-provider-manager"]
}
```

修改配置后需要重启 OpenCode，运行中的会话不会热加载插件配置。

## 本地开发

```bash
cd plugin
npm install
npm test
npm run build
```

## 打包与发布

插件包位于 `plugin/`，当前发布路径是 npm 包分发，不是独立上传市场。

1. 构建并自检
2. 执行 `npm version patch|minor|major`
3. 执行 `npm publish`
4. 发布成功后，将插件仓库提交到 OpenCode ecosystem 列表

常用命令：

```bash
cd plugin
npm test
npm run build
npm pack --dry-run
npm publish
```

## 上架到 OpenCode 生态页

根据 OpenCode 官方文档，插件公开分发方式是 npm 包；想出现在 ecosystem 页，需要在发布后向 OpenCode 官方仓库提交 PR，将项目加入 ecosystem plugins 列表。

## 文档入口

- [opencode plugin 开发与迁移手册](docs/spec/26-05-24_opencode-plugin-development-manual.md)
- [Provider Manager 插件实现架构](docs/plans/26-05-23_provider-manager/architecture/provider-manager-extension.md)
- [Provider Home 界面说明](docs/plans/26-05-23_provider-manager/tui/provider-home.md)
- [Provider Edit 界面说明](docs/plans/26-05-23_provider-manager/tui/provider-edit.md)
