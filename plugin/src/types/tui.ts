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
  expiresAt?: number
}

export type FetchModelsPhase = 'loading' | 'success' | 'failure'
export type ProviderTestPhase = 'testing' | 'cancelled' | 'success' | 'failure'

export type ModalState =
  | { kind: 'provider-test'; providerName: string; phase: ProviderTestPhase }
  | { kind: 'provider-delete-confirm'; providerName: string; isDefault: boolean }
  | { kind: 'leave-confirm'; target: 'provider-edit' }
  | { kind: 'protocol-select'; selectedIndex: number }
  | { kind: 'fetch-models'; phase: FetchModelsPhase; selectedIndex: number; selectedModelIds: Set<string>; message?: string }
  | { kind: 'model-list'; selectedIndex: number; selectedModelIds: Set<string>; editing?: { mode: 'add' | 'edit'; value: string } }
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
