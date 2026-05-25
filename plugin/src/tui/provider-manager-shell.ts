import type { AgentModelSummary } from '../types/agent.js'
import type { ManagedProviderSummary } from '../types/provider.js'
import type { PageShellState } from '../types/tui.js'
import { renderAgentModelConfigScreen } from './agent-model-config-screen.js'
import { renderSidebar } from './page-sidebar.js'
import { renderProviderHomeScreen } from './provider-home-screen.js'
import { reloadProviderManagerData, saveAgentModelConfig, saveProviderDraft, type ProviderManagerData } from '../core/provider-manager-service.js'
import { buildAgentProviderSwitchConfigs } from '../core/agent-provider-switch-service.js'
import { visibleStatusLine } from '../core/page-state-service.js'
import { keyHint, titleLine } from './theme.js'
import type { AgentModelDraft } from '../types/agent.js'
import type { ProviderEditDraft } from '../types/provider.js'
import type { PageId } from '../types/tui.js'

export type ProviderManagerShellView = {
  shell: PageShellState
  providers: ManagedProviderSummary[]
  agents: AgentModelSummary[]
  error?: string
}

const LIST_WINDOW_SIZE = 8

export function renderProviderManagerShell(view: ProviderManagerShellView): string {
  const sidebar = renderSidebar(view.shell.pages, view.shell.activePage, view.shell.sidebarCursorPage, view.shell.focusRegion !== 'sidebar')
  if (view.error) return [...sidebar, titleLine('Error', view.error)].join('\n')
  const pageState = view.shell.pageStates[view.shell.activePage]
  const content = view.shell.activePage === 'provider'
    ? renderProviderHomeScreen(view.providers, pageState.selectedIndex, pageState.scrollOffset, LIST_WINDOW_SIZE)
    : renderAgentModelConfigScreen(view.agents, pageState.selectedIndex, pageState.scrollOffset, LIST_WINDOW_SIZE, view.shell.agentBulkEdit)
  return [...sidebar, ...content, actionBar(view.shell.activePage, view.providers.length > 0), visibleStatusLine(view.shell.statusLine)?.message ?? ''].filter(Boolean).join('\n')
}

function actionBar(page: PageId, hasProvider: boolean): string {
  if (page !== 'provider') return keyHint('[Enter] Configure  [Ctrl+E] Bulk Provider  [esc] Back')
  return hasProvider
    ? keyHint('[Enter] Edit  [a] Add  [d] Delete  [t] Test  [s] Default  [esc] Back')
    : keyHint('[Enter] Edit disabled  [a] Add  [d] Delete disabled  [t] Test disabled  [s] Default disabled  [esc] Back')
}

function returnToPageContent(shell: PageShellState, activePage: PageId): PageShellState {
  return {
    ...shell,
    activePage,
    sidebarCursorPage: activePage,
    focusRegion: 'content',
    modalState: null
  }
}

export async function handleProviderSaveAction(root: string, view: ProviderManagerData, draft: ProviderEditDraft, builtinAgents: unknown[] = view.snapshot.builtinAgents): Promise<ProviderManagerData> {
  const providers = await saveProviderDraft(root, draft, view.providers)
  const selectedIndex = Math.max(0, providers.findIndex((provider) => provider.name.toLowerCase() === draft.name.toLowerCase()))
  const shell = {
    ...returnToPageContent(view.shell, 'provider'),
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
    model: `${draft.provider}/${draft.model}`,
    ...(draft.reasoningEffort ? { reasoningEffort: draft.reasoningEffort } : {})
  })
  const shell = returnToPageContent(view.shell, 'agents')
  return reloadProviderManagerData(root, builtinAgents, shell)
}

export async function handleAgentProviderSwitchAction(root: string, view: ProviderManagerData, selectedAgentNames: Set<string>, providerName: string, builtinAgents: unknown[] = view.snapshot.builtinAgents): Promise<ProviderManagerData> {
  const configs = buildAgentProviderSwitchConfigs(view.agents, selectedAgentNames, providerName)
  if (configs.length < 1) throw new Error('agent provider switch is incomplete')
  for (const { agentName, config } of configs) {
    await saveAgentModelConfig(root, view.snapshot, agentName, config)
  }
  const shell = returnToPageContent({
    ...view.shell,
    agentBulkEdit: { enabled: false, selectedAgentNames: new Set() }
  }, 'agents')
  return reloadProviderManagerData(root, builtinAgents, shell)
}
