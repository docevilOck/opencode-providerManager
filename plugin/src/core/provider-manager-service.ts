import { readOpencodeConfigSnapshot } from '../infra/opencode-config-reader.js'
import { deleteGlobalProviderConfig, writeAuthConfig, writeGlobalAgentConfig, writeGlobalProviderConfig, writeProvidersConfig, writeSettingsConfig } from '../infra/opencode-config-writer.js'
import type { AgentModelSummary } from '../types/agent.js'
import type { ManagedProviderSummary, OpencodeConfigSnapshot, ProviderEditDraft } from '../types/provider.js'
import type { PageShellState, ValidationIssue } from '../types/tui.js'
import { mergeAgentModelSummaries } from './agent-model-config-service.js'
import { createInitialPageShellState } from './page-state-service.js'
import { normalizeProviders } from './provider-normalizer.js'
import { validateProviderDraft } from './provider-validator.js'

export type ProviderManagerData = {
  snapshot: OpencodeConfigSnapshot
  providers: ManagedProviderSummary[]
  agents: AgentModelSummary[]
  shell: PageShellState
  error?: string
}

export class ProviderDraftValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super(issues.map((issue) => issue.code).join(','))
    this.name = 'ProviderDraftValidationError'
  }
}

function providerConfigFromDraft(draft: ProviderEditDraft): Record<string, unknown> {
  return {
    baseUrl: draft.baseUrl,
    apiType: draft.apiType,
    models: draft.models
  }
}

function upsertProviderConfig(providersJson: Record<string, unknown>, draft: ProviderEditDraft, defaultProvider?: string): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  const providerConfig = providerConfigFromDraft(draft)
  const originalKey = draft.originalName
  const isNewProvider = !originalKey
  let inserted = false

  for (const [name, value] of Object.entries(providersJson)) {
    if (originalKey && name === originalKey) {
      next[draft.name] = providerConfig
      inserted = true
      continue
    }
    next[name] = value
    if (isNewProvider && defaultProvider && name.toLowerCase() === defaultProvider.toLowerCase()) {
      next[draft.name] = providerConfig
      inserted = true
    }
  }

  if (!inserted) next[draft.name] = providerConfig
  return next
}

export async function loadProviderManagerData(root: string, builtinAgents: unknown[]): Promise<ProviderManagerData> {
  let snapshot: OpencodeConfigSnapshot
  try {
    snapshot = await readOpencodeConfigSnapshot(root, builtinAgents)
  } catch (error) {
    return {
      snapshot: { providersJson: {}, authJson: {}, settingsJson: {}, pluginJson: {}, globalOpencodeJson: {}, globalOpencodeSource: 'missing', builtinAgents, loadedAt: Date.now() },
      providers: [],
      agents: [],
      shell: createInitialPageShellState(),
      error: error instanceof Error ? error.message : String(error)
    }
  }
  return {
    snapshot,
    providers: normalizeProviders(snapshot.providersJson, snapshot.settingsJson, snapshot.authJson, snapshot.globalOpencodeJson),
    agents: mergeAgentModelSummaries(snapshot.builtinAgents as Array<{ name?: string; model?: string }>, snapshot.globalOpencodeJson),
    shell: createInitialPageShellState()
  }
}

