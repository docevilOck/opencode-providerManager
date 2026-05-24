import { createSignal } from 'solid-js'
import { buildModelOptionSet } from './core/agent-model-option-service.js'
import { loadProviderManagerData, type ProviderManagerData } from './core/provider-manager-service.js'
import { handleAgentModelConfirmAction, handleProviderSaveAction, renderProviderManagerShell } from './tui/provider-manager-shell.js'
import type { AgentModelDraft, AgentModelSummary } from './types/agent.js'
import type { ManagedProviderSummary, ProviderEditDraft } from './types/provider.js'
import type { PageId, PageShellState } from './types/tui.js'

type ProviderManagerTuiCommand = {
  name: string
  title: string
  desc?: string
  description?: string
  namespace?: string
  category?: string
  slashName?: string
  slashAliases?: string[]
  enabled?: () => boolean
  run: () => void | Promise<void>
}

type ProviderManagerTuiDialogPrompt = (props: {
  title: string
  placeholder?: string
  value?: string
  onConfirm?: (value: string) => void
  onCancel?: () => void
}) => unknown

type ProviderManagerTuiDialogSelectOption<Value> = {
  title: string
  value: Value
  description?: string
  category?: string
  disabled?: boolean
}

type ProviderManagerTuiDialogSelect = <Value>(props: {
  title: string
  options: ProviderManagerTuiDialogSelectOption<Value>[]
  current?: Value
  onSelect?: (option: ProviderManagerTuiDialogSelectOption<Value>) => void
}) => unknown

type ProviderManagerTuiApi = {
  route?: {
    readonly current?: { name?: string }
    register: (routes: Array<{ name: string; render: (input: { params?: Record<string, unknown> }) => unknown }>) => () => void
    navigate: (name: string, params?: Record<string, unknown>) => void
  }
  keymap?: {
    registerLayer: (layer: { enabled?: () => boolean; commands: ProviderManagerTuiCommand[]; bindings?: unknown[] }) => () => void
  }
  ui?: {
    toast?: (input: { variant: 'info' | 'error'; title: string; message: string; duration?: number }) => void
    DialogPrompt?: ProviderManagerTuiDialogPrompt
    DialogSelect?: ProviderManagerTuiDialogSelect
    dialog?: { clear?: () => void; replace?: (render: () => unknown, onClose?: () => void) => void; setSize?: (size: 'small' | 'medium' | 'large') => void }
  }
  state?: {
    path?: { config?: string; directory?: string }
    config?: { agent?: Record<string, { model?: string }> }
  }
}

export type PluginContext = {
  configRoot?: string
  builtinAgents?: unknown[]
  registerCommand?: (name: string, handler: () => unknown | Promise<unknown>) => void
}

export type ProviderManagerSession = {
  render: () => string
  handleProviderSave: (draft: ProviderEditDraft) => Promise<string>
  handleAgentModelConfirm: (draft: AgentModelDraft) => Promise<string>
}

const PROVIDER_MANAGER_ROUTE = 'provider-manager'
const PAGE_ORDER: PageId[] = ['provider', 'agents']

export async function createProviderManagerSession(ctx: Pick<PluginContext, 'configRoot' | 'builtinAgents'> = {}): Promise<ProviderManagerSession> {
  const root = ctx.configRoot ?? process.cwd()
  const builtinAgents = ctx.builtinAgents ?? []
  let data = await loadProviderManagerData(root, builtinAgents)
  const session: ProviderManagerSession = {
    render: () => renderProviderManagerShell(data),
    handleProviderSave: async (draft) => {
      data = await handleProviderSaveAction(root, data, draft, builtinAgents)
      return session.render()
    },
    handleAgentModelConfirm: async (draft) => {
      data = await handleAgentModelConfirmAction(root, data, draft, builtinAgents)
      return session.render()
    }
  }
  return session
}

export function registerProviderManagerPlugin(ctx: PluginContext) {
  ctx.registerCommand?.('provider', async () => createProviderManagerSession(ctx))
}

function configRootFromApi(api: ProviderManagerTuiApi): string {
  return api.state?.path?.config || api.state?.path?.directory || process.cwd()
}

