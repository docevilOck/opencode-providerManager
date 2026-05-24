import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { handleAgentModelConfirmAction, handleProviderSaveAction, renderProviderManagerShell } from './provider-manager-shell.js'
import { createInitialPageShellState } from '../core/page-state-service.js'
import { loadProviderManagerData } from '../core/provider-manager-service.js'

describe('renderProviderManagerShell', () => {
  it('renders sidebar and active provider page', () => {
    const output = renderProviderManagerShell({
      shell: createInitialPageShellState(),
      providers: [],
      agents: []
    })
    expect(output).toContain('>* provider')
    expect(output).toContain('No providers configured')
  })

  it('renders config loading errors inside shell', () => {
    const output = renderProviderManagerShell({
      shell: createInitialPageShellState(),
      providers: [],
      agents: [],
      error: 'invalid config'
    })
    expect(output).toContain('>* provider')
    expect(output).toContain('Error: invalid config')
  })

  it('connects provider save action to config files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    const view = await loadProviderManagerData(root, [])
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
    expect(next.shell.pageStates.provider.selectedIndex).toBe(0)
  })

  it('connects agent model confirm action to global agent config', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'opencode.jsonc'), '{"agent":{}}')
    const view = await loadProviderManagerData(root, [])
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
    expect(JSON.parse(await readFile(join(root, 'opencode.jsonc'), 'utf8')).agent.reviewer).toEqual({ provider: 'OpenAI', model: 'gpt-5', reasoningEffort: 'high' })
    expect(next.snapshot.globalOpencodeJson).toEqual({ agent: { reviewer: { provider: 'OpenAI', model: 'gpt-5', reasoningEffort: 'high' } } })
    expect(next.agents[0]?.name).toBe('reviewer')
    expect(next.agents[0]?.status).toBe('override')
  })
})
