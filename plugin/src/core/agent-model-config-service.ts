import type { AgentModelSummary } from '../types/agent.js'
import type { ReasoningEffort } from '../types/provider.js'

type RawAgent = { name?: string; provider?: string; model?: string; reasoningEffort?: ReasoningEffort }

function getGlobalAgents(globalConfig: unknown): Record<string, RawAgent> {
  if (typeof globalConfig !== 'object' || globalConfig === null) return {}
  const agent = (globalConfig as { agent?: unknown }).agent
  return typeof agent === 'object' && agent !== null ? (agent as Record<string, RawAgent>) : {}
}

export function mergeAgentModelSummaries(builtinAgents: RawAgent[], globalConfig: unknown): AgentModelSummary[] {
  const globalAgents = getGlobalAgents(globalConfig)
  const result: AgentModelSummary[] = []
  const seen = new Set<string>()

  builtinAgents.forEach((builtin, index) => {
    const name = builtin.name ?? `agent-${index}`
    const override = globalAgents[name]
    const source = override ? 'global' : 'builtin'
    const selected = override ?? builtin
    result.push({
      name,
      provider: selected.provider ?? null,
      model: selected.model ?? null,
      reasoningEffort: selected.reasoningEffort ?? null,
      status: selected.model ? (override ? 'override' : 'default') : 'incomplete',
      source,
      isBuiltin: true,
      displayOrder: index
    })
    seen.add(name)
  })

  Object.entries(globalAgents).forEach(([name, agent]) => {
    if (seen.has(name)) return
    result.push({
      name,
      provider: agent.provider ?? null,
      model: agent.model ?? null,
      reasoningEffort: agent.reasoningEffort ?? null,
      status: agent.model ? 'override' : 'incomplete',
      source: 'global',
      isBuiltin: false,
      displayOrder: result.length
    })
  })

  return result
}
