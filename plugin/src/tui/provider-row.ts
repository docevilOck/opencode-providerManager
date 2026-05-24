import type { ManagedProviderSummary } from '../types/provider.js'

export function renderProviderRow(provider: ManagedProviderSummary, selected: boolean): string {
  const cursor = selected ? '>' : ' '
  const mark = provider.isDefault ? '*' : ' '
  const model = provider.defaultModel ?? '-'
  return `${cursor} ${mark} ${provider.displayName} ${provider.status} models: ${provider.modelCount} default: ${model} auth: ${provider.authStatus}`
}
