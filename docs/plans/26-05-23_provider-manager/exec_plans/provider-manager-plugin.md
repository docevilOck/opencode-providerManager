# Provider Manager Plugin 实现计划

> **给代理型执行者：** 必需子技能：使用 `superpowers:executing-plans` 按任务逐步实现这个计划。步骤使用复选框（`- [ ]`）语法跟踪。

**目标：** 在 `plugin/` 下实现 `/provider` 插件骨架、配置读取与标准化、page shell、provider 首页/编辑页、agents 模型配置页和关键保存链路。

**架构：** `/provider` handler 读取 opencode 配置并生成 `OpencodeConfigSnapshot`，再由 provider 与 agent service 生成标准化摘要。TUI 使用 `ProviderManagerShell` 持有 `PageShellState`，先按 `focusRegion` 分发，再按 `activePage` 或 `modalState.kind` 分发；provider 保存写 provider 配置，agents 保存写全局 agent 配置段。

**技术栈：** TypeScript、Node.js、Vitest、PlantUML 文档源、opencode plugin API。

---

## 参考输入

- 架构文档：`docs/plans/26-05-23_provider-manager/architecture/provider-manager-extension.md`
- 架构图源：`docs/plans/26-05-23_provider-manager/architecture/provider-manager-extension.puml`
- TUI 首页：`docs/plans/26-05-23_provider-manager/tui/provider-home.md`
- TUI 编辑页：`docs/plans/26-05-23_provider-manager/tui/provider-edit.md`
- 结构体文档：`docs/plans/26-05-23_provider-manager/detail/structures/provider-manager-context.md`
- 状态文档：`docs/plans/26-05-23_provider-manager/detail/structures/provider-manager-states.md`
- 数据流文档：`docs/plans/26-05-23_provider-manager/detail/dataflow/provider-manager-overview.md`
- 流程图文档：`docs/plans/26-05-23_provider-manager/detail/flows/provider-manager-main.md`

## 文件结构

本计划创建以下源码与测试文件：

```text
plugin/
├─ package.json
├─ tsconfig.json
├─ vitest.config.ts
└─ src/
   ├─ index.ts
   ├─ types/
   │  ├─ provider.ts
   │  ├─ agent.ts
   │  └─ tui.ts
   ├─ infra/
   │  ├─ path-resolver.ts
   │  ├─ opencode-config-reader.ts
   │  └─ opencode-config-writer.ts
   ├─ core/
   │  ├─ provider-normalizer.ts
   │  ├─ provider-validator.ts
   │  ├─ provider-manager-service.ts
   │  ├─ agent-model-config-service.ts
   │  ├─ agent-model-option-service.ts
   │  └─ page-state-service.ts
   └─ tui/
      ├─ provider-manager-shell.ts
      ├─ page-sidebar.ts
      ├─ provider-home-screen.ts
      ├─ provider-edit-screen.ts
      ├─ agent-model-config-screen.ts
      ├─ agent-model-picker-modal.ts
      ├─ provider-row.ts
      └─ agent-row.ts

plugin/src/**/*.test.ts
```

## 任务 1：初始化 plugin TypeScript 工程

**文件：**
- 新建：`plugin/package.json`
- 新建：`plugin/tsconfig.json`
- 新建：`plugin/vitest.config.ts`
- 新建：`plugin/src/index.ts`

- [ ] **步骤 1：创建 package 配置**

写入 `plugin/package.json`：

```json
{
  "name": "opencode-provider-manager-plugin",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **步骤 2：创建 TS 配置**

写入 `plugin/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **步骤 3：创建 Vitest 配置**

写入 `plugin/vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
```

- [ ] **步骤 4：创建最小入口**

写入 `plugin/src/index.ts`：

```ts
export type PluginContext = {
  registerCommand?: (name: string, handler: () => unknown | Promise<unknown>) => void
}

export function registerProviderManagerPlugin(ctx: PluginContext) {
  ctx.registerCommand?.('provider', async () => ({ command: 'provider' }))
}

export default registerProviderManagerPlugin
```

- [ ] **步骤 5：安装依赖并验证构建**

运行：

```bash
cd plugin && npm install && npm run build
```

预期：`tsc -p tsconfig.json` 退出码为 0，生成 `plugin/dist/index.js`。

- [ ] **步骤 6：提交**

```bash
git add plugin/package.json plugin/package-lock.json plugin/tsconfig.json plugin/vitest.config.ts plugin/src/index.ts
git commit -m "feat(plugin): 初始化 provider manager 插件工程"
```

## 任务 2：落地核心类型定义

**文件：**
- 新建：`plugin/src/types/provider.ts`
- 新建：`plugin/src/types/agent.ts`
- 新建：`plugin/src/types/tui.ts`
- 测试：`plugin/src/types/type-contract.test.ts`

- [ ] **步骤 1：写类型契约测试**

写入 `plugin/src/types/type-contract.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import type { ManagedProviderSummary, ProviderEditDraft } from './provider.js'
import type { AgentModelDraft, AgentModelSummary } from './agent.js'
import type { PageShellState } from './tui.js'

describe('provider manager type contracts', () => {
  it('allows constructing the core runtime state shapes', () => {
    const provider: ManagedProviderSummary = {
      name: 'OpenAI',
      id: 'openai',
      displayName: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiType: 'openai-responses',
      modelCount: 1,
      defaultModel: 'gpt-5',
      isDefault: true,
      authStatus: 'ok',
      status: 'active',
      source: 'providers-json',
      models: [],
      createdOrder: 0
    }

    const draft: ProviderEditDraft = {
      originalName: 'OpenAI',
      name: 'OpenAI',
      baseUrl: provider.baseUrl,
      apiType: provider.apiType,
      apiKey: 'secret',
      defaultModel: 'gpt-5',
      models: [],
      modelConfigDefaults: {
        contextWindow: '256k',
        maxOutput: '128k',
        inputTypes: ['text', 'image'],
        reasoningEfforts: ['minimal', 'low', 'medium', 'high', 'xhigh']
      },
      dirtyFields: new Set(['name']),
      validationErrors: [],
      protocolChanged: false
    }

    const agent: AgentModelSummary = {
      name: 'reviewer',
      provider: 'OpenAI',
      model: 'gpt-5',
      reasoningEffort: 'high',
      status: 'override',
      source: 'global',
      isBuiltin: true,
      displayOrder: 0
    }

    const agentDraft: AgentModelDraft = {
      agentName: agent.name,
      provider: null,
      model: null,
      reasoningEffort: null,
      step: 'select-provider',
      searchText: '',
      candidateItems: [],
      selectedIndex: 0
    }

    const shell: PageShellState = {
      pages: ['provider', 'agents'],
      activePage: 'provider',
      sidebarCursorPage: 'provider',
      focusRegion: 'sidebar',
      pageStates: {
        provider: { selectedIndex: 0, scrollOffset: 0 },
        agents: { selectedIndex: 0, scrollOffset: 0 }
      },
      modalState: null,
      statusLine: null
    }

    expect(draft.name).toBe(provider.name)
    expect(agentDraft.step).toBe('select-provider')
    expect(shell.pages).toEqual(['provider', 'agents'])
  })
})
```

