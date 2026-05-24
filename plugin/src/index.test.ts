import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import registerProviderManagerPlugin, { type ProviderManagerSession } from './index.js'

describe('provider command session', () => {
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

    await session.handleProviderSave({
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

    await writeFile(join(root, 'opencode.jsonc'), '{"agent":{}}')
    await session.handleAgentModelConfirm({
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
  })
})
