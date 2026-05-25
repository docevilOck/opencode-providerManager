import type { AgentModelSummary } from '../types/agent.js'

export function agentModelLabel(agent: AgentModelSummary): string {
  if (!agent.provider || !agent.model) return '<not set>'
  return `${agent.provider}/${agent.model}`
}

export function renderAgentRow(agent: AgentModelSummary, selected: boolean, bulkSelected?: boolean): string {
  const cursor = selected ? '>' : ' '
  const checkbox = typeof bulkSelected === 'boolean' ? ` [${bulkSelected ? 'x' : ' '}]` : ''
  const model = agentModelLabel(agent)
  const effort = agent.reasoningEffort ?? '-'
  return `${cursor}${checkbox} ${agent.name} model: ${model} effort: ${effort} status: ${agent.status}`
}
