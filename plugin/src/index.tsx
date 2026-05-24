import { loadProviderManagerData } from './core/provider-manager-service.js'
import { handleAgentModelConfirmAction, handleProviderSaveAction, renderProviderManagerShell } from './tui/provider-manager-shell.js'
import type { AgentModelDraft } from './types/agent.js'
import type { ProviderEditDraft } from './types/provider.js'

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
  ctx.registerCommand?.('provider', async () => {
    return createProviderManagerSession(ctx)
  })
}

const PROVIDER_MANAGER_ROUTE = 'provider-manager'

function ProviderManagerScreen(props: { content?: unknown }) {
  const content = typeof props.content === 'string' ? props.content : 'Provider Manager is loading...'
  const lines = content.split('\n')

  return (
    <box width="100%" height="100%" flexDirection="column" paddingTop={1} paddingLeft={2} paddingRight={2}>
      <text fg="cyan">Provider Manager</text>
      <box flexDirection="column" paddingTop={1}>
        {lines.map((line) => <text>{line || ' '}</text>)}
      </box>
    </box>
  )
}

function configRootFromApi(api: ProviderManagerTuiApi): string {
  return api.state?.path?.config || api.state?.path?.directory || process.cwd()
}

function builtinAgentsFromApi(api: ProviderManagerTuiApi): unknown[] {
  const agents = api.state?.config?.agent
  if (!agents || typeof agents !== 'object') return []
  return Object.entries(agents).map(([name, config]) => ({ name, model: config?.model }))
}

async function createSessionFromApi(api: ProviderManagerTuiApi): Promise<ProviderManagerSession> {
  return createProviderManagerSession({ configRoot: configRootFromApi(api), builtinAgents: builtinAgentsFromApi(api) })
}

async function openProviderManager(api: ProviderManagerTuiApi): Promise<void> {
  const session = await createSessionFromApi(api)
  api.route?.navigate(PROVIDER_MANAGER_ROUTE, { content: session.render() })
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

async function addProvider(api: ProviderManagerTuiApi): Promise<void> {
  const name = await promptValue(api, 'Provider name', 'openai')
  if (!name) return
  const baseUrl = await promptValue(api, 'Base URL', 'https://api.openai.com/v1')
  if (!baseUrl) return
  const apiKey = await promptValue(api, 'API key')
  if (!apiKey) return
  try {
    const session = await createSessionFromApi(api)
    const content = await session.handleProviderSave({
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
    })
    api.route?.navigate(PROVIDER_MANAGER_ROUTE, { content })
  } catch (error) {
    api.ui?.toast?.({ variant: 'error', title: 'Provider Manager', message: error instanceof Error ? error.message : String(error), duration: 5000 })
  }
}

async function tui(api: ProviderManagerTuiApi) {
  api.route?.register([{ name: PROVIDER_MANAGER_ROUTE, render: ({ params }) => <ProviderManagerScreen content={params?.['content']} /> }])

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
        await openProviderManager(api)
      }
    }],
    bindings: []
  })

  api.keymap?.registerLayer({
    enabled: () => api.route?.current?.name === PROVIDER_MANAGER_ROUTE,
    commands: [
      {
        name: 'provider-manager.add',
        title: 'Add provider',
        desc: 'Add a provider to providers.json/auth.json',
        category: 'Provider',
        run: () => addProvider(api)
      },
      {
        name: 'provider-manager.refresh',
        title: 'Refresh providers',
        desc: 'Reload provider manager config',
        category: 'Provider',
        run: () => openProviderManager(api)
      }
    ],
    bindings: [
      { key: 'a', cmd: 'provider-manager.add', desc: 'Add provider' },
      { key: 'r', cmd: 'provider-manager.refresh', desc: 'Refresh providers' }
    ]
  })
}

export default {
  id: 'provider-manager',
  tui
}
