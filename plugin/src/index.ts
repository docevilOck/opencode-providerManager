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

async function tui(api: ProviderManagerTuiApi) {
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
        api.ui?.toast?.({
          variant: 'info',
          title: 'Provider Manager',
          message: session.render(),
          duration: 5000
        })
      }
    }],
    bindings: []
  })
}

export default {
  id: 'provider-manager',
  tui
}
