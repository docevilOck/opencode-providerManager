import { loadProviderManagerData } from './core/provider-manager-service.js'
import { handleAgentModelConfirmAction, handleProviderSaveAction, renderProviderManagerShell } from './tui/provider-manager-shell.js'
import type { AgentModelDraft } from './types/agent.js'
import type { ProviderEditDraft } from './types/provider.js'

type LegacyTuiCommandDialog = {
  clear?: () => void
}

type LegacyTuiCommand = {
  title: string
  value: string
  description?: string
  category?: string
  slash?: { name: string; aliases?: string[] }
  onSelect?: (dialog?: LegacyTuiCommandDialog) => void | Promise<void>
}

type ProviderManagerTuiApi = {
  command?: {
    register: (commands: () => LegacyTuiCommand[]) => () => void
  }
  ui?: {
    toast?: (input: { variant: 'info' | 'error'; title: string; message: string; duration?: number }) => void
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
  api.command?.register(() => [
    {
      title: 'Provider Manager',
      value: 'provider-manager.open',
      description: 'Inspect configured providers and agent models',
      category: 'Provider',
      slash: { name: 'provider', aliases: ['providers'] },
      onSelect: async (dialog) => {
        dialog?.clear?.()
        const session = await createProviderManagerSession()
        api.ui?.toast?.({
          variant: 'info',
          title: 'Provider Manager',
          message: session.render(),
          duration: 5000
        })
      }
    }
  ])
}

export default {
  id: 'provider-manager',
  tui
}
