export type PluginContext = {
  registerCommand?: (name: string, handler: () => unknown | Promise<unknown>) => void
}

export function registerProviderManagerPlugin(ctx: PluginContext) {
  ctx.registerCommand?.('provider', async () => ({ command: 'provider' }))
}

export default registerProviderManagerPlugin