- [ ] **步骤 2：运行测试，确认类型文件缺失失败**

运行：

```bash
cd plugin && npm test -- src/types/type-contract.test.ts
```

预期：失败，错误包含 `Cannot find module './provider.js'` 或 `Cannot find module './agent.js'`。

- [ ] **步骤 3：定义 provider 类型**

写入 `plugin/src/types/provider.ts`：

```ts
import type { ValidationIssue } from './tui.js'

export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'

export type ProviderApiType =
  | 'openai-responses'
  | 'openai-chat'
  | 'openai-compatible-chat'
  | 'anthropic-messages'
  | 'gemini'
  | 'bedrock-converse'

export type ProviderModelConfig = {
  id: string
  contextWindow: string
  maxOutput: string
  inputTypes: Array<'text' | 'image'>
  reasoningEfforts: ReasoningEffort[]
}

export type ProviderModelConfigDefaults = Omit<ProviderModelConfig, 'id'>

export type ManagedProviderSummary = {
  name: string
  id: string
  displayName: string
  baseUrl: string
  apiType: ProviderApiType
  modelCount: number
  defaultModel: string | null
  isDefault: boolean
  authStatus: 'ok' | 'missing' | 'invalid'
  status: 'active' | 'ready' | 'warn' | 'error'
  source: 'providers-json' | 'plugin-json'
  models: ProviderModelConfig[]
  createdOrder: number
}

export type ProviderEditField = 'name' | 'baseUrl' | 'apiType' | 'apiKey' | 'defaultModel'

export type ProviderEditDraft = {
  originalName: string | null
  name: string
  baseUrl: string
  apiType: ProviderApiType
  apiKey: string
  defaultModel: string | null
  models: ProviderModelConfig[]
  modelConfigDefaults: ProviderModelConfigDefaults
  dirtyFields: Set<ProviderEditField>
  validationErrors: ValidationIssue[]
  protocolChanged: boolean
}

export type OpencodeConfigSnapshot = {
  providersJson: unknown
  authJson: unknown
  settingsJson: unknown
  pluginJson: unknown
  globalOpencodeJson: unknown
  builtinAgents: unknown[]
  loadedAt: number
}
```

- [ ] **步骤 4：定义 agent 类型**

写入 `plugin/src/types/agent.ts`：

```ts
import type { ReasoningEffort } from './provider.js'

export type SelectableOption = {
  id: string
  label: string
  disabled?: boolean
}

export type AgentModelSummary = {
  name: string
  provider: string | null
  model: string | null
  reasoningEffort: ReasoningEffort | null
  status: 'default' | 'override' | 'incomplete'
  source: 'builtin' | 'global'
  isBuiltin: boolean
  displayOrder: number
}

export type AgentModelDraft = {
  agentName: string
  provider: string | null
  model: string | null
  reasoningEffort: ReasoningEffort | null
  step: 'select-provider' | 'select-model' | 'select-reasoning'
  searchText: string
  candidateItems: SelectableOption[]
  selectedIndex: number
}

export type ModelOptionSet = {
  providers: SelectableOption[]
  modelsByProvider: Record<string, SelectableOption[]>
  reasoningByModel: Record<string, SelectableOption[]>
}
```

- [ ] **步骤 5：定义 TUI 状态类型**

写入 `plugin/src/types/tui.ts`：

```ts
import type { AgentModelDraft } from './agent.js'

export type PageId = 'provider' | 'agents'

export type PageContentState = {
  selectedIndex: number
  scrollOffset: number
}

export type ValidationIssue = {
  field?: string
  code: string
  message: string
  severity: 'error' | 'warn'
}

export type StatusLine = {
  message: string
  level: 'info' | 'warn' | 'error'
}

export type FetchModelsPhase = 'loading' | 'success' | 'failure'
export type ProviderTestPhase = 'testing' | 'cancelled' | 'success' | 'failure'

export type ModalState =
  | { kind: 'provider-test'; providerName: string; phase: ProviderTestPhase }
  | { kind: 'leave-confirm'; target: 'provider-edit' }
  | { kind: 'protocol-select'; selectedIndex: number }
  | { kind: 'fetch-models'; phase: FetchModelsPhase; selectedIndex: number; selectedModelIds: Set<string> }
  | { kind: 'model-config-defaults'; selectedField: string }
  | { kind: 'agent-model-picker'; draft: AgentModelDraft }

export type PageShellState = {
  pages: PageId[]
  activePage: PageId
  sidebarCursorPage: PageId
  focusRegion: 'sidebar' | 'content' | 'modal'
  pageStates: Record<PageId, PageContentState>
  modalState: ModalState | null
  statusLine: StatusLine | null
}
```

- [ ] **步骤 6：运行类型契约测试和构建**

运行：

```bash
cd plugin && npm test -- src/types/type-contract.test.ts && npm run build
```

预期：测试通过，`tsc` 退出码为 0。

- [ ] **步骤 7：提交**

```bash
git add plugin/src/types plugin/src/types/type-contract.test.ts
git commit -m "feat(plugin): 定义 provider manager 核心类型"
```

## 任务 3：实现配置路径解析与读取

**文件：**
- 新建：`plugin/src/infra/path-resolver.ts`
- 新建：`plugin/src/infra/opencode-config-reader.ts`
- 测试：`plugin/src/infra/opencode-config-reader.test.ts`

- [ ] **步骤 1：写配置读取失败测试**

写入 `plugin/src/infra/opencode-config-reader.test.ts`：

```ts
import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { resolveOpencodePaths } from './path-resolver.js'
import { readOpencodeConfigSnapshot } from './opencode-config-reader.js'

describe('opencode config reader', () => {
  it('resolves all provider manager config paths from a config root', () => {
    const paths = resolveOpencodePaths('/home/test/.config/opencode')
    expect(paths.providersJson).toContain('providers.json')
    expect(paths.authJson).toContain('auth.json')
    expect(paths.settingsJson).toContain('settings.json')
    expect(paths.pluginJson).toContain('plugins/provider-manager/provider-manager.json')
    expect(paths.globalOpencodeJson).toContain('opencode.json')
  })

  it('reads missing files as empty objects and attaches builtin agents', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    const snapshot = await readOpencodeConfigSnapshot(root, [{ name: 'reviewer' }])
    expect(snapshot.providersJson).toEqual({})
    expect(snapshot.authJson).toEqual({})
    expect(snapshot.settingsJson).toEqual({})
    expect(snapshot.pluginJson).toEqual({})
    expect(snapshot.globalOpencodeJson).toEqual({})
    expect(snapshot.builtinAgents).toEqual([{ name: 'reviewer' }])
    expect(typeof snapshot.loadedAt).toBe('number')
  })

  it('parses existing json files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'providers.json'), JSON.stringify({ OpenAI: { baseUrl: 'https://api.openai.com/v1' } }))
    const snapshot = await readOpencodeConfigSnapshot(root, [])
    expect(snapshot.providersJson).toEqual({ OpenAI: { baseUrl: 'https://api.openai.com/v1' } })
  })
})
```

