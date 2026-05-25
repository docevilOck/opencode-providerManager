import { describe, expect, it } from 'vitest'
import type { ManagedProviderSummary, ProviderEditDraft } from '../types/provider.js'
import { fetchProviderModels, testProviderConnection, type ProviderRuntimeFetch } from './provider-runtime-service.js'

function draft(): ProviderEditDraft {
  return {
    originalName: 'OpenAI',
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
  }
}

describe('provider runtime service', () => {
  it('fetches remote model ids and applies draft defaults', async () => {
    let requestedUrl = ''
    const fetcher: ProviderRuntimeFetch = async (url, init) => {
      requestedUrl = url
      expect(init?.headers?.Authorization).toBe('Bearer secret')
      return { ok: true, status: 200, json: async () => ({ data: [{ id: 'gpt-5' }] }) }
    }

    const result = await fetchProviderModels(draft(), fetcher)
    expect(requestedUrl).toBe('https://api.openai.com/v1/models')
    expect(result).toEqual({
      ok: true,
      models: [{ id: 'gpt-5', contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] }]
    })
  })

  it('returns fetch failure details', async () => {
    const fetcher: ProviderRuntimeFetch = async () => ({ ok: false, status: 401, statusText: 'Unauthorized', json: async () => ({}) })
    await expect(fetchProviderModels(draft(), fetcher)).resolves.toEqual({ ok: false, message: '401 Unauthorized' })
  })

  it('passes abort signals to runtime fetch calls', async () => {
    const controller = new AbortController()
    const fetcher: ProviderRuntimeFetch = async (_url, init) => {
      expect(init?.signal).toBe(controller.signal)
      return { ok: true, status: 200, json: async () => ({ data: [{ id: 'gpt-5' }] }) }
    }
    await expect(fetchProviderModels(draft(), fetcher, controller.signal)).resolves.toMatchObject({ ok: true })
  })

  it('observes abort while a model fetch is in flight', async () => {
    const controller = new AbortController()
    const fetcher: ProviderRuntimeFetch = (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
    })
    const result = fetchProviderModels(draft(), fetcher, controller.signal)
    controller.abort()
    await expect(result).resolves.toEqual({ ok: false, message: 'aborted' })
  })

  it('tests provider connectivity through the model endpoint', async () => {
    const provider: ManagedProviderSummary = {
      name: 'OpenAI',
      id: 'openai',
      displayName: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiType: 'openai-responses',
      modelCount: 0,
      defaultModel: null,
      isDefault: false,
      authStatus: 'missing',
      status: 'ready',
      source: 'providers-json',
      models: [],
      createdOrder: 0
    }
    const fetcher: ProviderRuntimeFetch = async () => ({ ok: true, status: 200, json: async () => ({ data: [] }) })
    await expect(testProviderConnection(provider, fetcher)).resolves.toEqual({ ok: true })
  })

  it('returns connectivity failure details from the runtime fetch', async () => {
    const provider: ManagedProviderSummary = {
      name: 'OpenAI',
      id: 'openai',
      displayName: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiType: 'openai-responses',
      modelCount: 0,
      defaultModel: null,
      isDefault: false,
      authStatus: 'missing',
      status: 'ready',
      source: 'providers-json',
      models: [],
      createdOrder: 0
    }
    const fetcher: ProviderRuntimeFetch = async () => ({ ok: false, status: 503, statusText: 'Service Unavailable', json: async () => ({}) })
    await expect(testProviderConnection(provider, fetcher)).resolves.toEqual({ ok: false, message: '503 Service Unavailable' })
  })
})
