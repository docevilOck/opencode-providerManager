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
