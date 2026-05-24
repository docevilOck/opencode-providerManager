import { describe, expect, it } from 'vitest'
import { validateProviderDraft } from './provider-validator.js'
import type { ProviderEditDraft } from '../types/provider.js'

function draft(overrides: Partial<ProviderEditDraft> = {}): ProviderEditDraft {
  return {
    originalName: 'OpenAI',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiType: 'openai-responses',
    apiKey: 'secret',
    defaultModel: 'gpt-5',
    models: [{ id: 'gpt-5', contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] }],
    modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] },
    dirtyFields: new Set(),
    validationErrors: [],
    protocolChanged: false,
    ...overrides
  }
}

describe('validateProviderDraft', () => {
  it('rejects duplicate provider names case-insensitively', () => {
    const issues = validateProviderDraft(draft({ name: 'anthropic' }), ['Anthropic'])
    expect(issues.map((issue) => issue.code)).toContain('provider.name.duplicate')
  })

  it('allows empty default model when no models exist', () => {
    const issues = validateProviderDraft(draft({ models: [], defaultModel: null }), [])
    expect(issues).toEqual([])
  })

  it('rejects default model outside current model set', () => {
    const issues = validateProviderDraft(draft({ defaultModel: 'missing' }), [])
    expect(issues.map((issue) => issue.code)).toContain('provider.defaultModel.notFound')
  })
})
