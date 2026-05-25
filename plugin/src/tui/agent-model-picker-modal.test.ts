import { describe, expect, it } from 'vitest'
import { backspaceAgentModelSearch, confirmAgentModelStep, createAgentModelDraft, escapeAgentModelStep, inputAgentModelSearch, moveAgentModelSelection, renderAgentModelPickerModal } from './agent-model-picker-modal.js'

describe('agent model picker modal', () => {
  const options = {
    providers: [{ id: 'OpenAI', label: 'OpenAI' }, { id: 'Anthropic', label: 'Anthropic' }],
    modelsByProvider: { OpenAI: [{ id: 'gpt-5', label: 'gpt-5' }] },
    reasoningByModel: { 'OpenAI/gpt-5': [{ id: 'high', label: 'high' }] }
  }

  it('moves provider -> model -> reasoning and clears stale values', () => {
    const providerStep = createAgentModelDraft('reviewer', options)
    const modelStep = confirmAgentModelStep(providerStep, options)
    expect(modelStep.step).toBe('select-model')
    expect(modelStep.provider).toBe('OpenAI')
    expect(modelStep.model).toBeNull()

    const reasoningStep = confirmAgentModelStep(modelStep, options)
    expect(reasoningStep.step).toBe('select-reasoning')
    expect(reasoningStep.model).toBe('gpt-5')

    const saved = confirmAgentModelStep(reasoningStep, options)
    expect(saved.reasoningEffort).toBe('high')
  })

  it('supports search, backspace, bounded movement and no-result rendering', () => {
    const providerStep = createAgentModelDraft('reviewer', options)
    const filtered = inputAgentModelSearch(providerStep, 'anth', options)
    expect(filtered.candidateItems.map((item) => item.id)).toEqual(['Anthropic'])
    expect(moveAgentModelSelection(filtered, 1).selectedIndex).toBe(0)

    const restored = backspaceAgentModelSearch(filtered, options)
    expect(restored.searchText).toBe('ant')

    const empty = inputAgentModelSearch(providerStep, 'zzz', options)
    expect(empty.candidateItems).toEqual([])
    expect(renderAgentModelPickerModal(empty)).toContain('No matches found.')
    expect(renderAgentModelPickerModal(providerStep)).toContain('>> OpenAI')
    expect(renderAgentModelPickerModal(providerStep)).toContain('[Up/Down] Move   [Enter] Select   [esc] Back')
  })

  it('esc returns to the previous step before cancelling the modal', () => {
    const providerStep = createAgentModelDraft('reviewer', options)
    const modelStep = confirmAgentModelStep(providerStep, options)
    expect(escapeAgentModelStep(modelStep, options)?.step).toBe('select-provider')
    const reasoningStep = confirmAgentModelStep(modelStep, options)
    expect(escapeAgentModelStep(reasoningStep, options)?.step).toBe('select-model')
    expect(escapeAgentModelStep(providerStep, options)).toBeNull()
  })
})
