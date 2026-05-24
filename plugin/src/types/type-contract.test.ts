import { describe, expect, it } from 'vitest'
import type { ManagedProviderSummary, ProviderEditDraft } from './provider.js'
import type { AgentModelDraft, AgentModelSummary } from './agent.js'
import type { PageShellState } from './tui.js'

describe('provider manager type contracts', () => {
  it('allows constructing the core runtime state shapes', () => {
    const provider: ManagedProviderSummary = {
      name: 'OpenAI',
      id: 'openai',
      displayName: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiType: 'openai-responses',
      modelCount: 1,
      defaultModel: 'gpt-5',
      isDefault: true,
      authStatus: 'ok',
      status: 'active',
      source: 'providers-json',
      models: [],
      createdOrder: 0
    }

    const draft: ProviderEditDraft = {
      originalName: 'OpenAI',
      name: 'OpenAI',
      baseUrl: provider.baseUrl,
      apiType: provider.apiType,
      apiKey: 'secret',
      defaultModel: 'gpt-5',
      models: [],
      modelConfigDefaults: {
        contextWindow: '256k',
        maxOutput: '128k',
        inputTypes: ['text', 'image'],
        reasoningEfforts: ['minimal', 'low', 'medium', 'high', 'xhigh']
      },
      dirtyFields: new Set(['name']),
      validationErrors: [],
      protocolChanged: false
    }

    const agent: AgentModelSummary = {
      name: 'reviewer',
      provider: 'OpenAI',
      model: 'gpt-5',
      reasoningEffort: 'high',
      status: 'override',
      source: 'global',
      isBuiltin: true,
      displayOrder: 0
    }

    const agentDraft: AgentModelDraft = {
      agentName: agent.name,
      provider: null,
      model: null,
      reasoningEffort: null,
      step: 'select-provider',
      searchText: '',
      candidateItems: [],
      selectedIndex: 0
    }

    const shell: PageShellState = {
      pages: ['provider', 'agents'],
      activePage: 'provider',
      sidebarCursorPage: 'provider',
      focusRegion: 'sidebar',
      pageStates: {
        provider: { selectedIndex: 0, scrollOffset: 0 },
        agents: { selectedIndex: 0, scrollOffset: 0 }
      },
      modalState: null,
      statusLine: null
    }

    expect(draft.name).toBe(provider.name)
    expect(agentDraft.step).toBe('select-provider')
    expect(shell.pages).toEqual(['provider', 'agents'])
  })
})
