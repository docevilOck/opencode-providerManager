import { describe, expect, it } from 'vitest'
import { mergeAgentModelSummaries } from './agent-model-config-service.js'

describe('mergeAgentModelSummaries', () => {
  it('keeps builtin order and applies global overrides', () => {
    const result = mergeAgentModelSummaries(
      [{ name: 'build', model: 'openai/gpt-5' }, { name: 'reviewer' }],
      { agent: { reviewer: { model: 'OpenAI/gpt-5', reasoningEffort: 'high' }, custom: { model: 'local/model' } } }
    )
    expect(result.map((item) => item.name)).toEqual(['build', 'reviewer', 'custom'])
    expect(result[0]?.status).toBe('default')
    expect(result[0]?.provider).toBe('openai')
    expect(result[0]?.model).toBe('gpt-5')
    expect(result[1]?.status).toBe('override')
    expect(result[1]?.provider).toBe('OpenAI')
    expect(result[1]?.model).toBe('gpt-5')
    expect(result[2]?.status).toBe('override')
  })

  it('keeps compatibility with legacy provider and bare model fields', () => {
    const result = mergeAgentModelSummaries(
      [{ name: 'reviewer' }],
      { agent: { reviewer: { provider: 'OpenAI', model: 'gpt-5', reasoningEffort: 'high' } } }
    )

    expect(result[0]).toMatchObject({ provider: 'OpenAI', model: 'gpt-5', reasoningEffort: 'high' })
  })
})