function builtinAgentsFromApi(api: ProviderManagerTuiApi): unknown[] {
  const agents = api.state?.config?.agent
  if (!agents || typeof agents !== 'object') return []
  return Object.entries(agents).map(([name, config]) => ({ name, model: config?.model }))
}

function replaceShell(data: ProviderManagerData, shell: PageShellState): ProviderManagerData {
  return { ...data, shell }
}

function moveSidebar(shell: PageShellState, delta: number): PageShellState {
  const current = PAGE_ORDER.indexOf(shell.sidebarCursorPage)
  const next = (current + delta + PAGE_ORDER.length) % PAGE_ORDER.length
  const sidebarCursorPage = PAGE_ORDER[next]
  return {
    ...shell,
    sidebarCursorPage,
    statusLine: sidebarCursorPage !== shell.activePage ? { level: 'info', message: 'Press Enter to switch page' } : null
  }
}

function activateSidebar(shell: PageShellState): PageShellState {
  return {
    ...shell,
    activePage: shell.sidebarCursorPage,
    focusRegion: 'content',
    statusLine: null
  }
}

function focusSidebar(shell: PageShellState): PageShellState {
  return {
    ...shell,
    focusRegion: 'sidebar',
    sidebarCursorPage: shell.activePage,
    statusLine: null
  }
}

function moveContent(shell: PageShellState, data: ProviderManagerData, delta: number): PageShellState {
  const page = shell.activePage
  const count = page === 'provider' ? data.providers.length : data.agents.length
  if (count < 1) return shell
  const state = shell.pageStates[page]
  const selectedIndex = Math.max(0, Math.min(count - 1, state.selectedIndex + delta))
  return {
    ...shell,
    pageStates: {
      ...shell.pageStates,
      [page]: { ...state, selectedIndex }
    }
  }
}

function promptValue(api: ProviderManagerTuiApi, title: string, placeholder?: string): Promise<string | null> {
  const DialogPrompt = api.ui?.DialogPrompt
  if (!DialogPrompt || !api.ui?.dialog?.replace) return Promise.resolve(null)
  api.ui.dialog.setSize?.('medium')
  return new Promise((resolve) => {
    api.ui?.dialog?.replace?.(
      () => (
        <DialogPrompt
          title={title}
          placeholder={placeholder}
          onConfirm={(value) => {
            api.ui?.dialog?.clear?.()
            resolve(value.trim())
          }}
          onCancel={() => {
            api.ui?.dialog?.clear?.()
            resolve(null)
          }}
        />
      ),
      () => resolve(null)
    )
  })
}

function selectValue<Value>(api: ProviderManagerTuiApi, title: string, options: ProviderManagerTuiDialogSelectOption<Value>[]): Promise<Value | null> {
  const DialogSelect = api.ui?.DialogSelect
  if (!DialogSelect || !api.ui?.dialog?.replace || options.length < 1) return Promise.resolve(null)
  api.ui.dialog.setSize?.('medium')
  return new Promise((resolve) => {
    api.ui?.dialog?.replace?.(
      () => (
        <DialogSelect
          title={title}
          options={options}
          onSelect={(option) => {
            api.ui?.dialog?.clear?.()
            resolve(option.value)
          }}
        />
      ),
      () => resolve(null)
    )
  })
}

function ProviderManagerRoute(props: { data: () => ProviderManagerData | null }) {
  const data = props.data
  const shell = () => data()?.shell
  const sidebarRows = () => (shell()?.pages ?? PAGE_ORDER).map((page) => ({
    page,
    active: shell()?.activePage === page,
    cursor: shell()?.sidebarCursorPage === page
  }))
  const selectedProvider = () => data()?.shell.pageStates.provider.selectedIndex ?? 0
  const selectedAgent = () => data()?.shell.pageStates.agents.selectedIndex ?? 0

  return (
    <box width="100%" height="100%" flexDirection="column" paddingTop={1} paddingLeft={2} paddingRight={2}>
      <text fg="cyan">Provider Manager</text>
      <box flexDirection="row" paddingTop={1} flexGrow={1}>
        <box width={20} flexDirection="column" paddingRight={2}>
          {sidebarRows().map((row) => (
            <text fg={row.cursor ? 'cyan' : row.active ? 'green' : 'white'}>
              {row.cursor ? '>' : ' '} {row.active ? '*' : ' '} {row.page}
            </text>
          ))}
        </box>
        <box flexGrow={1} flexDirection="column">
          {data()?.error ? <text fg="red">Error: {data()?.error}</text> : shell()?.activePage === 'agents'
            ? <AgentList agents={data()?.agents ?? []} selectedIndex={selectedAgent()} />
            : <ProviderList providers={data()?.providers ?? []} selectedIndex={selectedProvider()} />}
        </box>
      </box>
      <text fg="gray">{statusLine(shell())}</text>
    </box>
  )
}

