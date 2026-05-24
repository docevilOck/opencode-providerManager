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
  run: () => void | Promise<void>
}

type ProviderManagerTuiApi = {
  route?: {
    register: (routes: Array<{ name: string; render: (input: { params?: Record<string, unknown> }) => unknown }>) => () => void
    navigate: (name: string, params?: Record<string, unknown>) => void
  }
  keymap?: {
    registerLayer: (layer: { commands: ProviderManagerTuiCommand[]; bindings?: unknown[] }) => () => void
  }
  ui?: {
    toast?: (input: { variant: 'info' | 'error'; title: string; message: string; duration?: number }) => void
    dialog?: { clear?: () => void }
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
        const session = await createProviderManagerSession()
        api.route?.navigate(PROVIDER_MANAGER_ROUTE, { content: session.render() })
      }
    }],
    bindings: []
  })
}

export default {
  id: 'provider-manager',
  tui
}
