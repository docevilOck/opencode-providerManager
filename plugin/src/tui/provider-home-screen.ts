import type { ManagedProviderSummary } from '../types/provider.js'
import { renderProviderRow } from './provider-row.js'

export function renderProviderHomeScreen(providers: ManagedProviderSummary[], selectedIndex: number): string[] {
  if (providers.length === 0) return ['No providers configured. Press [a] to add one.']
  return providers.map((provider, index) => renderProviderRow(provider, index === selectedIndex))
}