- [ ] **步骤 2：运行测试，确认模块缺失失败**

运行：

```bash
cd plugin && npm test -- src/infra/opencode-config-reader.test.ts
```

预期：失败，错误包含 `Cannot find module './path-resolver.js'`。

- [ ] **步骤 3：实现路径解析**

写入 `plugin/src/infra/path-resolver.ts`：

```ts
import { join } from 'node:path'

export type OpencodeConfigPaths = {
  root: string
  providersJson: string
  authJson: string
  settingsJson: string
  pluginJson: string
  globalOpencodeJson: string
  globalOpencodeJsonc: string
}

export function resolveOpencodePaths(root: string): OpencodeConfigPaths {
  return {
    root,
    providersJson: join(root, 'providers.json'),
    authJson: join(root, 'auth.json'),
    settingsJson: join(root, 'settings.json'),
    pluginJson: join(root, 'plugins', 'provider-manager', 'provider-manager.json'),
    globalOpencodeJson: join(root, 'opencode.json'),
    globalOpencodeJsonc: join(root, 'opencode.jsonc')
  }
}
```

- [ ] **步骤 4：实现配置读取**

写入 `plugin/src/infra/opencode-config-reader.ts`：

```ts
import { readFile } from 'node:fs/promises'
import type { OpencodeConfigSnapshot } from '../types/provider.js'
import { resolveOpencodePaths } from './path-resolver.js'

async function readJsonObject(filePath: string): Promise<unknown> {
  try {
    const content = await readFile(filePath, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

export async function readOpencodeConfigSnapshot(root: string, builtinAgents: unknown[]): Promise<OpencodeConfigSnapshot> {
  const paths = resolveOpencodePaths(root)
  const [providersJson, authJson, settingsJson, pluginJson, globalOpencodeJson] = await Promise.all([
    readJsonObject(paths.providersJson),
    readJsonObject(paths.authJson),
    readJsonObject(paths.settingsJson),
    readJsonObject(paths.pluginJson),
    readJsonObject(paths.globalOpencodeJson)
  ])

  return {
    providersJson,
    authJson,
    settingsJson,
    pluginJson,
    globalOpencodeJson,
    builtinAgents,
    loadedAt: Date.now()
  }
}
```

- [ ] **步骤 5：运行配置读取测试和构建**

```bash
cd plugin && npm test -- src/infra/opencode-config-reader.test.ts && npm run build
```

预期：测试通过，构建通过。

- [ ] **步骤 6：提交**

```bash
git add plugin/src/infra/path-resolver.ts plugin/src/infra/opencode-config-reader.ts plugin/src/infra/opencode-config-reader.test.ts
git commit -m "feat(plugin): 实现 opencode 配置读取"
```

## 任务 4：实现 provider 标准化与校验

**文件：**
- 新建：`plugin/src/core/provider-normalizer.ts`
- 新建：`plugin/src/core/provider-validator.ts`
- 测试：`plugin/src/core/provider-normalizer.test.ts`
- 测试：`plugin/src/core/provider-validator.test.ts`

- [ ] **步骤 1：写 provider 标准化测试**

写入 `plugin/src/core/provider-normalizer.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { normalizeProviders } from './provider-normalizer.js'

describe('normalizeProviders', () => {
  it('marks default provider first and preserves creation order for the rest', () => {
    const providers = normalizeProviders(
      {
        Anthropic: { baseUrl: 'https://api.anthropic.com', apiType: 'anthropic-messages', models: [] },
        OpenAI: { baseUrl: 'https://api.openai.com/v1', apiType: 'openai-responses', models: [{ id: 'gpt-5' }], defaultModel: 'gpt-5' }
      },
      { defaultProvider: 'OpenAI' },
      { OpenAI: { apiKey: 'secret' } }
    )

    expect(providers.map((item) => item.name)).toEqual(['OpenAI', 'Anthropic'])
    expect(providers[0]?.isDefault).toBe(true)
    expect(providers[0]?.authStatus).toBe('ok')
    expect(providers[1]?.authStatus).toBe('missing')
  })
})
```

- [ ] **步骤 2：写 provider 校验测试**

写入 `plugin/src/core/provider-validator.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { validateProviderDraft } from './provider-validator.js'
import type { ProviderEditDraft } from '../types/provider.js'

function draft(overrides: Partial<ProviderEditDraft> = {}): ProviderEditDraft {
  return {
    originalName: 'OpenAI',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiType: 'openai-responses',
    apiKey: 'secret',
    defaultModel: 'gpt-5',
    models: [{ id: 'gpt-5', contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] }],
    modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] },
    dirtyFields: new Set(),
    validationErrors: [],
    protocolChanged: false,
    ...overrides
  }
}

describe('validateProviderDraft', () => {
  it('rejects duplicate provider names case-insensitively', () => {
    const issues = validateProviderDraft(draft({ name: 'anthropic' }), ['Anthropic'])
    expect(issues.map((issue) => issue.code)).toContain('provider.name.duplicate')
  })

  it('allows empty default model when no models exist', () => {
    const issues = validateProviderDraft(draft({ models: [], defaultModel: null }), [])
    expect(issues).toEqual([])
  })

  it('rejects default model outside current model set', () => {
    const issues = validateProviderDraft(draft({ defaultModel: 'missing' }), [])
    expect(issues.map((issue) => issue.code)).toContain('provider.defaultModel.notFound')
  })
})
```

- [ ] **步骤 3：运行测试，确认模块缺失失败**

```bash
cd plugin && npm test -- src/core/provider-normalizer.test.ts src/core/provider-validator.test.ts
```

预期：失败，错误包含 `Cannot find module './provider-normalizer.js'` 或 `Cannot find module './provider-validator.js'`。

- [ ] **步骤 4：实现 provider 标准化**

写入 `plugin/src/core/provider-normalizer.ts`：

