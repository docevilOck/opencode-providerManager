import type { AgentModelDraft } from './agent.js'

export type PageId = 'provider' | 'agents'

export type PageContentState = {
  selectedIndex: number
  scrollOffset: number
}

export type ValidationIssue = {
  field?: string
  code: string
  message: string
  severity: 'error' | 'warn'
}

export type StatusLine = {
  message: string
  level: 'info' | 'warn' | 'error'
}

export type FetchModelsPhase = 'loading' | 'success' | 'failure'
export type ProviderTestPhase = 'testing' | 'cancelled' | 'success' | 'failure'

export type ModalState =
  | { kind: 'provider-test'; providerName: string; phase: ProviderTestPhase }
  | { kind: 'leave-confirm'; target: 'provider-edit' }
  | { kind: 'protocol-select'; selectedIndex: number }
  | { kind: 'fetch-models'; phase: FetchModelsPhase; selectedIndex: number; selectedModelIds: Set<string> }
  | { kind: 'model-config-defaults'; selectedField: string }
  | { kind: 'agent-model-picker'; draft: AgentModelDraft }

export type PageShellState = {
  pages: PageId[]
  activePage: PageId
  sidebarCursorPage: PageId
  focusRegion: 'sidebar' | 'content' | 'modal'
  pageStates: Record<PageId, PageContentState>
  modalState: ModalState | null
  statusLine: StatusLine | null
}
