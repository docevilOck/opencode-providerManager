import { describe, expect, it } from 'vitest'
import type { AgentModelSummary } from '../types/agent.js'
import type { ManagedProviderSummary } from '../types/provider.js'
import { availableProvidersForAgents, buildAgentProviderSwitchConfigs } from './agent-provider-switch-service.js'

function agent(name: string, model: string, reasoningEffort: AgentModelSummary['reasoningEffort'] = null): AgentModelSummary {
  return { name, provider: 'Old', model, reasoningEffort, status: 'override', source: 'global', isBuiltin: true, displayOrder: 0 }
}

function provider(name: string, models: string[]): ManagedProviderSummary {
  return {
    name,
    id: name.toLowerCase(),
    displayName: name,
    baseUrl: '',
    apiType: 'openai-compatible-chat',
    modelCount: models.length,
    defaultModel: null,
    isDefault: false,
    authStatus: 'ok',
    status: 'ready',
    source: 'providers-json',
    models: models.map((id) => ({ id, contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] })),
    createdOrder: 0
  }
}

describe('agent provider switch service', () => {
  it('returns providers that cover all selected agent models', () => {
    const agents = [agent('a', 'gpt-5.4'), agent('b', 'gpt-5.4-mini')]
    const providers = [
      provider('A', ['gpt-5.4', 'gpt-5.4-mini']),
      provider('B', ['gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano']),
      provider('C', ['gpt-5.4'])
    ]

    expect(availableProvidersForAgents(agents, providers, new Set(['a', 'b']))).toEqual(['A', 'B'])
  })

  it('builds provider/model configs and preserves reasoning effort', () => {
    const configs = buildAgentProviderSwitchConfigs([agent('a', 'gpt-5.4', 'high'), agent('b', 'gpt-5.4-mini')], new Set(['a', 'b']), 'B')

    expect(configs).toEqual([
      { agentName: 'a', config: { model: 'B/gpt-5.4', reasoningEffort: 'high' } },
      { agentName: 'b', config: { model: 'B/gpt-5.4-mini' } }
    ])
  })
})