function ProviderList(props: { providers: ManagedProviderSummary[]; selectedIndex: number }) {
  if (props.providers.length < 1) return <text fg="yellow">No providers configured. Press [a] to add one.</text>
  return (
    <box flexDirection="column">
      <text fg="cyan">Providers</text>
      {props.providers.map((provider, index) => (
        <text fg={index === props.selectedIndex ? 'cyan' : 'white'}>
          {index === props.selectedIndex ? '>' : ' '} {provider.name} {provider.isDefault ? '[default]' : ''} models:{provider.modelCount} auth:{provider.authStatus} source:{provider.source}
        </text>
      ))}
    </box>
  )
}

function AgentList(props: { agents: AgentModelSummary[]; selectedIndex: number }) {
  if (props.agents.length < 1) return <text fg="yellow">No agents available.</text>
  return (
    <box flexDirection="column">
      <text fg="cyan">Agents</text>
      {props.agents.map((agent, index) => (
        <text fg={index === props.selectedIndex ? 'cyan' : 'white'}>
          {index === props.selectedIndex ? '>' : ' '} {agent.name} provider:{agent.provider ?? '<not set>'} model:{agent.model ?? '<not set>'} status:{agent.status}
        </text>
      ))}
    </box>
  )
}

function statusLine(shell: PageShellState | undefined): string {
  if (!shell) return 'Loading...'
  if (shell.statusLine?.message) return shell.statusLine.message
  if (shell.focusRegion === 'sidebar') return 'Sidebar: ↑/↓ move, Enter switch, Esc close'
  if (shell.activePage === 'provider') return 'Provider: ↑/↓ select, a add, r refresh, Esc sidebar'
  return 'Agents: ↑/↓ select, Enter configure model, r refresh, Esc sidebar'
}

