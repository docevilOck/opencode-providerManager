import type { ProviderEditDraft } from '../types/provider.js'

export function renderProviderEditScreen(draft: ProviderEditDraft): string[] {
  return [
    'Edit Provider',
    `Name           : ${draft.name}`,
    `Base URL       : ${draft.baseUrl}`,
    `API Type       : ${draft.apiType}`,
    `Default Model  : ${draft.defaultModel ?? ''}`,
    `Models         : ${draft.models.length}`
  ]
}
