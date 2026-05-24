import type { AgentModelSummary } from '../types/agent.js'
import type { ManagedProviderSummary } from '../types/provider.js'
import type { PageShellState } from '../types/tui.js'
import { renderAgentModelConfigScreen } from './agent-model-config-screen.js'
import { renderSidebar } from './page-sidebar.js'
import { renderProviderHomeScreen } from './provider-home-screen.js'

export type ProviderManagerShellView = {
  shell: PageShellState
  providers: ManagedProviderSummary[]
  agents: AgentModelSummary[]
  error?: string
}

export function renderProviderManagerShell(view: ProviderManagerShellView): string {
  const sidebar = renderSidebar(view.shell.pages, view.shell.activePage, view.shell.sidebarCursorPage)
  if (view.error) return [...sidebar, `Error: ${view.error}`].join('\n')
  const pageState = view.shell.pageStates[view.shell.activePage]
  const content = view.shell.activePage === 'provider'
    ? renderProviderHomeScreen(view.providers, pageState.selectedIndex)
    : renderAgentModelConfigScreen(view.agents, pageState.selectedIndex)
  return [...sidebar, ...content, view.shell.statusLine?.message ?? ''].filter(Boolean).join('\n')
}