```ts
import type { ManagedProviderSummary, ProviderApiType, ProviderModelConfig } from '../types/provider.js'

type RawProvider = {
  baseUrl?: string
  apiType?: ProviderApiType
  models?: Array<Partial<ProviderModelConfig> & { id: string }>
  defaultModel?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeProviders(providersJson: unknown, settingsJson: unknown, authJson: unknown): ManagedProviderSummary[] {
  const providers = isRecord(providersJson) ? providersJson : {}
  const settings = isRecord(settingsJson) ? settingsJson : {}
  const auth = isRecord(authJson) ? authJson : {}
  const defaultProvider = typeof settings.defaultProvider === 'string' ? settings.defaultProvider : null

  const rows = Object.entries(providers).map(([name, raw], index): ManagedProviderSummary => {
    const provider = (isRecord(raw) ? raw : {}) as RawProvider
    const models = (provider.models ?? []).map((model) => ({
      id: model.id,
      contextWindow: model.contextWindow ?? '256k',
      maxOutput: model.maxOutput ?? '128k',
      inputTypes: model.inputTypes ?? ['text', 'image'],
      reasoningEfforts: model.reasoningEfforts ?? ['minimal', 'low', 'medium', 'high', 'xhigh']
    }))
    const hasAuth = isRecord(auth[name]) && typeof (auth[name] as Record<string, unknown>).apiKey === 'string'
    const isDefault = defaultProvider?.toLowerCase() === name.toLowerCase()
    return {
      name,
      id: name.toLowerCase(),
      displayName: name,
      baseUrl: provider.baseUrl ?? '',
      apiType: provider.apiType ?? 'openai-compatible-chat',
      modelCount: models.length,
      defaultModel: provider.defaultModel ?? null,
      isDefault,
      authStatus: hasAuth ? 'ok' : 'missing',
      status: isDefault ? 'active' : 'ready',
      source: 'providers-json',
      models,
      createdOrder: index
    }
  })

  return rows.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdOrder - b.createdOrder)
}
```

- [ ] **步骤 5：实现 provider 校验**

写入 `plugin/src/core/provider-validator.ts`：

```ts
import type { ProviderApiType, ProviderEditDraft } from '../types/provider.js'
import type { ValidationIssue } from '../types/tui.js'

const SUPPORTED_API_TYPES: ProviderApiType[] = [
  'openai-responses',
  'openai-chat',
  'openai-compatible-chat',
  'anthropic-messages',
  'gemini',
  'bedrock-converse'
]

function issue(field: string, code: string, message: string): ValidationIssue {
  return { field, code, message, severity: 'error' }
}

export function validateProviderDraft(draft: ProviderEditDraft, otherProviderNames: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (draft.name.trim() === '') issues.push(issue('name', 'provider.name.empty', 'Provider name is required'))
  if (otherProviderNames.some((name) => name.toLowerCase() === draft.name.toLowerCase())) {
    issues.push(issue('name', 'provider.name.duplicate', 'Provider name already exists'))
  }
  try {
    new URL(draft.baseUrl)
  } catch {
    issues.push(issue('baseUrl', 'provider.baseUrl.invalid', 'Base URL must be a valid URL'))
  }
  if (!SUPPORTED_API_TYPES.includes(draft.apiType)) {
    issues.push(issue('apiType', 'provider.apiType.unsupported', 'API type is not supported'))
  }
  if (draft.models.length > 0 && !draft.defaultModel) {
    issues.push(issue('defaultModel', 'provider.defaultModel.missing', 'Default model is required'))
  }
  if (draft.defaultModel && !draft.models.some((model) => model.id === draft.defaultModel)) {
    issues.push(issue('defaultModel', 'provider.defaultModel.notFound', 'Default model must exist in provider models'))
  }
  return issues
}
```

- [ ] **步骤 6：运行 provider 测试和构建**

```bash
cd plugin && npm test -- src/core/provider-normalizer.test.ts src/core/provider-validator.test.ts && npm run build
```

预期：测试通过，构建通过。

- [ ] **步骤 7：提交**

```bash
git add plugin/src/core/provider-normalizer.ts plugin/src/core/provider-validator.ts plugin/src/core/provider-normalizer.test.ts plugin/src/core/provider-validator.test.ts
git commit -m "feat(plugin): 实现 provider 标准化与校验"
```

## 任务 5：实现 page shell 状态机

**文件：**
- 新建：`plugin/src/core/page-state-service.ts`
- 测试：`plugin/src/core/page-state-service.test.ts`

- [ ] **步骤 1：写 shell 状态测试**

写入 `plugin/src/core/page-state-service.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { activateSidebarPage, createInitialPageShellState, moveSidebarCursor, returnToSidebar } from './page-state-service.js'

describe('page state service', () => {
  it('keeps sidebar cursor separate from active page until Enter', () => {
    const state = createInitialPageShellState()
    const moved = moveSidebarCursor(state, 1)
    expect(moved.activePage).toBe('provider')
    expect(moved.sidebarCursorPage).toBe('agents')
    expect(moved.statusLine?.message).toBe('Press Enter to switch page')

    const activated = activateSidebarPage(moved)
    expect(activated.activePage).toBe('agents')
    expect(activated.focusRegion).toBe('content')
  })

  it('returns content focus to sidebar at current active page', () => {
    const state = activateSidebarPage(moveSidebarCursor(createInitialPageShellState(), 1))
    const next = returnToSidebar(state)
    expect(next.focusRegion).toBe('sidebar')
    expect(next.sidebarCursorPage).toBe('agents')
  })
})
```

- [ ] **步骤 2：运行测试，确认模块缺失失败**

```bash
cd plugin && npm test -- src/core/page-state-service.test.ts
```

预期：失败，错误包含 `Cannot find module './page-state-service.js'`。

- [ ] **步骤 3：实现状态机**

写入 `plugin/src/core/page-state-service.ts`：

```ts
import type { PageId, PageShellState } from '../types/tui.js'

const PAGES: PageId[] = ['provider', 'agents']

export function createInitialPageShellState(): PageShellState {
  return {
    pages: PAGES,
    activePage: 'provider',
    sidebarCursorPage: 'provider',
    focusRegion: 'sidebar',
    pageStates: {
      provider: { selectedIndex: 0, scrollOffset: 0 },
      agents: { selectedIndex: 0, scrollOffset: 0 }
    },
    modalState: null,
    statusLine: null
  }
}

export function moveSidebarCursor(state: PageShellState, delta: -1 | 1): PageShellState {
  const current = state.pages.indexOf(state.sidebarCursorPage)
  const nextIndex = Math.max(0, Math.min(state.pages.length - 1, current + delta))
  const sidebarCursorPage = state.pages[nextIndex] ?? state.sidebarCursorPage
  return {
    ...state,
    sidebarCursorPage,
    statusLine: sidebarCursorPage !== state.activePage ? { message: 'Press Enter to switch page', level: 'info' } : null
  }
}

export function activateSidebarPage(state: PageShellState): PageShellState {
  return {
    ...state,
    activePage: state.sidebarCursorPage,
    focusRegion: 'content',
    statusLine: null
  }
}

export function returnToSidebar(state: PageShellState): PageShellState {
  return {
    ...state,
    focusRegion: 'sidebar',
    sidebarCursorPage: state.activePage,
    statusLine: null
  }
}
```

