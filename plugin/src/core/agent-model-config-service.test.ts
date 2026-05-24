import { describe, expect, it } from 'vitest'
import { mergeAgentModelSummaries } from './agent-model-config-service.js'

describe('mergeAgentModelSummaries', () => {
  it('keeps builtin order and applies global overrides', () => {
    const result = mergeAgentModelSummaries(
      [{ name: 'build', model: 'openai/gpt-5' }, { name: 'reviewer' }],
      { agent: { reviewer: { provider: 'OpenAI', model: 'gpt-5', reasoningEffort: 'high' }, custom: { model: 'local/model' } } }
    )
    expect(result.map((item) => item.name)).toEqual(['build', 'reviewer', 'custom'])
    expect(result[0]?.status).toBe('default')
    expect(result[1]?.status).toBe('override')
    expect(result[2]?.status).toBe('override')
  })
})
