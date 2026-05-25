import type { ManagedProviderSummary } from '../types/provider.js'
import { renderProviderRow } from './provider-row.js'
import { keyHint, titleLine } from './theme.js'

export function renderProviderHomeScreen(providers: ManagedProviderSummary[], selectedIndex: number, scrollOffset = 0, windowSize = providers.length): string[] {
  const defaultProvider = providers.find((provider) => provider.isDefault)?.displayName ?? '-'
  const header = titleLine(`Providers (${providers.length})`, `default ${defaultProvider}`)
  if (providers.length === 0) return [header, 'No providers configured.', keyHint('[a] Add   [r] Refresh   [esc] Back')]
  return [header, ...providers.slice(scrollOffset, scrollOffset + windowSize).map((provider, index) => {
    const absoluteIndex = scrollOffset + index
    return renderProviderRow(provider, absoluteIndex === selectedIndex)
  })]
}
