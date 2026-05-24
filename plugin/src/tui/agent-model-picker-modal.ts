import type { AgentModelDraft, ModelOptionSet } from '../types/agent.js'
import type { ReasoningEffort } from '../types/provider.js'

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
