import { readOpencodeConfigSnapshot } from '../infra/opencode-config-reader.js'
import type { AgentModelSummary } from '../types/agent.js'
import type { ManagedProviderSummary, OpencodeConfigSnapshot } from '../types/provider.js'
import type { PageShellState } from '../types/tui.js'
import { mergeAgentModelSummaries } from './agent-model-config-service.js'
import { createInitialPageShellState } from './page-state-service.js'
import { normalizeProviders } from './provider-normalizer.js'

export type ProviderManagerData = {
  snapshot: OpencodeConfigSnapshot
  providers: ManagedProviderSummary[]
  agents: AgentModelSummary[]
  shell: PageShellState
}

export async function loadProviderManagerData(root: string, builtinAgents: unknown[]): Promise<ProviderManagerData> {
  const snapshot = await readOpencodeConfigSnapshot(root, builtinAgents)
  return {
    snapshot,
    providers: normalizeProviders(snapshot.providersJson, snapshot.settingsJson, snapshot.authJson),
    agents: mergeAgentModelSummaries(snapshot.builtinAgents as Array<{ name?: string; model?: string }>, snapshot.globalOpencodeJson),
    shell: createInitialPageShellState()
  }
}
