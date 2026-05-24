import { describe, expect, it } from 'vitest'
import { buildModelOptionSet } from './agent-model-option-service.js'
import type { ManagedProviderSummary } from '../types/provider.js'

describe('buildModelOptionSet', () => {
  it('builds provider model and reasoning options from normalized providers', () => {
    const providers: ManagedProviderSummary[] = [{
      name: 'OpenAI', id: 'openai', displayName: 'OpenAI', baseUrl: '', apiType: 'openai-responses', modelCount: 1,
      defaultModel: 'gpt-5', isDefault: true, authStatus: 'ok', status: 'active', source: 'providers-json', createdOrder: 0,
      models: [{ id: 'gpt-5', contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['low', 'high'] }]
    }]
    const options = buildModelOptionSet(providers)
    expect(options.providers).toEqual([{ id: 'OpenAI', label: 'OpenAI' }])
    expect(options.modelsByProvider.OpenAI).toEqual([{ id: 'gpt-5', label: 'gpt-5' }])
    expect(options.reasoningByModel['OpenAI/gpt-5']).toEqual([{ id: 'low', label: 'low' }, { id: 'high', label: 'high' }])
  })
})