- [ ] **步骤 4：运行状态机测试和构建**

```bash
cd plugin && npm test -- src/core/page-state-service.test.ts && npm run build
```

预期：测试通过，构建通过。

- [ ] **步骤 5：提交**

```bash
git add plugin/src/core/page-state-service.ts plugin/src/core/page-state-service.test.ts
git commit -m "feat(plugin): 实现 page shell 状态机"
```

## 任务 6：实现 agents 合并与模型候选

**文件：**
- 新建：`plugin/src/core/agent-model-config-service.ts`
- 新建：`plugin/src/core/agent-model-option-service.ts`
- 测试：`plugin/src/core/agent-model-config-service.test.ts`
- 测试：`plugin/src/core/agent-model-option-service.test.ts`

- [ ] **步骤 1：写 agents 合并测试**

写入 `plugin/src/core/agent-model-config-service.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { mergeAgentModelSummaries } from './agent-model-config-service.js'

describe('mergeAgentModelSummaries', () => {
  it('keeps builtin order and applies global overrides', () => {
    const result = mergeAgentModelSummaries(
      [{ name: 'build', model: 'openai/gpt-5' }, { name: 'reviewer' }],
      { agent: { reviewer: { provider: 'OpenAI', model: 'gpt-5', reasoningEffort: 'high' }, custom: { model: 'local/model' } } }
    )
    expect(result.map((item) => item.name)).toEqual(['build', 'reviewer', 'custom'])
    expect(result[0]?.status).toBe('default')
    expect(result[1]?.status).toBe('override')
    expect(result[2]?.status).toBe('override')
  })
})
```

- [ ] **步骤 2：写模型候选测试**

写入 `plugin/src/core/agent-model-option-service.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { buildModelOptionSet } from './agent-model-option-service.js'
import type { ManagedProviderSummary } from '../types/provider.js'

describe('buildModelOptionSet', () => {
  it('builds provider model and reasoning options from normalized providers', () => {
    const providers: ManagedProviderSummary[] = [{
      name: 'OpenAI', id: 'openai', displayName: 'OpenAI', baseUrl: '', apiType: 'openai-responses', modelCount: 1,
      defaultModel: 'gpt-5', isDefault: true, authStatus: 'ok', status: 'active', source: 'providers-json', createdOrder: 0,
      models: [{ id: 'gpt-5', contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['low', 'high'] }]
    }]
    const options = buildModelOptionSet(providers)
    expect(options.providers).toEqual([{ id: 'OpenAI', label: 'OpenAI' }])
    expect(options.modelsByProvider.OpenAI).toEqual([{ id: 'gpt-5', label: 'gpt-5' }])
    expect(options.reasoningByModel['OpenAI/gpt-5']).toEqual([{ id: 'low', label: 'low' }, { id: 'high', label: 'high' }])
  })
})
```

- [ ] **步骤 3：运行测试，确认模块缺失失败**

```bash
cd plugin && npm test -- src/core/agent-model-config-service.test.ts src/core/agent-model-option-service.test.ts
```

预期：失败，错误包含对应 service 模块缺失。

- [ ] **步骤 4：实现 agents 合并**

写入 `plugin/src/core/agent-model-config-service.ts`：

```ts
import type { AgentModelSummary } from '../types/agent.js'
import type { ReasoningEffort } from '../types/provider.js'

type RawAgent = { name?: string; provider?: string; model?: string; reasoningEffort?: ReasoningEffort }

function getGlobalAgents(globalConfig: unknown): Record<string, RawAgent> {
  if (typeof globalConfig !== 'object' || globalConfig === null) return {}
  const agent = (globalConfig as { agent?: unknown }).agent
  return typeof agent === 'object' && agent !== null ? (agent as Record<string, RawAgent>) : {}
}

export function mergeAgentModelSummaries(builtinAgents: RawAgent[], globalConfig: unknown): AgentModelSummary[] {
  const globalAgents = getGlobalAgents(globalConfig)
  const result: AgentModelSummary[] = []
  const seen = new Set<string>()

  builtinAgents.forEach((builtin, index) => {
    const name = builtin.name ?? `agent-${index}`
    const override = globalAgents[name]
    const source = override ? 'global' : 'builtin'
    const selected = override ?? builtin
    result.push({
      name,
      provider: selected.provider ?? null,
      model: selected.model ?? null,
      reasoningEffort: selected.reasoningEffort ?? null,
      status: selected.model ? (override ? 'override' : 'default') : 'incomplete',
      source,
      isBuiltin: true,
      displayOrder: index
    })
    seen.add(name)
  })

  Object.entries(globalAgents).forEach(([name, agent]) => {
    if (seen.has(name)) return
    result.push({
      name,
      provider: agent.provider ?? null,
      model: agent.model ?? null,
      reasoningEffort: agent.reasoningEffort ?? null,
      status: agent.model ? 'override' : 'incomplete',
      source: 'global',
      isBuiltin: false,
      displayOrder: result.length
    })
  })

  return result
}
```

- [ ] **步骤 5：实现模型候选生成**

写入 `plugin/src/core/agent-model-option-service.ts`：

```ts
import type { ModelOptionSet, SelectableOption } from '../types/agent.js'
import type { ManagedProviderSummary } from '../types/provider.js'

export function buildModelOptionSet(providers: ManagedProviderSummary[]): ModelOptionSet {
  const providerOptions: SelectableOption[] = []
  const modelsByProvider: ModelOptionSet['modelsByProvider'] = {}
  const reasoningByModel: ModelOptionSet['reasoningByModel'] = {}

  for (const provider of providers) {
    providerOptions.push({ id: provider.name, label: provider.displayName })
    modelsByProvider[provider.name] = provider.models.map((model) => ({ id: model.id, label: model.id }))
    for (const model of provider.models) {
      reasoningByModel[`${provider.name}/${model.id}`] = model.reasoningEfforts.map((effort) => ({ id: effort, label: effort }))
    }
  }

  return { providers: providerOptions, modelsByProvider, reasoningByModel }
}
```

- [ ] **步骤 6：运行 agents 测试和构建**

```bash
cd plugin && npm test -- src/core/agent-model-config-service.test.ts src/core/agent-model-option-service.test.ts && npm run build
```

预期：测试通过，构建通过。

- [ ] **步骤 7：提交**

