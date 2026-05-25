import { describe, expect, it } from 'vitest'
import type { ProviderEditDraft, ProviderModelConfig } from '../types/provider.js'
import { applyFetchedModelSelection, moveFetchModelSelection, selectAllFetchedModels, toggleFetchModelSelection } from './fetch-model-modal-service.js'

const models: ProviderModelConfig[] = [
  { id: 'gpt-5', contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] },
  { id: 'gpt-5-mini', contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] }
]

function draft(): ProviderEditDraft {
  return {
    originalName: 'OpenAI',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiType: 'openai-responses',
    apiKey: 'secret',
    defaultModel: null,
    models: [],
    modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] },
    dirtyFields: new Set(),
    validationErrors: [],
    protocolChanged: true
  }
}

describe('fetch model modal service', () => {
  it('keeps fetched models in modal state until confirmation applies selected models', () => {
    const next = applyFetchedModelSelection(draft(), models, new Set(['gpt-5-mini']))
    expect(next.models.map((model) => model.id)).toEqual(['gpt-5-mini'])
    expect(next.defaultModel).toBeNull()
    expect(next.protocolChanged).toBe(false)
  })

  it('moves and toggles model selection inside the fetch modal', () => {
    const modal = { kind: 'fetch-models' as const, phase: 'success' as const, selectedIndex: 0, selectedModelIds: new Set(['gpt-5', 'gpt-5-mini']) }
    const moved = moveFetchModelSelection(modal, models.length, 1)
    expect(moved.selectedIndex).toBe(1)
    const toggled = toggleFetchModelSelection(moved, models)
    expect([...toggled.selectedModelIds]).toEqual(['gpt-5'])
    expect([...selectAllFetchedModels(toggled, models).selectedModelIds]).toEqual(['gpt-5', 'gpt-5-mini'])
  })

  it('keeps selection clamped within fetched model bounds', () => {
    const modal = { kind: 'fetch-models' as const, phase: 'success' as const, selectedIndex: 1, selectedModelIds: new Set<string>() }
    expect(moveFetchModelSelection(modal, models.length, 1).selectedIndex).toBe(1)
    expect(moveFetchModelSelection(modal, models.length, -1).selectedIndex).toBe(0)
  })
})
