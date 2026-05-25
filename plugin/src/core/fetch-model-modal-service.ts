import type { ProviderEditDraft, ProviderModelConfig } from '../types/provider.js'
import type { ModalState } from '../types/tui.js'

type FetchModelsModalState = Extract<ModalState, { kind: 'fetch-models' }>

function clampSelectedIndex(selectedIndex: number, modelCount: number): number {
  return Math.max(0, Math.min(modelCount - 1, selectedIndex))
}

export function moveFetchModelSelection(modal: FetchModelsModalState, modelCount: number, delta: -1 | 1): FetchModelsModalState {
  if (modal.phase !== 'success' || modelCount < 1) return modal
  return {
    ...modal,
    selectedIndex: clampSelectedIndex(modal.selectedIndex + delta, modelCount)
  }
}

export function toggleFetchModelSelection(modal: FetchModelsModalState, models: ProviderModelConfig[]): FetchModelsModalState {
  if (modal.phase !== 'success') return modal
  const model = models[modal.selectedIndex]
  if (!model) return modal
  const selectedModelIds = new Set(modal.selectedModelIds)
  if (selectedModelIds.has(model.id)) selectedModelIds.delete(model.id)
  else selectedModelIds.add(model.id)
  return { ...modal, selectedModelIds }
}

export function selectAllFetchedModels(modal: FetchModelsModalState, models: ProviderModelConfig[]): FetchModelsModalState {
  if (modal.phase !== 'success') return modal
  return { ...modal, selectedModelIds: new Set(models.map((model) => model.id)) }
}

export function applyFetchedModelSelection(draft: ProviderEditDraft, models: ProviderModelConfig[], selectedModelIds: Set<string>): ProviderEditDraft {
  const selectedModels = models.filter((model) => selectedModelIds.has(model.id))
  return {
    ...draft,
    models: selectedModels,
    validationErrors: [],
    dirtyFields: new Set([...draft.dirtyFields]),
    protocolChanged: false
  }
}
