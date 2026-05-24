import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import plugin, { registerProviderManagerPlugin, type ProviderManagerSession } from './index.js'

describe('provider command session', () => {
  it('exports a tui plugin object instead of a legacy server function', () => {
    expect(plugin).toMatchObject({ id: 'provider-manager' })
    expect(typeof plugin.tui).toBe('function')
  })

  it('exposes runtime save handlers reachable from /provider command', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    let handler: (() => Promise<unknown>) | undefined
    registerProviderManagerPlugin({
      configRoot: root,
      builtinAgents: [{ name: 'reviewer' }],
      registerCommand: (_name, registered) => {
        handler = registered as () => Promise<unknown>
      }
    })

    const session = await handler?.() as ProviderManagerSession
    expect(session.render()).toContain('No providers configured')

    const providerOutput = await session.handleProviderSave({
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
    expect(JSON.parse(await readFile(join(root, 'auth.json'), 'utf8')).OpenAI.apiKey).toBe('secret')
    expect(providerOutput).toContain('OpenAI')

    await writeFile(join(root, 'opencode.jsonc'), '{"agent":{}}')
    const agentOutput = await session.handleAgentModelConfirm({
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
    expect(agentOutput).toContain('reviewer')
    expect(agentOutput).toContain('model: gpt-5')
    expect(agentOutput).toContain('status: override')
  })
})
