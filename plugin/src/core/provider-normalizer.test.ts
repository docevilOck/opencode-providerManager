import { describe, expect, it } from 'vitest'
import { normalizeProviders } from './provider-normalizer.js'

describe('normalizeProviders', () => {
  it('marks default provider first and preserves creation order for the rest', () => {
    const providers = normalizeProviders(
      {
        Anthropic: { baseUrl: 'https://api.anthropic.com', apiType: 'anthropic-messages', models: [] },
        OpenAI: { baseUrl: 'https://api.openai.com/v1', apiType: 'openai-responses', models: [{ id: 'gpt-5' }], defaultModel: 'gpt-5' }
      },
      { defaultProvider: 'OpenAI' },
      { OpenAI: { apiKey: 'secret' } }
    )

    expect(providers.map((item) => item.name)).toEqual(['OpenAI', 'Anthropic'])
    expect(providers[0]?.isDefault).toBe(true)
    expect(providers[0]?.authStatus).toBe('ok')
    expect(providers[1]?.authStatus).toBe('missing')
  })

  it('loads providers from opencode.json provider map', () => {
    const providers = normalizeProviders(
      {},
      {},
      {},
      {
        model: 'rayplus/gpt-5.4',
        provider: {
          rayplus: {
            npm: '@ai-sdk/openai-compatible',
            options: { baseURL: 'https://rayplus.site/v1', apiKey: 'secret' },
            models: { 'gpt-5.4': { name: 'GPT-5.4' } }
          }
        }
      }
    )

    expect(providers).toHaveLength(1)
    expect(providers[0]).toMatchObject({
      name: 'rayplus',
      baseUrl: 'https://rayplus.site/v1',
      modelCount: 1,
      authStatus: 'ok',
      isDefault: true,
      source: 'opencode-json'
    })
  })
})
