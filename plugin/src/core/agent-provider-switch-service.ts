import type { AgentModelSummary } from '../types/agent.js'
import type { ManagedProviderSummary } from '../types/provider.js'

export type AgentProviderSwitchConfig = {
  agentName: string
  config: Record<string, unknown>
}

function selectedAgents(agents: AgentModelSummary[], selectedAgentNames: Set<string>): AgentModelSummary[] {
  return agents.filter((agent) => selectedAgentNames.has(agent.name))
}

export function availableProvidersForAgents(agents: AgentModelSummary[], providers: ManagedProviderSummary[], selectedAgentNames: Set<string>): string[] {
  const requiredModels = new Set(selectedAgents(agents, selectedAgentNames).map((agent) => agent.model).filter((model): model is string => Boolean(model)))
  if (requiredModels.size < 1) return []
  return providers
    .filter((provider) => {
      const providerModels = new Set(provider.models.map((model) => model.id))
      return [...requiredModels].every((model) => providerModels.has(model))
    })
    .map((provider) => provider.name)
}

export function buildAgentProviderSwitchConfigs(agents: AgentModelSummary[], selectedAgentNames: Set<string>, providerName: string): AgentProviderSwitchConfig[] {
  return selectedAgents(agents, selectedAgentNames)
    .filter((agent) => Boolean(agent.model))
    .map((agent) => ({
      agentName: agent.name,
      config: {
        model: `${providerName}/${agent.model}`,
        ...(agent.reasoningEffort ? { reasoningEffort: agent.reasoningEffort } : {})
      }
    }))
}
