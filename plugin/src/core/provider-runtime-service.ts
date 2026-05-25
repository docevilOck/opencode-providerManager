import type { ManagedProviderSummary, ProviderApiType, ProviderEditDraft, ProviderModelConfig } from '../types/provider.js'

export type ProviderRuntimeFetch = (input: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean
  status: number
  statusText?: string
  json: () => Promise<unknown>
}>

export type ProviderRuntimeResult =
  | { ok: true; models: ProviderModelConfig[] }
  | { ok: false; message: string }

function failure(message: string): ProviderRuntimeResult {
  return { ok: false, message }
}

function modelListUrl(baseUrl: string, apiType: ProviderApiType): string {
  const trimmed = baseUrl.replace(/\/+$/, '')
  if (apiType === 'gemini') return `${trimmed}/models`
  if (trimmed.endsWith('/v1')) return `${trimmed}/models`
  return `${trimmed}/v1/models`
}

function runtimeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function responseErrorMessage(response: { status: number; statusText?: string }, fallback: string): string {
  return `${response.status} ${response.statusText ?? fallback}`
}

function modelIds(payload: unknown): string[] {
  if (typeof payload !== 'object' || payload === null) return []
  const record = payload as Record<string, unknown>
  const data = Array.isArray(record.data) ? record.data : Array.isArray(record.models) ? record.models : []
  return data
    .map((item) => {
      if (typeof item === 'string') return item
      if (typeof item !== 'object' || item === null) return null
      const candidate = item as Record<string, unknown>
      return typeof candidate.id === 'string'
        ? candidate.id
        : typeof candidate.name === 'string'
          ? candidate.name.replace(/^models\//, '')
          : null
    })
    .filter((id): id is string => Boolean(id))
}

function headers(apiKey: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
}

export async function fetchProviderModels(draft: ProviderEditDraft, fetcher: ProviderRuntimeFetch = fetch as ProviderRuntimeFetch, signal?: AbortSignal): Promise<ProviderRuntimeResult> {
  try {
    const response = await fetcher(modelListUrl(draft.baseUrl, draft.apiType), { headers: headers(draft.apiKey), signal })
    if (!response.ok) return failure(responseErrorMessage(response, 'Fetch models failed'))
    const ids = modelIds(await response.json())
    if (ids.length < 1) return failure('No models returned')
    return {
      ok: true,
      models: ids.map((id) => ({ id, ...draft.modelConfigDefaults }))
    }
  } catch (error) {
    return failure(runtimeErrorMessage(error))
  }
}

export async function testProviderConnection(provider: ManagedProviderSummary, fetcher: ProviderRuntimeFetch = fetch as ProviderRuntimeFetch, signal?: AbortSignal): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetcher(modelListUrl(provider.baseUrl, provider.apiType), { signal })
    if (!response.ok) return failure(responseErrorMessage(response, 'Provider test failed'))
    return { ok: true }
  } catch (error) {
    return failure(runtimeErrorMessage(error))
  }
}
