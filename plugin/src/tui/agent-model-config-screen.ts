import type { AgentModelSummary } from '../types/agent.js'
import { renderAgentRow } from './agent-row.js'

export function renderAgentModelConfigScreen(agents: AgentModelSummary[], selectedIndex: number): string[] {
  return agents.map((agent, index) => renderAgentRow(agent, index === selectedIndex))
}
