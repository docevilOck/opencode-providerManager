import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { loadProviderManagerData } from './provider-manager-service.js'
import { saveAgentModelConfig, saveProviderDraft } from './provider-manager-service.js'

describe('loadProviderManagerData', () => {
  it('loads provider and agent summaries together', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'providers.json'), JSON.stringify({ OpenAI: { baseUrl: 'https://api.openai.com/v1', apiType: 'openai-responses', models: [{ id: 'gpt-5' }] } }))
    await writeFile(join(root, 'settings.json'), JSON.stringify({ defaultProvider: 'OpenAI' }))
    const data = await loadProviderManagerData(root, [{ name: 'reviewer' }])
    expect(data.providers[0]?.name).toBe('OpenAI')
    expect(data.agents[0]?.name).toBe('reviewer')
    expect(data.shell.activePage).toBe('provider')
  })

  it('returns shell error view data when config parsing fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'providers.json'), '{broken')
    const data = await loadProviderManagerData(root, [])
    expect(data.error).toBeTruthy()
    expect(data.shell.activePage).toBe('provider')
  })

  it('saves provider draft through writer path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    const providers = await saveProviderDraft(root, {
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
    }, [])
    expect(providers[0]?.name).toBe('OpenAI')
  })

  it('saves agent model config to original global source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'opencode.jsonc'), '{"agent":{}}')
    const data = await loadProviderManagerData(root, [])
    await saveAgentModelConfig(root, data.snapshot, 'reviewer', { provider: 'OpenAI', model: 'gpt-5' })
    const jsonc = JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(join(root, 'opencode.jsonc'), 'utf8')))
    expect(jsonc.agent.reviewer).toEqual({ provider: 'OpenAI', model: 'gpt-5' })
  })
})
