import type { ManagedProviderSummary, ProviderApiType, ProviderModelConfig } from '../types/provider.js'

type RawProvider = {
  baseUrl?: string
  baseURL?: string
  apiType?: ProviderApiType
  models?: Array<Partial<ProviderModelConfig> & { id: string }> | Record<string, unknown>
  defaultModel?: string
  options?: { baseURL?: string; apiKey?: string }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function rawModels(provider: RawProvider): Array<Partial<ProviderModelConfig> & { id: string }> {
  if (Array.isArray(provider.models)) return provider.models
  if (!isRecord(provider.models)) return []
  return Object.keys(provider.models).map((id) => ({ id }))
}

function globalProviders(globalOpencodeJson: unknown): Record<string, unknown> {
  if (!isRecord(globalOpencodeJson) || !isRecord(globalOpencodeJson.provider)) return {}
  return globalOpencodeJson.provider
}

export function normalizeProviders(providersJson: unknown, settingsJson: unknown, authJson: unknown, globalOpencodeJson: unknown = {}): ManagedProviderSummary[] {
  const providers = { ...globalProviders(globalOpencodeJson), ...(isRecord(providersJson) ? providersJson : {}) }
  const settings = isRecord(settingsJson) ? settingsJson : {}
  const auth = isRecord(authJson) ? authJson : {}
  const defaultProvider = typeof settings.defaultProvider === 'string'
    ? settings.defaultProvider
    : isRecord(globalOpencodeJson) && typeof globalOpencodeJson.model === 'string'
      ? globalOpencodeJson.model.split('/')[0] ?? null
      : null

  const rows = Object.entries(providers).map(([name, raw], index): ManagedProviderSummary => {
    const provider = (isRecord(raw) ? raw : {}) as RawProvider
    const models = rawModels(provider).map((model) => ({
      id: model.id,
      contextWindow: model.contextWindow ?? '256k',
      maxOutput: model.maxOutput ?? '128k',
      inputTypes: model.inputTypes ?? ['text', 'image'],
      reasoningEfforts: model.reasoningEfforts ?? ['minimal', 'low', 'medium', 'high', 'xhigh']
    }))
    const hasAuth = (isRecord(auth[name]) && typeof (auth[name] as Record<string, unknown>).apiKey === 'string') || typeof provider.options?.apiKey === 'string'
    const isDefault = defaultProvider?.toLowerCase() === name.toLowerCase()
    return {
      name,
      id: name.toLowerCase(),
      displayName: name,
      baseUrl: provider.baseUrl ?? provider.baseURL ?? provider.options?.baseURL ?? '',
      apiType: provider.apiType ?? 'openai-compatible-chat',
      modelCount: models.length,
      defaultModel: provider.defaultModel ?? null,
      isDefault,
      authStatus: hasAuth ? 'ok' : 'missing',
      status: isDefault ? 'active' : 'ready',
      source: isRecord(providersJson) && name in providersJson ? 'providers-json' : 'opencode-json',
      models,
      createdOrder: index
    }
  })

  return rows.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdOrder - b.createdOrder)
}
