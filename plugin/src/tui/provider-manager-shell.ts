import type { AgentModelSummary } from '../types/agent.js'
import type { ManagedProviderSummary } from '../types/provider.js'
import type { PageShellState } from '../types/tui.js'
import { renderAgentModelConfigScreen } from './agent-model-config-screen.js'
import { renderSidebar } from './page-sidebar.js'
import { renderProviderHomeScreen } from './provider-home-screen.js'
import { saveAgentModelConfig, saveProviderDraft, type ProviderManagerData } from '../core/provider-manager-service.js'
import type { AgentModelDraft } from '../types/agent.js'
import type { ProviderEditDraft } from '../types/provider.js'

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

export async function handleProviderSaveAction(root: string, view: ProviderManagerData, draft: ProviderEditDraft): Promise<ProviderManagerData> {
  const providers = await saveProviderDraft(root, draft, view.providers)
  return { ...view, providers }
}

export async function handleAgentModelConfirmAction(root: string, view: ProviderManagerData, draft: AgentModelDraft): Promise<ProviderManagerData> {
  if (!draft.provider || !draft.model) throw new Error('agent model config is incomplete')
  await saveAgentModelConfig(root, view.snapshot, draft.agentName, {
    provider: draft.provider,
    model: draft.model,
    ...(draft.reasoningEffort ? { reasoningEffort: draft.reasoningEffort } : {})
  })
  return view
}
