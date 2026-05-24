import type { AgentModelSummary } from '../types/agent.js'
import type { ManagedProviderSummary } from '../types/provider.js'
import type { PageShellState } from '../types/tui.js'
import { renderAgentModelConfigScreen } from './agent-model-config-screen.js'
import { renderSidebar } from './page-sidebar.js'
import { renderProviderHomeScreen } from './provider-home-screen.js'
import { reloadProviderManagerData, saveAgentModelConfig, saveProviderDraft, type ProviderManagerData } from '../core/provider-manager-service.js'
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

export async function handleProviderSaveAction(root: string, view: ProviderManagerData, draft: ProviderEditDraft, builtinAgents: unknown[] = view.snapshot.builtinAgents): Promise<ProviderManagerData> {
  const providers = await saveProviderDraft(root, draft, view.providers)
  const selectedIndex = Math.max(0, providers.findIndex((provider) => provider.name.toLowerCase() === draft.name.toLowerCase()))
  const shell = {
    ...view.shell,
    activePage: 'provider' as const,
    sidebarCursorPage: 'provider' as const,
    focusRegion: 'content' as const,
    modalState: null,
    pageStates: {
      ...view.shell.pageStates,
      provider: { ...view.shell.pageStates.provider, selectedIndex }
    }
  }
  const refreshed = await reloadProviderManagerData(root, builtinAgents, shell)
  return { ...refreshed, providers, shell }
}

export async function handleAgentModelConfirmAction(root: string, view: ProviderManagerData, draft: AgentModelDraft, builtinAgents: unknown[] = view.snapshot.builtinAgents): Promise<ProviderManagerData> {
  if (!draft.provider || !draft.model) throw new Error('agent model config is incomplete')
  await saveAgentModelConfig(root, view.snapshot, draft.agentName, {
    provider: draft.provider,
    model: draft.model,
    ...(draft.reasoningEffort ? { reasoningEffort: draft.reasoningEffort } : {})
  })
  const shell = {
    ...view.shell,
    activePage: 'agents' as const,
    sidebarCursorPage: 'agents' as const,
    focusRegion: 'content' as const,
    modalState: null
  }
  return reloadProviderManagerData(root, builtinAgents, shell)
}
