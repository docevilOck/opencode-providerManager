import type { AgentModelSummary } from '../types/agent.js'
import type { ReasoningEffort } from '../types/provider.js'

type RawAgent = { name?: string; provider?: string; model?: string; reasoningEffort?: ReasoningEffort }

function splitAgentModel(agent: RawAgent): { provider: string | null; model: string | null } {
  if (!agent.model) return { provider: agent.provider ?? null, model: null }
  const slashIndex = agent.model.indexOf('/')
  if (slashIndex > 0) {
    return {
      provider: agent.model.slice(0, slashIndex),
      model: agent.model.slice(slashIndex + 1)
    }
  }
  return { provider: agent.provider ?? null, model: agent.model }
}

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
    const selectedModel = splitAgentModel(selected)
    result.push({
      name,
      provider: selectedModel.provider,
      model: selectedModel.model,
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
    const selectedModel = splitAgentModel(agent)
    result.push({
      name,
      provider: selectedModel.provider,
      model: selectedModel.model,
      reasoningEffort: agent.reasoningEffort ?? null,
      status: agent.model ? 'override' : 'incomplete',
      source: 'global',
      isBuiltin: false,
      displayOrder: result.length
    })
  })

  return result
}