export async function saveProviderDraft(root: string, draft: ProviderEditDraft, existingProviders: ManagedProviderSummary[]): Promise<ManagedProviderSummary[]> {
  const otherNames = existingProviders.filter((provider) => provider.name !== draft.originalName).map((provider) => provider.name)
  const issues = validateProviderDraft(draft, otherNames)
  if (issues.length > 0) {
    throw new ProviderDraftValidationError(issues)
  }
  const current = await readOpencodeConfigSnapshot(root, [])
  const providersJson = typeof current.providersJson === 'object' && current.providersJson !== null ? { ...(current.providersJson as Record<string, unknown>) } : {}
  const authJson = typeof current.authJson === 'object' && current.authJson !== null ? { ...(current.authJson as Record<string, unknown>) } : {}
  const settingsJson = typeof current.settingsJson === 'object' && current.settingsJson !== null ? { ...(current.settingsJson as Record<string, unknown>) } : {}
  const existingAuth = draft.originalName && typeof authJson[draft.originalName] === 'object' && authJson[draft.originalName] !== null
    ? authJson[draft.originalName] as Record<string, unknown>
    : {}
  if (draft.originalName && draft.originalName !== draft.name) {
    delete authJson[draft.originalName]
  }
  const nextProvidersJson = upsertProviderConfig(providersJson, draft, typeof settingsJson.defaultProvider === 'string' ? settingsJson.defaultProvider : undefined)
  const shouldWriteApiKey = !draft.originalName || draft.dirtyFields.has('apiKey') || draft.apiKey.length > 0 || typeof existingAuth.apiKey !== 'string'
  if (shouldWriteApiKey) authJson[draft.name] = { apiKey: draft.apiKey }
  else authJson[draft.name] = existingAuth
  await writeProvidersConfig(root, nextProvidersJson)
  await writeAuthConfig(root, authJson)
  await writeSettingsConfig(root, settingsJson)
  await writeGlobalProviderConfig(root, draft.name, providerConfigFromDraft(draft), draft.originalName, current.globalOpencodeSource)
  const refreshed = await readOpencodeConfigSnapshot(root, [])
   return normalizeProviders(refreshed.providersJson, refreshed.settingsJson, refreshed.authJson, refreshed.globalOpencodeJson)
}

export async function setDefaultProvider(root: string, providerName: string): Promise<void> {
  const current = await readOpencodeConfigSnapshot(root, [])
  const settingsJson = typeof current.settingsJson === 'object' && current.settingsJson !== null ? { ...(current.settingsJson as Record<string, unknown>) } : {}
  settingsJson.defaultProvider = providerName
  await writeSettingsConfig(root, settingsJson)
}

export async function deleteProvider(root: string, providerName: string): Promise<void> {
  const current = await readOpencodeConfigSnapshot(root, [])
  const settings = typeof current.settingsJson === 'object' && current.settingsJson !== null ? current.settingsJson as Record<string, unknown> : {}
  const globalDefaultProvider = typeof current.globalOpencodeJson === 'object' && current.globalOpencodeJson !== null && typeof (current.globalOpencodeJson as Record<string, unknown>).model === 'string'
    ? ((current.globalOpencodeJson as Record<string, unknown>).model as string).split('/')[0] ?? null
    : null
  const defaultProvider = typeof settings.defaultProvider === 'string' ? settings.defaultProvider : globalDefaultProvider
  if (typeof defaultProvider === 'string' && defaultProvider.toLowerCase() === providerName.toLowerCase()) {
    throw new Error('provider.delete.defaultProvider')
  }
  const providersJson = typeof current.providersJson === 'object' && current.providersJson !== null ? { ...(current.providersJson as Record<string, unknown>) } : {}
  const authJson = typeof current.authJson === 'object' && current.authJson !== null ? { ...(current.authJson as Record<string, unknown>) } : {}
  delete providersJson[providerName]
  delete authJson[providerName]
  await writeProvidersConfig(root, providersJson)
  await writeAuthConfig(root, authJson)
  await deleteGlobalProviderConfig(root, providerName, current.globalOpencodeSource)
}

export async function saveAgentModelConfig(root: string, snapshot: OpencodeConfigSnapshot, agentName: string, config: Record<string, unknown>): Promise<void> {
  await writeGlobalAgentConfig(root, agentName, config, snapshot.globalOpencodeSource)
}

export async function reloadProviderManagerData(root: string, builtinAgents: unknown[], shell: PageShellState): Promise<ProviderManagerData> {
  const data = await loadProviderManagerData(root, builtinAgents)
  return { ...data, shell }
}