```bash
git add plugin/src/core/agent-model-config-service.ts plugin/src/core/agent-model-option-service.ts plugin/src/core/agent-model-config-service.test.ts plugin/src/core/agent-model-option-service.test.ts
git commit -m "feat(plugin): 实现 agent 模型配置数据服务"
```

## 任务 7：实现 TUI 行渲染与页面文案

**文件：**
- 新建：`plugin/src/tui/provider-row.ts`
- 新建：`plugin/src/tui/agent-row.ts`
- 新建：`plugin/src/tui/page-sidebar.ts`
- 新建：`plugin/src/tui/provider-home-screen.ts`
- 新建：`plugin/src/tui/agent-model-config-screen.ts`
- 测试：`plugin/src/tui/tui-rendering.test.ts`

- [ ] **步骤 1：写渲染测试**

写入 `plugin/src/tui/tui-rendering.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { renderProviderRow } from './provider-row.js'
import { renderAgentRow } from './agent-row.js'
import { renderSidebar } from './page-sidebar.js'

describe('tui rendering', () => {
  it('renders provider row with selected and default markers', () => {
    const row = renderProviderRow({
      name: 'OpenAI', id: 'openai', displayName: 'OpenAI', baseUrl: '', apiType: 'openai-responses', modelCount: 12,
      defaultModel: 'gpt-5', isDefault: true, authStatus: 'ok', status: 'active', source: 'providers-json', models: [], createdOrder: 0
    }, true)
    expect(row).toContain('> * OpenAI')
    expect(row).toContain('models: 12')
    expect(row).toContain('auth: ok')
  })

  it('renders agent row with incomplete status', () => {
    const row = renderAgentRow({ name: 'plan', provider: null, model: null, reasoningEffort: null, status: 'incomplete', source: 'builtin', isBuiltin: true, displayOrder: 0 }, true)
    expect(row).toContain('> plan')
    expect(row).toContain('model: <not set>')
    expect(row).toContain('status: incomplete')
  })

  it('renders active page and sidebar cursor separately', () => {
    const sidebar = renderSidebar(['provider', 'agents'], 'provider', 'agents')
    expect(sidebar).toContain('* provider')
    expect(sidebar).toContain('>  agents')
  })
})
```

- [ ] **步骤 2：运行测试，确认模块缺失失败**

```bash
cd plugin && npm test -- src/tui/tui-rendering.test.ts
```

预期：失败，错误包含渲染模块缺失。

- [ ] **步骤 3：实现 provider 行渲染**

写入 `plugin/src/tui/provider-row.ts`：

```ts
import type { ManagedProviderSummary } from '../types/provider.js'

export function renderProviderRow(provider: ManagedProviderSummary, selected: boolean): string {
  const cursor = selected ? '>' : ' '
  const mark = provider.isDefault ? '*' : ' '
  const model = provider.defaultModel ?? '-'
  return `${cursor} ${mark} ${provider.displayName} ${provider.status} models: ${provider.modelCount} default: ${model} auth: ${provider.authStatus}`
}
```

- [ ] **步骤 4：实现 agent 行渲染**

写入 `plugin/src/tui/agent-row.ts`：

```ts
import type { AgentModelSummary } from '../types/agent.js'

export function renderAgentRow(agent: AgentModelSummary, selected: boolean): string {
  const cursor = selected ? '>' : ' '
  const model = agent.model ?? '<not set>'
  const effort = agent.reasoningEffort ?? '-'
  return `${cursor} ${agent.name} model: ${model} effort: ${effort} status: ${agent.status}`
}
```

- [ ] **步骤 5：实现 sidebar 渲染**

写入 `plugin/src/tui/page-sidebar.ts`：

```ts
import type { PageId } from '../types/tui.js'

export function renderSidebar(pages: PageId[], activePage: PageId, sidebarCursorPage: PageId): string[] {
  return pages.map((page) => {
    const cursor = page === sidebarCursorPage ? '>' : ' '
    const active = page === activePage ? '*' : ' '
    return `${cursor}${active} ${page}`
  })
}
```

- [ ] **步骤 6：实现 provider 首页和 agents 页最小渲染**

写入 `plugin/src/tui/provider-home-screen.ts`：

```ts
import type { ManagedProviderSummary } from '../types/provider.js'
import { renderProviderRow } from './provider-row.js'

export function renderProviderHomeScreen(providers: ManagedProviderSummary[], selectedIndex: number): string[] {
  if (providers.length === 0) return ['No providers configured. Press [a] to add one.']
  return providers.map((provider, index) => renderProviderRow(provider, index === selectedIndex))
}
```

写入 `plugin/src/tui/agent-model-config-screen.ts`：

```ts
import type { AgentModelSummary } from '../types/agent.js'
import { renderAgentRow } from './agent-row.js'

export function renderAgentModelConfigScreen(agents: AgentModelSummary[], selectedIndex: number): string[] {
  return agents.map((agent, index) => renderAgentRow(agent, index === selectedIndex))
}
```

- [ ] **步骤 7：运行渲染测试和构建**

```bash
cd plugin && npm test -- src/tui/tui-rendering.test.ts && npm run build
```

预期：测试通过，构建通过。

- [ ] **步骤 8：提交**

```bash
git add plugin/src/tui plugin/src/tui/tui-rendering.test.ts
git commit -m "feat(plugin): 实现 provider 与 agent TUI 渲染"
```

## 任务 8：实现 ProviderManagerService 与 shell 会话组装

**文件：**
- 新建：`plugin/src/core/provider-manager-service.ts`
- 新建：`plugin/src/tui/provider-manager-shell.ts`
- 修改：`plugin/src/index.ts`
- 测试：`plugin/src/core/provider-manager-service.test.ts`
- 测试：`plugin/src/tui/provider-manager-shell.test.ts`

- [ ] **步骤 1：写 service 测试**

写入 `plugin/src/core/provider-manager-service.test.ts`：

```ts
import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { loadProviderManagerData } from './provider-manager-service.js'

describe('loadProviderManagerData', () => {
  it('loads provider and agent summaries together', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'providers.json'), JSON.stringify({ OpenAI: { baseUrl: 'https://api.openai.com/v1', apiType: 'openai-responses', models: [{ id: 'gpt-5' }] } }))
    await writeFile(join(root, 'settings.json'), JSON.stringify({ defaultProvider: 'OpenAI' }))
    const data = await loadProviderManagerData(root, [{ name: 'reviewer' }])
    expect(data.providers[0]?.name).toBe('OpenAI')
    expect(data.agents[0]?.name).toBe('reviewer')
    expect(data.shell.activePage).toBe('provider')
  })
})
```

- [ ] **步骤 2：写 shell 渲染测试**

