import type { ReasoningEffort } from './provider.js'

export type SelectableOption = {
  id: string
  label: string
  disabled?: boolean
}

export type AgentModelSummary = {
  name: string
  provider: string | null
  model: string | null
  reasoningEffort: ReasoningEffort | null
  status: 'default' | 'override' | 'incomplete'
  source: 'builtin' | 'global'
  isBuiltin: boolean
  displayOrder: number
}

export type AgentModelDraft = {
  agentName: string
  provider: string | null
  model: string | null
  reasoningEffort: ReasoningEffort | null
  step: 'select-provider' | 'select-model' | 'select-reasoning'
  searchText: string
  candidateItems: SelectableOption[]
  selectedIndex: number
}

export type ModelOptionSet = {
  providers: SelectableOption[]
  modelsByProvider: Record<string, SelectableOption[]>
  reasoningByModel: Record<string, SelectableOption[]>
}
