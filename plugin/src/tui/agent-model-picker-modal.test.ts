import { describe, expect, it } from 'vitest'
import { confirmAgentModelStep, createAgentModelDraft } from './agent-model-picker-modal.js'

describe('agent model picker modal', () => {
  const options = {
    providers: [{ id: 'OpenAI', label: 'OpenAI' }],
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
})
