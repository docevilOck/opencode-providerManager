import { readOpencodeConfigSnapshot } from '../infra/opencode-config-reader.js'
import { writeGlobalAgentConfig, writeProvidersConfig } from '../infra/opencode-config-writer.js'
import type { AgentModelSummary } from '../types/agent.js'
import type { ManagedProviderSummary, OpencodeConfigSnapshot, ProviderEditDraft } from '../types/provider.js'
import type { PageShellState } from '../types/tui.js'
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
    providers: normalizeProviders(snapshot.providersJson, snapshot.settingsJson, snapshot.authJson),
    agents: mergeAgentModelSummaries(snapshot.builtinAgents as Array<{ name?: string; model?: string }>, snapshot.globalOpencodeJson),
    shell: createInitialPageShellState()
  }
}

export async function saveProviderDraft(root: string, draft: ProviderEditDraft, existingProviders: ManagedProviderSummary[]): Promise<ManagedProviderSummary[]> {
  const otherNames = existingProviders.filter((provider) => provider.name !== draft.originalName).map((provider) => provider.name)
  const issues = validateProviderDraft(draft, otherNames)
  if (issues.length > 0) {
    throw new Error(issues.map((issue) => issue.code).join(','))
  }
  const providersJson: Record<string, unknown> = Object.fromEntries(existingProviders.filter((provider) => provider.name !== draft.originalName).map((provider) => [provider.name, provider]))
  providersJson[draft.name] = {
    baseUrl: draft.baseUrl,
    apiType: draft.apiType,
    models: draft.models,
    defaultModel: draft.defaultModel
  }
  await writeProvidersConfig(root, providersJson)
  return normalizeProviders(providersJson, {}, {})
}

export async function saveAgentModelConfig(root: string, snapshot: OpencodeConfigSnapshot, agentName: string, config: Record<string, unknown>): Promise<void> {
  await writeGlobalAgentConfig(root, agentName, config, snapshot.globalOpencodeSource)
}