写入 `plugin/src/tui/provider-manager-shell.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { renderProviderManagerShell } from './provider-manager-shell.js'
import { createInitialPageShellState } from '../core/page-state-service.js'

describe('renderProviderManagerShell', () => {
  it('renders sidebar and active provider page', () => {
    const output = renderProviderManagerShell({
      shell: createInitialPageShellState(),
      providers: [],
      agents: []
    })
    expect(output).toContain('>* provider')
    expect(output).toContain('No providers configured')
  })
})
```

- [ ] **步骤 3：运行测试，确认模块缺失失败**

```bash
cd plugin && npm test -- src/core/provider-manager-service.test.ts src/tui/provider-manager-shell.test.ts
```

预期：失败，错误包含 service 或 shell 模块缺失。

- [ ] **步骤 4：实现 service 组装**

写入 `plugin/src/core/provider-manager-service.ts`：

```ts
import { readOpencodeConfigSnapshot } from '../infra/opencode-config-reader.js'
import type { AgentModelSummary } from '../types/agent.js'
import type { ManagedProviderSummary, OpencodeConfigSnapshot } from '../types/provider.js'
import type { PageShellState } from '../types/tui.js'
import { mergeAgentModelSummaries } from './agent-model-config-service.js'
import { createInitialPageShellState } from './page-state-service.js'
import { normalizeProviders } from './provider-normalizer.js'

export type ProviderManagerData = {
  snapshot: OpencodeConfigSnapshot
  providers: ManagedProviderSummary[]
  agents: AgentModelSummary[]
  shell: PageShellState
}

export async function loadProviderManagerData(root: string, builtinAgents: unknown[]): Promise<ProviderManagerData> {
  const snapshot = await readOpencodeConfigSnapshot(root, builtinAgents)
  return {
    snapshot,
    providers: normalizeProviders(snapshot.providersJson, snapshot.settingsJson, snapshot.authJson),
    agents: mergeAgentModelSummaries(snapshot.builtinAgents as Array<{ name?: string; model?: string }>, snapshot.globalOpencodeJson),
    shell: createInitialPageShellState()
  }
}
```

- [ ] **步骤 5：实现 shell 渲染**

写入 `plugin/src/tui/provider-manager-shell.ts`：

```ts
import type { AgentModelSummary } from '../types/agent.js'
import type { ManagedProviderSummary } from '../types/provider.js'
import type { PageShellState } from '../types/tui.js'
import { renderAgentModelConfigScreen } from './agent-model-config-screen.js'
import { renderSidebar } from './page-sidebar.js'
import { renderProviderHomeScreen } from './provider-home-screen.js'

export type ProviderManagerShellView = {
  shell: PageShellState
  providers: ManagedProviderSummary[]
  agents: AgentModelSummary[]
}

export function renderProviderManagerShell(view: ProviderManagerShellView): string {
  const sidebar = renderSidebar(view.shell.pages, view.shell.activePage, view.shell.sidebarCursorPage)
  const pageState = view.shell.pageStates[view.shell.activePage]
  const content = view.shell.activePage === 'provider'
    ? renderProviderHomeScreen(view.providers, pageState.selectedIndex)
    : renderAgentModelConfigScreen(view.agents, pageState.selectedIndex)
  return [...sidebar, ...content, view.shell.statusLine?.message ?? ''].filter(Boolean).join('\n')
}
```

- [ ] **步骤 6：更新入口注册**

替换 `plugin/src/index.ts` 为：

```ts
import { loadProviderManagerData } from './core/provider-manager-service.js'
import { renderProviderManagerShell } from './tui/provider-manager-shell.js'

export type PluginContext = {
  configRoot?: string
  builtinAgents?: unknown[]
  registerCommand?: (name: string, handler: () => unknown | Promise<unknown>) => void
}

export function registerProviderManagerPlugin(ctx: PluginContext) {
  ctx.registerCommand?.('provider', async () => {
    const data = await loadProviderManagerData(ctx.configRoot ?? process.cwd(), ctx.builtinAgents ?? [])
    return renderProviderManagerShell(data)
  })
}

export default registerProviderManagerPlugin
```

- [ ] **步骤 7：运行 service/shell 测试和构建**

```bash
cd plugin && npm test -- src/core/provider-manager-service.test.ts src/tui/provider-manager-shell.test.ts && npm run build
```

预期：测试通过，构建通过。

- [ ] **步骤 8：提交**

```bash
git add plugin/src/core/provider-manager-service.ts plugin/src/tui/provider-manager-shell.ts plugin/src/index.ts plugin/src/core/provider-manager-service.test.ts plugin/src/tui/provider-manager-shell.test.ts
git commit -m "feat(plugin): 组装 provider manager 会话"
```

## 任务 9：实现 agent 模型选择弹窗状态流

**文件：**
- 新建：`plugin/src/tui/agent-model-picker-modal.ts`
- 测试：`plugin/src/tui/agent-model-picker-modal.test.ts`

- [ ] **步骤 1：写 agent 弹窗状态测试**

写入 `plugin/src/tui/agent-model-picker-modal.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { confirmAgentModelStep, createAgentModelDraft } from './agent-model-picker-modal.js'

describe('agent model picker modal', () => {
  const options = {
    providers: [{ id: 'OpenAI', label: 'OpenAI' }],
    modelsByProvider: { OpenAI: [{ id: 'gpt-5', label: 'gpt-5' }] },
    reasoningByModel: { 'OpenAI/gpt-5': [{ id: 'high', label: 'high' }] }
  }

  it('moves provider -> model -> reasoning and clears stale values', () => {
    const providerStep = createAgentModelDraft('reviewer', options)
    const modelStep = confirmAgentModelStep(providerStep, options)
    expect(modelStep.step).toBe('select-model')
    expect(modelStep.provider).toBe('OpenAI')
    expect(modelStep.model).toBeNull()

    const reasoningStep = confirmAgentModelStep(modelStep, options)
    expect(reasoningStep.step).toBe('select-reasoning')
    expect(reasoningStep.model).toBe('gpt-5')

    const saved = confirmAgentModelStep(reasoningStep, options)
    expect(saved.reasoningEffort).toBe('high')
  })
})
```

- [ ] **步骤 2：运行测试，确认模块缺失失败**

```bash
cd plugin && npm test -- src/tui/agent-model-picker-modal.test.ts
```

预期：失败，错误包含 `Cannot find module './agent-model-picker-modal.js'`。

- [ ] **步骤 3：实现 agent 弹窗状态流**

写入 `plugin/src/tui/agent-model-picker-modal.ts`：

