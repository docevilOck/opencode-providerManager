import type { AgentModelSummary } from '../types/agent.js'

export function renderAgentRow(agent: AgentModelSummary, selected: boolean): string {
  const cursor = selected ? '>' : ' '
  const model = agent.model ?? '<not set>'
  const effort = agent.reasoningEffort ?? '-'
  return `${cursor} ${agent.name} model: ${model} effort: ${effort} status: ${agent.status}`
}
