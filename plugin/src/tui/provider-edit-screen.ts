import type { ProviderEditDraft, ProviderEditField } from '../types/provider.js'

const FIELD_LINES = [
  { field: 'name', label: 'Name', value: (draft: ProviderEditDraft) => draft.name },
  { field: 'baseUrl', label: 'Base URL', value: (draft: ProviderEditDraft) => draft.baseUrl },
  { field: 'apiType', label: 'API Type', value: (draft: ProviderEditDraft) => draft.apiType },
  { field: 'apiKey', label: 'API Key', value: (draft: ProviderEditDraft) => maskApiKey(draft.apiKey) }
] as const

function maskApiKey(apiKey: string): string {
  return apiKey ? '************' : ''
}

export function renderProviderEditScreen(draft: ProviderEditDraft, selectedField: ProviderEditField = 'name', editing?: { field: ProviderEditField; value: string }): string[] {
  const lines = ['Edit Provider']
  for (const item of FIELD_LINES) {
    const selected = item.field === selectedField
    const editingCurrent = editing?.field === item.field
    const value = editingCurrent ? `${editing.value}|` : item.value(draft)
    const marker = editingCurrent ? '>>' : selected ? '>' : ' '
    lines.push(`${marker} ${item.label.padEnd(14)}: ${editingCurrent ? `[${value}]` : value}`)
    lines.push(...draft.validationErrors.filter((issue) => issue.field === item.field).map((issue) => `  ${issue.message}`))
  }
  lines.push(`Models         : ${draft.models.length}`)
  lines.push(...draft.validationErrors.filter((issue) => !issue.field).map((issue) => issue.message))
  return lines
}
