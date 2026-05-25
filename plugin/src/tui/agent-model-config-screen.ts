import type { AgentModelSummary } from '../types/agent.js'
import type { AgentBulkEditState } from '../types/tui.js'
import { renderAgentRow } from './agent-row.js'

export function renderAgentModelConfigScreen(agents: AgentModelSummary[], selectedIndex: number, scrollOffset = 0, windowSize = agents.length, bulkEdit?: AgentBulkEditState): string[] {
  const footer = bulkEdit?.enabled
    ? '[Space] Toggle   [a] All   [Enter] Provider   [esc] Cancel'
    : '[Enter] Configure Model   [Ctrl+E] Bulk Provider   [esc] Back'
  return [`Agent Models (${agents.length})`, ...agents.slice(scrollOffset, scrollOffset + windowSize).map((agent, index) => {
    const absoluteIndex = scrollOffset + index
    return renderAgentRow(agent, absoluteIndex === selectedIndex, bulkEdit?.enabled ? bulkEdit.selectedAgentNames.has(agent.name) : undefined)
  }), footer]
}
