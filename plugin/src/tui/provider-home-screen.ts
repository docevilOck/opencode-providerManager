import type { ManagedProviderSummary } from '../types/provider.js'
import { renderProviderRow } from './provider-row.js'

export function renderProviderHomeScreen(providers: ManagedProviderSummary[], selectedIndex: number, scrollOffset = 0, windowSize = providers.length): string[] {
  const defaultProvider = providers.find((provider) => provider.isDefault)?.displayName ?? '-'
  const header = `Providers (${providers.length}) Default: ${defaultProvider}`
  if (providers.length === 0) return [header, 'No providers configured. Press [a] to add one.']
  return [header, ...providers.slice(scrollOffset, scrollOffset + windowSize).map((provider, index) => {
    const absoluteIndex = scrollOffset + index
    return renderProviderRow(provider, absoluteIndex === selectedIndex)
  })]
}
