import type { AgentModelSummary } from '../types/agent.js'
import type { AgentBulkEditState } from '../types/tui.js'
import { renderAgentRow } from './agent-row.js'
import { keyHint, titleLine } from './theme.js'

export function renderAgentModelConfigScreen(agents: AgentModelSummary[], selectedIndex: number, scrollOffset = 0, windowSize = agents.length, bulkEdit?: AgentBulkEditState): string[] {
  const footer = bulkEdit?.enabled
    ? keyHint('[Space] Toggle  [a] All  [Enter] Provider  [esc] Cancel')
    : keyHint('[Enter] Configure  [Ctrl+E] Bulk Provider  [esc] Back')
  const header = titleLine(`Agent Models (${agents.length})`, bulkEdit?.enabled ? `${bulkEdit.selectedAgentNames.size} selected` : 'provider/model')
  return [header, ...agents.slice(scrollOffset, scrollOffset + windowSize).map((agent, index) => {
    const absoluteIndex = scrollOffset + index
    return renderAgentRow(agent, absoluteIndex === selectedIndex, bulkEdit?.enabled ? bulkEdit.selectedAgentNames.has(agent.name) : undefined)
  }), footer]
}
