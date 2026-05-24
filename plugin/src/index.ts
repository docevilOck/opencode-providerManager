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
