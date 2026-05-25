import type { ManagedProviderSummary } from '../types/provider.js'

const PROVIDER_NAME_WIDTH = 24

function truncateField(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`
}

export function renderProviderRow(provider: ManagedProviderSummary, selected: boolean): string {
  const cursor = selected ? '>' : ' '
  const mark = provider.isDefault ? '*' : ' '
  const name = truncateField(provider.displayName, PROVIDER_NAME_WIDTH)
  const state = `${provider.status}/${provider.authStatus}`
  return `${cursor} ${mark} ${name.padEnd(PROVIDER_NAME_WIDTH)} models ${String(provider.modelCount).padStart(2)}  ${state}`
}