async function tui(api: ProviderManagerTuiApi) {
  const root = configRootFromApi(api)
  const builtinAgents = builtinAgentsFromApi(api)
  const [data, setData] = createSignal<ProviderManagerData | null>(null)

  async function reload(shell?: PageShellState) {
    const next = await loadProviderManagerData(root, builtinAgents)
    setData(shell ? replaceShell(next, shell) : next)
  }

  async function openProviderManager() {
    await reload()
    api.route?.navigate(PROVIDER_MANAGER_ROUTE)
  }

  function updateShell(mutator: (current: PageShellState, currentData: ProviderManagerData) => PageShellState) {
    const currentData = data()
    if (!currentData) return
    setData(replaceShell(currentData, mutator(currentData.shell, currentData)))
  }

  async function addProvider() {
    const name = await promptValue(api, 'Provider name', 'openai')
    if (!name) return
    const baseUrl = await promptValue(api, 'Base URL', 'https://api.openai.com/v1')
    if (!baseUrl) return
    const apiKey = await promptValue(api, 'API key')
    if (!apiKey) return
    const currentData = data()
    if (!currentData) return
    try {
      const next = await handleProviderSaveAction(root, currentData, {
        originalName: null,
        name,
        baseUrl,
        apiType: 'openai-compatible-chat',
        apiKey,
        defaultModel: null,
        models: [],
        modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['minimal', 'low', 'medium', 'high', 'xhigh'] },
        dirtyFields: new Set(),
        validationErrors: [],
        protocolChanged: false
      }, builtinAgents)
      setData(next)
    } catch (error) {
      api.ui?.toast?.({ variant: 'error', title: 'Provider Manager', message: error instanceof Error ? error.message : String(error), duration: 5000 })
    }
  }

  async function configureSelectedAgent() {
    const currentData = data()
    if (!currentData) return
    const selected = currentData.shell.pageStates.agents.selectedIndex
    const agent = currentData.agents[selected]
    if (!agent) return
    const options = buildModelOptionSet(currentData.providers)
    const provider = await selectValue(api, `Provider for ${agent.name}`, options.providers.map((item) => ({ title: item.label, value: item.id })))
    if (!provider) return
    const model = await selectValue(api, `Model for ${agent.name}`, (options.modelsByProvider[provider] ?? []).map((item) => ({ title: item.label, value: item.id })))
    if (!model) return
    const reasoningOptions = options.reasoningByModel[`${provider}/${model}`] ?? []
    const reasoningEffort = reasoningOptions.length
      ? await selectValue(api, `Reasoning for ${agent.name}`, reasoningOptions.map((item) => ({ title: item.label, value: item.id })))
      : null
    const next = await handleAgentModelConfirmAction(root, currentData, {
      agentName: agent.name,
      provider,
      model,
      reasoningEffort: reasoningEffort as AgentModelDraft['reasoningEffort'],
      step: reasoningEffort ? 'select-reasoning' : 'select-model',
      searchText: '',
      candidateItems: [],
      selectedIndex: 0
    }, builtinAgents)
    setData(next)
  }

  api.route?.register([{ name: PROVIDER_MANAGER_ROUTE, render: () => <ProviderManagerRoute data={data} /> }])

  api.keymap?.registerLayer({
    commands: [{
      name: 'provider-manager.open',
      title: 'Provider Manager',
      desc: 'Inspect configured providers and agent models',
      description: 'Inspect configured providers and agent models',
      namespace: 'palette',
      category: 'Provider',
      slashName: 'provider',
      slashAliases: ['providers'],
      run: async () => {
        api.ui?.dialog?.clear?.()
        await openProviderManager()
      }
    }],
    bindings: []
  })

  api.keymap?.registerLayer({
    enabled: () => api.route?.current?.name === PROVIDER_MANAGER_ROUTE && data()?.shell.focusRegion !== 'modal',
    commands: [
      { name: 'provider-manager.up', title: 'Move up', category: 'Provider', run: () => updateShell((shell, currentData) => shell.focusRegion === 'sidebar' ? moveSidebar(shell, -1) : moveContent(shell, currentData, -1)) },
      { name: 'provider-manager.down', title: 'Move down', category: 'Provider', run: () => updateShell((shell, currentData) => shell.focusRegion === 'sidebar' ? moveSidebar(shell, 1) : moveContent(shell, currentData, 1)) },
      { name: 'provider-manager.enter', title: 'Confirm', category: 'Provider', run: () => {
        const currentData = data()
        if (!currentData) return
        if (currentData.shell.focusRegion === 'sidebar') updateShell((shell) => activateSidebar(shell))
        else if (currentData.shell.activePage === 'agents') void configureSelectedAgent()
      } },
      { name: 'provider-manager.escape', title: 'Back to sidebar', category: 'Provider', run: () => updateShell((shell) => focusSidebar(shell)) },
      { name: 'provider-manager.add', title: 'Add provider', desc: 'Add a provider to providers.json/auth.json', category: 'Provider', run: () => addProvider() },
      { name: 'provider-manager.refresh', title: 'Refresh providers', desc: 'Reload provider manager config', category: 'Provider', run: () => reload(data()?.shell) }
    ],
    bindings: [
      { key: 'up', cmd: 'provider-manager.up', desc: 'Move up' },
      { key: 'down', cmd: 'provider-manager.down', desc: 'Move down' },
      { key: 'enter', cmd: 'provider-manager.enter', desc: 'Confirm' },
      { key: 'return', cmd: 'provider-manager.enter', desc: 'Confirm' },
      { key: 'escape', cmd: 'provider-manager.escape', desc: 'Back to sidebar' },
      { key: 'a', cmd: 'provider-manager.add', desc: 'Add provider' },
      { key: 'r', cmd: 'provider-manager.refresh', desc: 'Refresh providers' }
    ]
  })
}

export default {
  id: 'provider-manager',
  tui
}
