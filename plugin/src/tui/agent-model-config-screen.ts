import type { AgentModelSummary } from '../types/agent.js'
import { renderAgentRow } from './agent-row.js'

export function renderAgentModelConfigScreen(agents: AgentModelSummary[], selectedIndex: number, scrollOffset = 0, windowSize = agents.length): string[] {
  return [`Agent Models (${agents.length})`, ...agents.slice(scrollOffset, scrollOffset + windowSize).map((agent, index) => {
    const absoluteIndex = scrollOffset + index
    return renderAgentRow(agent, absoluteIndex === selectedIndex)
  })]
}