```ts
import type { AgentModelDraft, ModelOptionSet } from '../types/agent.js'
import type { ReasoningEffort } from '../types/provider.js'

export function createAgentModelDraft(agentName: string, options: ModelOptionSet): AgentModelDraft {
  return {
    agentName,
    provider: null,
    model: null,
    reasoningEffort: null,
    step: 'select-provider',
    searchText: '',
    candidateItems: options.providers,
    selectedIndex: 0
  }
}

export function confirmAgentModelStep(draft: AgentModelDraft, options: ModelOptionSet): AgentModelDraft {
  const selected = draft.candidateItems[draft.selectedIndex]
  if (!selected) return draft

  if (draft.step === 'select-provider') {
    const models = options.modelsByProvider[selected.id] ?? []
    return { ...draft, provider: selected.id, model: null, reasoningEffort: null, step: 'select-model', candidateItems: models, selectedIndex: 0, searchText: '' }
  }

  if (draft.step === 'select-model' && draft.provider) {
    const reasoning = options.reasoningByModel[`${draft.provider}/${selected.id}`] ?? []
    if (reasoning.length === 0) return { ...draft, model: selected.id, reasoningEffort: null }
    return { ...draft, model: selected.id, reasoningEffort: null, step: 'select-reasoning', candidateItems: reasoning, selectedIndex: 0, searchText: '' }
  }

  return { ...draft, reasoningEffort: selected.id as ReasoningEffort }
}
```

- [ ] **步骤 4：运行 agent 弹窗测试和构建**

```bash
cd plugin && npm test -- src/tui/agent-model-picker-modal.test.ts && npm run build
```

预期：测试通过，构建通过。

- [ ] **步骤 5：提交**

```bash
git add plugin/src/tui/agent-model-picker-modal.ts plugin/src/tui/agent-model-picker-modal.test.ts
git commit -m "feat(plugin): 实现 agent 模型选择弹窗状态"
```

## 任务 10：实现配置写回最小闭环

**文件：**
- 新建：`plugin/src/infra/opencode-config-writer.ts`
- 测试：`plugin/src/infra/opencode-config-writer.test.ts`

- [ ] **步骤 1：写配置写回测试**

写入 `plugin/src/infra/opencode-config-writer.test.ts`：

```ts
import { mkdtemp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { writeGlobalAgentConfig, writeProvidersConfig } from './opencode-config-writer.js'

describe('opencode config writer', () => {
  it('writes providers json', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeProvidersConfig(root, { OpenAI: { baseUrl: 'https://api.openai.com/v1' } })
    const content = JSON.parse(await readFile(join(root, 'providers.json'), 'utf8'))
    expect(content.OpenAI.baseUrl).toBe('https://api.openai.com/v1')
  })

  it('writes global agent model override', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeGlobalAgentConfig(root, 'reviewer', { provider: 'OpenAI', model: 'gpt-5', reasoningEffort: 'high' })
    const content = JSON.parse(await readFile(join(root, 'opencode.json'), 'utf8'))
    expect(content.agent.reviewer).toEqual({ provider: 'OpenAI', model: 'gpt-5', reasoningEffort: 'high' })
  })
})
```

- [ ] **步骤 2：运行测试，确认模块缺失失败**

```bash
cd plugin && npm test -- src/infra/opencode-config-writer.test.ts
```

预期：失败，错误包含 `Cannot find module './opencode-config-writer.js'`。

- [ ] **步骤 3：实现配置写回**

写入 `plugin/src/infra/opencode-config-writer.ts`：

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { resolveOpencodePaths } from './path-resolver.js'

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function readJson(filePath: string): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

export async function writeProvidersConfig(root: string, providers: unknown): Promise<void> {
  const paths = resolveOpencodePaths(root)
  await writeJson(paths.providersJson, providers)
}

export async function writeGlobalAgentConfig(root: string, agentName: string, config: Record<string, unknown>): Promise<void> {
  const paths = resolveOpencodePaths(root)
  const current = await readJson(paths.globalOpencodeJson)
  const agent = typeof current.agent === 'object' && current.agent !== null ? current.agent as Record<string, unknown> : {}
  agent[agentName] = config
  await writeJson(paths.globalOpencodeJson, { ...current, agent })
}
```

- [ ] **步骤 4：运行 writer 测试和构建**

```bash
cd plugin && npm test -- src/infra/opencode-config-writer.test.ts && npm run build
```

预期：测试通过，构建通过。

- [ ] **步骤 5：提交**

```bash
git add plugin/src/infra/opencode-config-writer.ts plugin/src/infra/opencode-config-writer.test.ts
git commit -m "feat(plugin): 实现配置写回闭环"
```

## 任务 11：最终验证与文档一致性检查

**文件：**
- 修改：`README.md`
- 检查：`docs/plans/26-05-23_provider-manager/architecture/provider-manager-extension.md`
- 检查：`docs/plans/26-05-23_provider-manager/detail/structures/provider-manager-context.md`
- 检查：`docs/plans/26-05-23_provider-manager/detail/dataflow/provider-manager-overview.md`

- [ ] **步骤 1：运行完整测试与构建**

```bash
cd plugin && npm test && npm run build
```

预期：所有 Vitest 测试通过，`tsc` 退出码为 0。

- [ ] **步骤 2：检查核心结构是否落地**

运行：

```bash
cd plugin && npm test -- src/types/type-contract.test.ts src/core/page-state-service.test.ts src/core/provider-manager-service.test.ts
```

预期：覆盖 `OpencodeConfigSnapshot`、`ManagedProviderSummary`、`ProviderEditDraft`、`PageShellState`、`AgentModelSummary`、`AgentModelDraft` 的测试全部通过。

- [ ] **步骤 3：更新 README 插件执行说明**

在 `README.md` 增加以下段落：

````markdown
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
````

- [ ] **步骤 4：运行最终状态检查**

```bash
git status --short
```

预期：只显示本计划创建或修改的 `plugin/` 与 `README.md` 文件。

- [ ] **步骤 5：提交**

```bash
git add README.md plugin
git commit -m "feat(plugin): 完成 provider manager 最小实现闭环"
```

## 自检结果

- 规格覆盖：任务 1-2 覆盖工程骨架与结构体；任务 3-4 覆盖配置读取、provider 标准化和校验；任务 5 覆盖 shell 双状态和焦点分发；任务 6 覆盖 agents 合并和模型候选；任务 7-9 覆盖 TUI 渲染与 agent 弹窗状态；任务 10 覆盖写回出口；任务 11 覆盖最终验证和 README。
- 占位符扫描：每个实现步骤都给出文件路径、代码块、命令和预期结果；未发现空泛待补内容。
- 类型一致性：计划全程使用 `OpencodeConfigSnapshot`、`ManagedProviderSummary`、`ProviderEditDraft`、`PageShellState`、`AgentModelSummary`、`AgentModelDraft`、`ModelOptionSet`，与 detail 文档一致。
- 执行交接：保存后进入 `executing-plans`，按任务顺序执行；完成实现后运行 `verification-before-completion`，再用 `implementation-final-gate` 对照 architecture/detail/代码/验证证据做一致性验收。
