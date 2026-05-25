import type { AgentModelDraft, ModelOptionSet } from '../types/agent.js'
import type { ReasoningEffort } from '../types/provider.js'
import { keyHint, titleLine } from './theme.js'

function filterItems(draft: AgentModelDraft, items = draft.candidateItems): AgentModelDraft {
  const search = draft.searchText.trim().toLowerCase()
  const candidateItems = search
    ? items.filter((item) => item.label.toLowerCase().includes(search) || item.id.toLowerCase().includes(search))
    : items
  return { ...draft, candidateItems, selectedIndex: Math.min(draft.selectedIndex, Math.max(0, candidateItems.length - 1)) }
}

export function createAgentModelDraft(agentName: string, options: ModelOptionSet): AgentModelDraft {
  return {
    agentName,
    provider: null,
    model: null,
    reasoningEffort: null,
    step: 'select-provider',
    searchText: '',
    candidateItems: options.providers,
    selectedIndex: 0
  }
}

export function confirmAgentModelStep(draft: AgentModelDraft, options: ModelOptionSet): AgentModelDraft {
  const selected = draft.candidateItems[draft.selectedIndex]
  if (!selected) return draft

  if (draft.step === 'select-provider') {
    const models = options.modelsByProvider[selected.id] ?? []
    return { ...draft, provider: selected.id, model: null, reasoningEffort: null, step: 'select-model', candidateItems: models, selectedIndex: 0, searchText: '' }
  }

  if (draft.step === 'select-model' && draft.provider) {
    const reasoning = options.reasoningByModel[`${draft.provider}/${selected.id}`] ?? []
    if (reasoning.length === 0) return { ...draft, model: selected.id, reasoningEffort: null }
    return { ...draft, model: selected.id, reasoningEffort: null, step: 'select-reasoning', candidateItems: reasoning, selectedIndex: 0, searchText: '' }
  }

  return { ...draft, reasoningEffort: selected.id as ReasoningEffort }
}

export function moveAgentModelSelection(draft: AgentModelDraft, delta: -1 | 1): AgentModelDraft {
  if (draft.candidateItems.length < 1) return draft
  const selectedIndex = Math.max(0, Math.min(draft.candidateItems.length - 1, draft.selectedIndex + delta))
  return { ...draft, selectedIndex }
}

export function inputAgentModelSearch(draft: AgentModelDraft, value: string, sourceItems: ModelOptionSet): AgentModelDraft {
  const searchText = `${draft.searchText}${value}`
  return filterItems({ ...draft, searchText }, itemsForStep({ ...draft, searchText }, sourceItems))
}

export function backspaceAgentModelSearch(draft: AgentModelDraft, sourceItems: ModelOptionSet): AgentModelDraft {
  const searchText = draft.searchText.slice(0, -1)
  return filterItems({ ...draft, searchText }, itemsForStep({ ...draft, searchText }, sourceItems))
}

export function escapeAgentModelStep(draft: AgentModelDraft, options: ModelOptionSet): AgentModelDraft | null {
  if (draft.step === 'select-provider') return null
  if (draft.step === 'select-model') {
    return { ...draft, provider: null, model: null, reasoningEffort: null, step: 'select-provider', searchText: '', candidateItems: options.providers, selectedIndex: 0 }
  }
  if (!draft.provider) return null
  return { ...draft, model: null, reasoningEffort: null, step: 'select-model', searchText: '', candidateItems: options.modelsByProvider[draft.provider] ?? [], selectedIndex: 0 }
}

export function renderAgentModelPickerModal(draft: AgentModelDraft): string[] {
  const title = draft.step === 'select-provider'
    ? 'Select Provider'
    : draft.step === 'select-model'
      ? 'Select Model'
      : 'Select Reasoning Effort'
  const rows = draft.candidateItems.length
    ? draft.candidateItems.map((item, index) => `${index === draft.selectedIndex ? '>>' : '  '} ${item.label}`)
    : ['No matches found.']
  return [
    titleLine(title, draft.agentName),
    `Search: ${draft.searchText || '-'}`,
    ...rows,
    keyHint('[Up/Down] Move  [Enter] Select  [esc] Back')
  ]
}

function itemsForStep(draft: AgentModelDraft, options: ModelOptionSet) {
  if (draft.step === 'select-provider') return options.providers
  if (draft.step === 'select-model' && draft.provider) return options.modelsByProvider[draft.provider] ?? []
  if (draft.step === 'select-reasoning' && draft.provider && draft.model) return options.reasoningByModel[`${draft.provider}/${draft.model}`] ?? []
  return []
}
