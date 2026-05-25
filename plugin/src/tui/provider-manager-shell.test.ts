import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { handleAgentModelConfirmAction, handleAgentProviderSwitchAction, handleProviderSaveAction, renderProviderManagerShell } from './provider-manager-shell.js'
import { createInitialPageShellState } from '../core/page-state-service.js'
import { loadProviderManagerData } from '../core/provider-manager-service.js'

describe('renderProviderManagerShell', () => {
  it('renders sidebar and active provider page', () => {
    const output = renderProviderManagerShell({
      shell: createInitialPageShellState(),
      providers: [],
      agents: []
    })
    expect(output).toContain('>   provider')
    expect(output).not.toContain('* provider')
    expect(output).toContain('Providers (0)  /  default -')
    expect(output).toContain('No providers configured')
    expect(output).toContain('[Enter] Edit (disabled)')
    expect(output).toContain('[d] Delete (disabled)')
  })

  it('renders active page headers from the active page, not the sidebar cursor', () => {
    const shell = createInitialPageShellState()
    shell.sidebarCursorPage = 'agents'
    const output = renderProviderManagerShell({
      shell,
      providers: [{
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
      }],
      agents: [{ name: 'reviewer', provider: null, model: null, reasoningEffort: null, status: 'incomplete', source: 'builtin', isBuiltin: true, displayOrder: 0 }]
    })
    expect(output).toContain('Providers (1)  /  default OpenAI')
    expect(output).toContain('>   agents')
    expect(output).not.toContain('* provider')
    expect(output).not.toContain('Agent Models (1)')
  })

  it('renders config loading errors inside shell', () => {
    const output = renderProviderManagerShell({
      shell: createInitialPageShellState(),
      providers: [],
      agents: [],
      error: 'invalid config'
    })
    expect(output).toContain('>   provider')
    expect(output).toContain('Error: invalid config')
  })

  it('omits expired transient status lines from text rendering', () => {
    const shell = createInitialPageShellState()
    shell.statusLine = { message: 'No provider selected', level: 'warn', expiresAt: 1 }
    const output = renderProviderManagerShell({
      shell,
      providers: [],
      agents: []
    })
    expect(output).not.toContain('No provider selected')
  })

  it('connects provider save action to config files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    const view = await loadProviderManagerData(root, [])
    view.shell.focusRegion = 'modal'
    view.shell.modalState = { kind: 'protocol-select', selectedIndex: 1 }
    const next = await handleProviderSaveAction(root, view, {
      originalName: null,
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiType: 'openai-responses',
      apiKey: 'secret',
      defaultModel: null,
      models: [],
      modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] },
      dirtyFields: new Set(),
      validationErrors: [],
      protocolChanged: false
    })
    expect(JSON.parse(await readFile(join(root, 'providers.json'), 'utf8')).OpenAI.baseUrl).toBe('https://api.openai.com/v1')
    expect(JSON.parse(await readFile(join(root, 'auth.json'), 'utf8')).OpenAI.apiKey).toBe('secret')
    expect(next.snapshot.authJson).toEqual({ OpenAI: { apiKey: 'secret' } })
    expect(next.providers[0]?.name).toBe('OpenAI')
    expect(next.shell.activePage).toBe('provider')
    expect(next.shell.sidebarCursorPage).toBe('provider')
    expect(next.shell.focusRegion).toBe('content')
    expect(next.shell.modalState).toBeNull()
    expect(next.shell.pageStates.provider.selectedIndex).toBe(0)
  })

  it('connects agent model confirm action to global agent config', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'opencode.jsonc'), '{"agent":{}}')
    const view = await loadProviderManagerData(root, [])
    view.shell.activePage = 'agents'
    view.shell.sidebarCursorPage = 'agents'
    view.shell.focusRegion = 'modal'
    view.shell.modalState = {
      kind: 'agent-model-picker',
      draft: {
        agentName: 'reviewer',
        provider: null,
        model: null,
        reasoningEffort: null,
        step: 'select-model',
        searchText: '',
        candidateItems: [],
        selectedIndex: 0
      }
    }
    view.shell.pageStates.agents.selectedIndex = 0
    const next = await handleAgentModelConfirmAction(root, view, {
      agentName: 'reviewer',
      provider: 'OpenAI',
      model: 'gpt-5',
      reasoningEffort: 'high',
      step: 'select-reasoning',
      searchText: '',
      candidateItems: [],
      selectedIndex: 0
    })
    expect(JSON.parse(await readFile(join(root, 'opencode.jsonc'), 'utf8')).agent.reviewer).toEqual({ model: 'OpenAI/gpt-5', reasoningEffort: 'high' })
    expect(next.snapshot.globalOpencodeJson).toEqual({ agent: { reviewer: { model: 'OpenAI/gpt-5', reasoningEffort: 'high' } } })
    expect(next.agents[0]?.name).toBe('reviewer')
    expect(next.agents[0]?.provider).toBe('OpenAI')
    expect(next.agents[0]?.model).toBe('gpt-5')
    expect(next.agents[0]?.status).toBe('override')
    expect(next.shell.activePage).toBe('agents')
    expect(next.shell.sidebarCursorPage).toBe('agents')
    expect(next.shell.focusRegion).toBe('content')
    expect(next.shell.modalState).toBeNull()
    expect(next.shell.pageStates.agents.selectedIndex).toBe(0)
  })

  it('connects agent provider switch action to multiple agent configs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'opencode.jsonc'), JSON.stringify({
      agent: {
        reviewer: { model: 'OpenAI/gpt-5.4', reasoningEffort: 'high' },
        planner: { model: 'OpenAI/gpt-5.4-mini' }
      }
    }))
    const view = await loadProviderManagerData(root, [{ name: 'reviewer' }, { name: 'planner' }])
    const next = await handleAgentProviderSwitchAction(root, view, new Set(['reviewer', 'planner']), 'Ray')

    const jsonc = JSON.parse(await readFile(join(root, 'opencode.jsonc'), 'utf8'))
    expect(jsonc.agent.reviewer).toEqual({ model: 'Ray/gpt-5.4', reasoningEffort: 'high' })
    expect(jsonc.agent.planner).toEqual({ model: 'Ray/gpt-5.4-mini' })
    expect(next.agents.map((agent) => `${agent.provider}/${agent.model}`)).toEqual(['Ray/gpt-5.4', 'Ray/gpt-5.4-mini'])
    expect(next.shell.agentBulkEdit).toEqual({ enabled: false, selectedAgentNames: new Set() })
    expect(next.shell.activePage).toBe('agents')
  })
})
