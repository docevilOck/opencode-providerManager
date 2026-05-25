import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { loadProviderManagerData, ProviderDraftValidationError } from './provider-manager-service.js'
import { deleteProvider, saveAgentModelConfig, saveProviderDraft, setDefaultProvider } from './provider-manager-service.js'

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
    const providerConfig = JSON.parse(await readFile(join(root, 'providers.json'), 'utf8')).OpenAI
    expect(providerConfig.defaultModel).toBeUndefined()
    const auth = JSON.parse(await readFile(join(root, 'auth.json'), 'utf8'))
    expect(auth.OpenAI).toEqual({ apiKey: 'secret' })
  })

  it('inserts new providers directly after the default provider', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'providers.json'), JSON.stringify({
      OpenAI: { baseUrl: 'https://api.openai.com/v1', apiType: 'openai-responses', models: [] },
      Other: { baseUrl: 'https://example.com/v1', apiType: 'openai-compatible-chat', models: [] }
    }))
    await writeFile(join(root, 'settings.json'), JSON.stringify({ defaultProvider: 'OpenAI' }))
    const providers = await saveProviderDraft(root, {
      originalName: null,
      name: 'NewProvider',
      baseUrl: 'https://new.example.com/v1',
      apiType: 'openai-compatible-chat',
      apiKey: 'secret',
      defaultModel: null,
      models: [],
      modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] },
      dirtyFields: new Set(),
      validationErrors: [],
      protocolChanged: false
    }, [])

    expect(Object.keys(JSON.parse(await readFile(join(root, 'providers.json'), 'utf8')))).toEqual(['OpenAI', 'NewProvider', 'Other'])
    expect(providers.map((provider) => provider.name)).toEqual(['OpenAI', 'NewProvider', 'Other'])
  })

  it('preserves provider position when editing or renaming', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'providers.json'), JSON.stringify({
      OpenAI: { baseUrl: 'https://api.openai.com/v1', apiType: 'openai-responses', models: [] },
      Other: { baseUrl: 'https://example.com/v1', apiType: 'openai-compatible-chat', models: [] },
      Third: { baseUrl: 'https://third.example.com/v1', apiType: 'openai-compatible-chat', models: [] }
    }))
    await writeFile(join(root, 'settings.json'), JSON.stringify({ defaultProvider: 'OpenAI' }))
    await saveProviderDraft(root, {
      originalName: 'Other',
      name: 'Renamed',
      baseUrl: 'https://renamed.example.com/v1',
      apiType: 'openai-compatible-chat',
      apiKey: 'secret',
      defaultModel: null,
      models: [],
      modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] },
      dirtyFields: new Set(),
      validationErrors: [],
      protocolChanged: false
    }, [])

    expect(Object.keys(JSON.parse(await readFile(join(root, 'providers.json'), 'utf8')))).toEqual(['OpenAI', 'Renamed', 'Third'])
  })

  it('preserves existing api key when editing without touching the api key field', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'providers.json'), JSON.stringify({
      OpenAI: { baseUrl: 'https://api.openai.com/v1', apiType: 'openai-responses', models: [] }
    }))
    await writeFile(join(root, 'auth.json'), JSON.stringify({ OpenAI: { apiKey: 'existing-secret' } }))
    await saveProviderDraft(root, {
      originalName: 'OpenAI',
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiType: 'openai-responses',
      apiKey: '',
      defaultModel: null,
      models: [],
      modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] },
      dirtyFields: new Set(['baseUrl']),
      validationErrors: [],
      protocolChanged: false
    }, [])

    expect(JSON.parse(await readFile(join(root, 'auth.json'), 'utf8')).OpenAI).toEqual({ apiKey: 'existing-secret' })
  })

  it('preserves field-level validation issues when provider save fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await expect(saveProviderDraft(root, {
      originalName: null,
      name: '',
      baseUrl: 'bad-url',
      apiType: 'openai-responses',
      apiKey: 'secret',
      defaultModel: null,
      models: [],
      modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] },
      dirtyFields: new Set(),
      validationErrors: [],
      protocolChanged: false
    }, [])).rejects.toMatchObject({
      name: 'ProviderDraftValidationError',
      issues: expect.arrayContaining([
        expect.objectContaining({ field: 'name', code: 'provider.name.empty' }),
        expect.objectContaining({ field: 'baseUrl', code: 'provider.baseUrl.invalid' })
      ])
    })
    await expect(saveProviderDraft(root, {
      originalName: null,
      name: '',
      baseUrl: 'bad-url',
      apiType: 'openai-responses',
      apiKey: 'secret',
      defaultModel: null,
      models: [],
      modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] },
      dirtyFields: new Set(),
      validationErrors: [],
      protocolChanged: false
    }, [])).rejects.toBeInstanceOf(ProviderDraftValidationError)
  })

  it('saves agent model config to original global source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'opencode.jsonc'), '{"agent":{}}')
    const data = await loadProviderManagerData(root, [])
    await saveAgentModelConfig(root, data.snapshot, 'reviewer', { model: 'OpenAI/gpt-5' })
    const jsonc = JSON.parse(await readFile(join(root, 'opencode.jsonc'), 'utf8'))
    expect(jsonc.agent.reviewer).toEqual({ model: 'OpenAI/gpt-5' })
  })

  it('sets and protects default provider while deleting other providers', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'providers.json'), JSON.stringify({
      OpenAI: { baseUrl: 'https://api.openai.com/v1', apiType: 'openai-responses', models: [] },
      Other: { baseUrl: 'https://example.com/v1', apiType: 'openai-compatible-chat', models: [] }
    }))
    await setDefaultProvider(root, 'OpenAI')
    expect(JSON.parse(await readFile(join(root, 'settings.json'), 'utf8')).defaultProvider).toBe('OpenAI')
    await expect(deleteProvider(root, 'OpenAI')).rejects.toThrow('provider.delete.defaultProvider')
    await deleteProvider(root, 'Other')
    expect(JSON.parse(await readFile(join(root, 'providers.json'), 'utf8')).Other).toBeUndefined()
  })

  it('deletes providers from global opencode config', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'opencode.json'), JSON.stringify({
      provider: {
        OpenAI: { baseUrl: 'https://api.openai.com/v1', apiType: 'openai-responses', models: [] },
        Other: { baseUrl: 'https://example.com/v1', apiType: 'openai-compatible-chat', models: [] }
      },
      model: 'OpenAI/gpt-5'
    }))

    await expect(deleteProvider(root, 'OpenAI')).rejects.toThrow('provider.delete.defaultProvider')
    await deleteProvider(root, 'Other')

    const opencode = JSON.parse(await readFile(join(root, 'opencode.json'), 'utf8'))
    expect(opencode.provider.Other).toBeUndefined()
    const data = await loadProviderManagerData(root, [])
    expect(data.providers.map((provider) => provider.name)).toEqual(['OpenAI'])
  })
})
