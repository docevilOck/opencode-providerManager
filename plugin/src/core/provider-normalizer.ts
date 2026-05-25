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

function providerApiKey(name: string, provider: RawProvider, auth: Record<string, unknown>): string | null {
  const authEntry = auth[name]
  if (isRecord(authEntry) && typeof authEntry.apiKey === 'string' && authEntry.apiKey.length > 0) return authEntry.apiKey
  if (typeof provider.options?.apiKey === 'string' && provider.options.apiKey.length > 0) return provider.options.apiKey
  return null
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
    const apiKey = providerApiKey(name, provider, auth)
    const isDefault = defaultProvider?.toLowerCase() === name.toLowerCase()
    return {
      name,
      id: name.toLowerCase(),
      displayName: name,
      baseUrl: provider.baseUrl ?? provider.baseURL ?? provider.options?.baseURL ?? '',
      apiType: provider.apiType ?? 'openai-compatible-chat',
      modelCount: models.length,
      defaultModel: provider.defaultModel ?? null,
      apiKey,
      isDefault,
      authStatus: apiKey ? 'ok' : 'missing',
      status: isDefault ? 'active' : 'ready',
      source: isRecord(providersJson) && name in providersJson ? 'providers-json' : 'opencode-json',
      models,
      createdOrder: index
    }
  })

  return rows.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdOrder - b.createdOrder)
}
