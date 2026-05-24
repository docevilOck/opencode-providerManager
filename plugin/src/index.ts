import { loadProviderManagerData } from './core/provider-manager-service.js'
import { handleAgentModelConfirmAction, handleProviderSaveAction, renderProviderManagerShell } from './tui/provider-manager-shell.js'
import type { AgentModelDraft } from './types/agent.js'
import type { ProviderEditDraft } from './types/provider.js'

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

export function registerProviderManagerPlugin(ctx: PluginContext) {
  ctx.registerCommand?.('provider', async () => {
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
  })
}

export default registerProviderManagerPlugin
