import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createSignal } from 'solid-js'
import { buildModelOptionSet } from './core/agent-model-option-service.js'
import { applyFetchedModelSelection, moveFetchModelSelection, selectAllFetchedModels, toggleFetchModelSelection } from './core/fetch-model-modal-service.js'
import { availableProvidersForAgents } from './core/agent-provider-switch-service.js'
import { activateSidebarPage, createTransientStatusLine, moveSidebarCursor, returnToSidebar, visibleScrollOffset, visibleStatusLine } from './core/page-state-service.js'
import { deleteProvider, loadProviderManagerData, ProviderDraftValidationError, setDefaultProvider, type ProviderManagerData } from './core/provider-manager-service.js'
import { fetchProviderModels as fetchProviderModelsFromRemote, testProviderConnection } from './core/provider-runtime-service.js'
import { handleAgentModelConfirmAction, handleAgentProviderSwitchAction, handleProviderSaveAction, renderProviderManagerShell } from './tui/provider-manager-shell.js'
import { backspaceAgentModelSearch, confirmAgentModelStep, createAgentModelDraft, escapeAgentModelStep, inputAgentModelSearch, moveAgentModelSelection, renderAgentModelPickerModal } from './tui/agent-model-picker-modal.js'
import { renderAgentRow } from './tui/agent-row.js'
import { renderProviderEditScreen } from './tui/provider-edit-screen.js'
import { renderProviderRow } from './tui/provider-row.js'
import { keyHint, titleLine } from './tui/theme.js'
import type { AgentModelDraft, AgentModelSummary, ModelOptionSet } from './types/agent.js'
import type { ManagedProviderSummary, ProviderApiType, ProviderEditDraft, ProviderEditField, ProviderModelConfig, ProviderModelConfigDefaults } from './types/provider.js'
import type { PageId, PageShellState } from './types/tui.js'

type ProviderManagerTuiCommand = {
  name: string
  title: string
  desc?: string
  description?: string
  namespace?: string
  category?: string
  slashName?: string
  slashAliases?: string[]
  enabled?: () => boolean
  run: () => void | Promise<void>
}

type ProviderRuntimeStatus = 'cancelled'
type ProviderAction = 'edit' | 'delete' | 'test' | 'default' | 'fetch-models' | 'model-defaults' | 'save'

type ProviderManagerTuiDialogPrompt = (props: {
  title: string
  placeholder?: string
  value?: string
  onConfirm?: (value: string) => void
  onCancel?: () => void
}) => unknown

type ProviderManagerTuiDialogSelectOption<Value> = {
  title: string
  value: Value
  description?: string
  category?: string
  disabled?: boolean
}

type ProviderManagerTuiDialogSelect = <Value>(props: {
  title: string
  options: ProviderManagerTuiDialogSelectOption<Value>[]
  current?: Value
  onSelect?: (option: ProviderManagerTuiDialogSelectOption<Value>) => void
}) => unknown

type ProviderManagerTuiApi = {
  route?: {
    readonly current?: { name?: string }
    register: (routes: Array<{ name: string; render: (input: { params?: Record<string, unknown> }) => unknown }>) => () => void
    navigate: (name: string, params?: Record<string, unknown>) => void
  }
  keymap?: {
    registerLayer: (layer: { enabled?: () => boolean; commands: ProviderManagerTuiCommand[]; bindings?: unknown[] }) => () => void
  }
  ui?: {
    toast?: (input: { variant: 'info' | 'error'; title: string; message: string; duration?: number }) => void
    DialogPrompt?: ProviderManagerTuiDialogPrompt
    DialogSelect?: ProviderManagerTuiDialogSelect
    dialog?: { clear?: () => void; replace?: (render: () => unknown, onClose?: () => void) => void; setSize?: (size: 'small' | 'medium' | 'large') => void }
  }
  state?: {
    path?: { config?: string; directory?: string }
    config?: { agent?: Record<string, { model?: string }> }
  }
}

export type PluginContext = {
  configRoot?: string
  builtinAgents?: unknown[]
  registerCommand?: (name: string, handler: () => unknown | Promise<unknown>) => void
}

export type ProviderManagerSession = {
  render: () => string
  handleProviderSave: (draft: ProviderEditDraft) => Promise<string>
  handleAgentModelConfirm: (draft: AgentModelDraft) => Promise<string>
}

const PROVIDER_MANAGER_ROUTE = 'provider-manager'
const PAGE_ORDER: PageId[] = ['provider', 'agents']
const PROVIDER_API_TYPES: ProviderApiType[] = ['openai-responses', 'openai-chat', 'openai-compatible-chat', 'anthropic-messages', 'gemini', 'bedrock-converse']
const PROVIDER_EDIT_FIELDS: ProviderEditField[] = ['name', 'baseUrl', 'apiType', 'apiKey', 'models']
const MODEL_DEFAULT_FIELDS = ['contextWindow', 'maxOutput', 'inputTypes', 'minimal', 'low', 'medium', 'high', 'xhigh'] as const
const AGENT_SEARCH_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.:/ '.split('')
const CONTENT_WINDOW_SIZE = 8
const execFileAsync = promisify(execFile)
const TUI_COLOR = {
  title: 'blue',
  accent: 'cyan',
  text: 'white',
  muted: 'gray',
  disabled: 'darkgray',
  success: 'green',
  warning: 'yellow',
  danger: 'red'
} as const

function agentSearchCommandName(index: number): string {
  return `provider-manager.agent-modal.input.${index}`
}

export function providerUnavailableActionMessage(action: ProviderAction, context: { hasProvider: boolean; hasDraft: boolean }): string | null {
  if (action === 'fetch-models' || action === 'model-defaults' || action === 'save') {
    return context.hasDraft ? null : 'Open or add a provider before using this action'
  }
  return context.hasProvider ? null : 'No provider selected. Press [a] to add one.'
}

export async function createProviderManagerSession(ctx: Pick<PluginContext, 'configRoot' | 'builtinAgents'> = {}): Promise<ProviderManagerSession> {
  const root = ctx.configRoot ?? process.cwd()
  const builtinAgents = ctx.builtinAgents ?? []
  let data = await loadProviderManagerData(root, builtinAgents)
  const session: ProviderManagerSession = {
    render: () => renderProviderManagerShell(data),
    handleProviderSave: async (draft) => {
      data = await handleProviderSaveAction(root, data, draft, builtinAgents)
      return session.render()
    },
    handleAgentModelConfirm: async (draft) => {
      data = await handleAgentModelConfirmAction(root, data, draft, builtinAgents)
      return session.render()
    }
  }
  return session
}

export function registerProviderManagerPlugin(ctx: PluginContext) {
  ctx.registerCommand?.('provider', async () => createProviderManagerSession(ctx))
}

function configRootFromApi(api: ProviderManagerTuiApi): string {
  return api.state?.path?.config || api.state?.path?.directory || process.cwd()
}

function builtinAgentsFromApi(api: ProviderManagerTuiApi): unknown[] {
  const agents = api.state?.config?.agent
  if (!agents || typeof agents !== 'object') return []
  return Object.entries(agents).map(([name, config]) => ({ name, model: config?.model }))
}

function replaceShell(data: ProviderManagerData, shell: PageShellState): ProviderManagerData {
  return { ...data, shell }
}

function emptyProviderDraft(): ProviderEditDraft {
  return {
    originalName: null,
    name: '',
    baseUrl: '',
    apiType: 'openai-compatible-chat',
    apiKey: '',
    defaultModel: null,
    models: [],
    modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['minimal', 'low', 'medium', 'high', 'xhigh'] },
    dirtyFields: new Set(),
    validationErrors: [],
    protocolChanged: false
  }
}

function draftFromProvider(provider: ManagedProviderSummary): ProviderEditDraft {
  return {
    originalName: provider.name,
    name: provider.name,
    baseUrl: provider.baseUrl,
    apiType: provider.apiType,
    apiKey: provider.apiKey ?? '',
    defaultModel: provider.defaultModel,
    models: provider.models,
    modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['minimal', 'low', 'medium', 'high', 'xhigh'] },
    dirtyFields: new Set(),
    validationErrors: [],
    protocolChanged: false
  }
}

function moveContent(shell: PageShellState, data: ProviderManagerData, delta: number): PageShellState {
  const page = shell.activePage
  const count = page === 'provider' ? data.providers.length : data.agents.length
  if (count < 1) return shell
  const state = shell.pageStates[page]
  const selectedIndex = Math.max(0, Math.min(count - 1, state.selectedIndex + delta))
  const scrollOffset = visibleScrollOffset(selectedIndex, state.scrollOffset, count, CONTENT_WINDOW_SIZE)
  return {
    ...shell,
    pageStates: {
      ...shell.pageStates,
      [page]: { ...state, selectedIndex, scrollOffset }
    }
  }
}

function openShellModal(shell: PageShellState, modalState: NonNullable<PageShellState['modalState']>): PageShellState {
  return { ...shell, focusRegion: 'modal', modalState, statusLine: null }
}

function closeShellModal(shell: PageShellState): PageShellState {
  return { ...shell, focusRegion: 'content', modalState: null, statusLine: null }
}

function statusShell(shell: PageShellState, message: string, level: 'info' | 'warn' | 'error' = 'info'): PageShellState {
  return { ...shell, statusLine: createTransientStatusLine(message, level) }
}

async function readClipboardText(): Promise<string> {
  if (process.platform === 'win32') {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', 'Get-Clipboard -Raw'], { timeout: 2000 })
    return stdout.replace(/[\r\n]+$/, '')
  }
  if (process.platform === 'darwin') {
    const { stdout } = await execFileAsync('pbpaste', [], { timeout: 2000 })
    return stdout
  }
  try {
    const { stdout } = await execFileAsync('wl-paste', ['--no-newline'], { timeout: 2000 })
    return stdout
  } catch {
    const { stdout } = await execFileAsync('xclip', ['-selection', 'clipboard', '-out'], { timeout: 2000 })
    return stdout
  }
}

function promptValue(api: ProviderManagerTuiApi, title: string, placeholder?: string, lock?: () => void, unlock?: () => void): Promise<string | null> {
  const DialogPrompt = api.ui?.DialogPrompt
  if (!DialogPrompt || !api.ui?.dialog?.replace) return Promise.resolve(null)
  api.ui.dialog.setSize?.('medium')
  lock?.()
  return new Promise((resolve) => {
    let done = false
    const finish = (value: string | null) => {
      if (done) return
      done = true
      unlock?.()
      resolve(value)
    }
    api.ui?.dialog?.replace?.(
      () => (
        <DialogPrompt
          title={title}
          placeholder={placeholder}
          onConfirm={(value) => {
            api.ui?.dialog?.clear?.()
            finish(value.trim())
          }}
          onCancel={() => {
            api.ui?.dialog?.clear?.()
            finish(null)
          }}
        />
      ),
      () => finish(null)
    )
  })
}

function selectValue<Value>(api: ProviderManagerTuiApi, title: string, options: ProviderManagerTuiDialogSelectOption<Value>[], lock?: () => void, unlock?: () => void): Promise<Value | null> {
  const DialogSelect = api.ui?.DialogSelect
  if (!DialogSelect || !api.ui?.dialog?.replace || options.length < 1) return Promise.resolve(null)
  api.ui.dialog.setSize?.('medium')
  lock?.()
  return new Promise((resolve) => {
    let done = false
    const finish = (value: Value | null) => {
      if (done) return
      done = true
      unlock?.()
      resolve(value)
    }
    api.ui?.dialog?.replace?.(
      () => (
        <DialogSelect
          title={title}
          options={options}
          onSelect={(option) => {
            api.ui?.dialog?.clear?.()
            finish(option.value)
          }}
        />
      ),
      () => finish(null)
    )
  })
}

type ProviderInlineEditState = { field: Extract<ProviderEditField, 'name' | 'baseUrl' | 'apiKey'>; value: string }
const PROVIDER_FIELD_LABELS: Record<ProviderEditField, string> = {
  name: 'Name',
  baseUrl: 'Base URL',
  apiType: 'API Type',
  apiKey: 'API Key',
  models: 'Models',
  defaultModel: 'Default Model'
}

function providerFieldValue(draft: ProviderEditDraft, field: ProviderEditField): string {
  if (field === 'defaultModel') return draft.defaultModel ?? ''
  if (field === 'models') return `${draft.models.length}`
  if (field === 'apiKey') return draft.apiKey ? '************' : ''
  return draft[field]
}

function ProviderManagerRoute(props: { data: () => ProviderManagerData | null; providerDraft: () => ProviderEditDraft | null; providerEditField: () => ProviderEditField; providerInlineEdit: () => ProviderInlineEditState | null; fetchModelCandidates: () => ProviderModelConfig[]; modelDefaultsDraft: () => ProviderModelConfigDefaults | null; providerRuntimeStatuses: () => Record<string, ProviderRuntimeStatus>; onProviderInput: (value: string) => void; onProviderSubmit: () => void; onModelInput: (value: string) => void; onModelSubmit: () => void }) {
  const data = props.data
  const shell = () => data()?.shell
  const sidebarRows = () => (shell()?.pages ?? PAGE_ORDER).map((page) => ({
    page,
    active: shell()?.focusRegion !== 'sidebar' && shell()?.activePage === page,
    cursor: shell()?.sidebarCursorPage === page
  }))
  const selectedProvider = () => data()?.shell.pageStates.provider.selectedIndex ?? 0
  const providerScrollOffset = () => data()?.shell.pageStates.provider.scrollOffset ?? 0
  const selectedAgent = () => data()?.shell.pageStates.agents.selectedIndex ?? 0
  const agentScrollOffset = () => data()?.shell.pageStates.agents.scrollOffset ?? 0

  return (
    <box width="100%" height="100%" flexDirection="column" paddingTop={1} paddingLeft={2} paddingRight={2}>
      <text fg={TUI_COLOR.title}>Provider Manager  /  opencode</text>
      <box flexDirection="row" paddingTop={1} flexGrow={1}>
        <box width={22} flexDirection="column" paddingRight={2}>
          {sidebarRows().map((row) => (
            <text fg={row.cursor ? TUI_COLOR.accent : row.active ? TUI_COLOR.success : TUI_COLOR.muted}>
              {row.cursor ? '>' : ' '} {row.active ? '*' : ' '} {row.page}
            </text>
          ))}
        </box>
        <box flexGrow={1} flexDirection="column">
          {data()?.error ? <text fg="red">Error: {data()?.error}</text> : props.providerDraft()
            ? <ProviderEditPage draft={props.providerDraft()!} selectedField={props.providerEditField()} inlineEdit={props.providerInlineEdit()} onInput={props.onProviderInput} onSubmit={props.onProviderSubmit} />
            : shell()?.activePage === 'agents'
            ? <AgentList agents={data()?.agents ?? []} selectedIndex={selectedAgent()} scrollOffset={agentScrollOffset()} bulkEdit={shell()?.agentBulkEdit} />
            : <ProviderList providers={data()?.providers ?? []} selectedIndex={selectedProvider()} scrollOffset={providerScrollOffset()} runtimeStatuses={props.providerRuntimeStatuses()} />}
        </box>
      </box>
      <text fg={TUI_COLOR.muted}>{statusLine(shell())}</text>
      <ModalView shell={shell} draft={props.providerDraft} fetchModelCandidates={props.fetchModelCandidates} modelDefaultsDraft={props.modelDefaultsDraft} onModelInput={props.onModelInput} onModelSubmit={props.onModelSubmit} />
    </box>
  )
}

function ModalView(props: { shell: () => PageShellState | undefined; draft: () => ProviderEditDraft | null; fetchModelCandidates: () => ProviderModelConfig[]; modelDefaultsDraft: () => ProviderModelConfigDefaults | null; onModelInput: (value: string) => void; onModelSubmit: () => void }) {
  const modal = () => props.shell()?.modalState ?? null
  if (modal()?.kind === 'model-list') {
    return <ModelListModal modal={modal() as Extract<NonNullable<PageShellState['modalState']>, { kind: 'model-list' }>} models={props.draft()?.models ?? []} onInput={props.onModelInput} onSubmit={props.onModelSubmit} />
  }
  const lines = () => renderProviderManagerModalLines(props.shell()?.modalState ?? null, props.fetchModelCandidates(), props.modelDefaultsDraft())
  return (
    <box flexDirection="column" borderStyle={lines().length ? 'single' : undefined}>
      {lines().map((line, index) => <text fg={index === 0 ? TUI_COLOR.accent : line.startsWith('>') ? TUI_COLOR.accent : TUI_COLOR.text}>{line}</text>)}
    </box>
  )
}

function ModelListModal(props: { modal: Extract<NonNullable<PageShellState['modalState']>, { kind: 'model-list' }>; models: ProviderModelConfig[]; onInput: (value: string) => void; onSubmit: () => void }) {
  const rows = () => props.models.length ? props.models : []
  return (
    <box flexDirection="column" borderStyle="single">
      <text fg={TUI_COLOR.accent}>{titleLine(`Models (${props.models.length})`, 'provider')}</text>
      {props.modal.editing?.mode === 'add' ? (
        <box flexDirection="row">
          <text fg={TUI_COLOR.accent}>{'>>'} New Model: </text>
          <input focused value={props.modal.editing.value} maxLength={1000} onInput={props.onInput} onSubmit={props.onSubmit} />
        </box>
      ) : null}
      {rows().map((model, index) => (
        <box flexDirection="row">
          <text fg={index === props.modal.selectedIndex ? TUI_COLOR.accent : TUI_COLOR.muted}>{index === props.modal.selectedIndex ? props.modal.editing?.mode === 'edit' ? '>>' : '>' : ' '} </text>
          {props.modal.editing?.mode === 'edit' && index === props.modal.selectedIndex
            ? <input focused value={props.modal.editing.value} maxLength={1000} onInput={props.onInput} onSubmit={props.onSubmit} />
            : <text fg={index === props.modal.selectedIndex ? TUI_COLOR.accent : TUI_COLOR.text}>{props.modal.selectedModelIds.has(model.id) ? '[x]' : '[ ]'} {model.id}</text>}
        </box>
      ))}
      {props.models.length < 1 && props.modal.editing?.mode !== 'add' ? <text fg={TUI_COLOR.warning}>No models. Press [a] to add one.</text> : null}
      <text fg={TUI_COLOR.muted}>{keyHint('[Up/Down] Move  [Space] Toggle  [Enter] Edit  [a] Add  [Ctrl+S] Save  [esc] Close')}</text>
    </box>
  )
}

export function renderProviderManagerModalLines(modal: PageShellState['modalState'], fetchModelCandidates: ProviderModelConfig[], modelDefaultsDraft: ProviderModelConfigDefaults | null = null): string[] {
  if (!modal) return []
  if (modal.kind === 'agent-model-picker') return renderAgentModelPickerModal(modal.draft)
  if (modal.kind === 'agent-provider-switch') return [
    titleLine(`Switch Provider (${modal.agentNames.length} agents)`, 'bulk'),
    ...(modal.providerNames.length
      ? modal.providerNames.map((name, index) => `${index === modal.selectedIndex ? '>' : ' '} ${name}`)
      : [modal.message ?? 'No provider can cover selected agent models.']),
    keyHint('[Up/Down] Move  [Enter] Select  [esc] Close')
  ]
  if (modal.kind === 'provider-test') return [titleLine('Provider Test', modal.providerName), modal.phase === 'testing' ? 'Testing...' : `Result: ${modal.phase}`, keyHint('[Enter] OK  [esc] Close')]
  if (modal.kind === 'provider-delete-confirm') return [
    titleLine('Delete Provider', modal.providerName),
    modal.isDefault ? 'Switch default provider before deleting this provider.' : '[Enter] Confirm Delete',
    '[esc] Close'
  ]
  if (modal.kind === 'leave-confirm') return ['Unsaved changes', '[Enter] Confirm', '[esc] Close']
  if (modal.kind === 'protocol-select') return [titleLine('Select API Protocol', 'provider'), ...PROVIDER_API_TYPES.map((type, index) => `${index === modal.selectedIndex ? '>' : ' '} ${type}`), keyHint('[Up/Down] Move  [Enter] Select'), '[esc] Close']
  if (modal.kind === 'model-list') return ['Models', '[Space] Toggle [Enter] Edit [a] Add [Ctrl+S] Save', '[esc] Close']
  if (modal.kind === 'model-config-defaults') {
    const defaults = modelDefaultsDraft ?? { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text', 'image'], reasoningEfforts: ['minimal', 'low', 'medium', 'high', 'xhigh'] }
    const selected = modal.selectedField
    return [
      titleLine('Model Config Defaults', 'provider'),
      `${selected === 'contextWindow' ? '>' : ' '} Context Window Size : ${defaults.contextWindow}`,
      `${selected === 'maxOutput' ? '>' : ' '} Max Output Size     : ${defaults.maxOutput}`,
      `${selected === 'inputTypes' ? '>' : ' '} Input Type          : ${defaults.inputTypes.join(',')}`,
      'Reasoning Levels',
      ...(['minimal', 'low', 'medium', 'high', 'xhigh'] as const).map((effort) => `${selected === effort ? '>' : ' '}   ${defaults.reasoningEfforts.includes(effort) ? '[x]' : '[ ]'} ${effort}`),
      keyHint('[Up/Down] Move  [Enter] Edit  [Space] Toggle'),
      keyHint('[Ctrl+S] Save  [esc] Close')
    ]
  }
  if (modal.phase === 'loading') return [titleLine('Fetch Models', 'remote'), 'Fetching models...', '[esc] Cancel']
  if (modal.phase === 'failure') return [titleLine('Fetch Models', 'remote'), 'Failed to fetch models', ...(modal.message ? [modal.message] : []), keyHint('[Enter] OK  [esc] Close')]
  return [
    titleLine('Fetch Models', 'remote'),
    `Available Models (${fetchModelCandidates.length})`,
    ...fetchModelCandidates.map((model, index) => `${index === modal.selectedIndex ? '>' : ' '} ${modal.selectedModelIds.has(model.id) ? '[x]' : '[ ]'} ${model.id}`),
    keyHint('[Up/Down] Move  [Space] Toggle  [a] All'),
    keyHint('[Enter] Confirm  [esc] Close')
  ]
}

function ProviderEditPage(props: { draft: ProviderEditDraft; selectedField: ProviderEditField; inlineEdit: ProviderInlineEditState | null; onInput: (value: string) => void; onSubmit: () => void }) {
  const fields = () => PROVIDER_EDIT_FIELDS.map((field) => ({
    field,
    label: PROVIDER_FIELD_LABELS[field],
    selected: field === props.selectedField,
    editing: props.inlineEdit?.field === field,
    value: props.inlineEdit?.field === field ? props.inlineEdit.value : providerFieldValue(props.draft, field),
    errors: props.draft.validationErrors.filter((issue) => issue.field === field).map((issue) => issue.message)
  }))
  return (
    <box flexDirection="column">
      <text fg={TUI_COLOR.accent}>{titleLine('Edit Provider', props.draft.originalName ? 'existing' : 'new')}</text>
      {fields().map((item) => (
        <>
          <box flexDirection="row">
            <text fg={item.editing ? TUI_COLOR.accent : item.selected ? TUI_COLOR.accent : TUI_COLOR.muted}>{item.editing ? '>>' : item.selected ? '>' : ' '} {item.label.padEnd(14)}: </text>
            {item.editing
              ? <input focused value={item.value} maxLength={1000} onInput={props.onInput} onSubmit={props.onSubmit} />
              : <text fg={TUI_COLOR.text}>{item.value}</text>}
          </box>
          {item.errors.map((message) => <text fg={TUI_COLOR.danger}>  {message}</text>)}
        </>
      ))}
      <text fg={TUI_COLOR.text}>  Models        : {props.draft.models.length}</text>
      {props.draft.validationErrors.filter((issue) => !issue.field).map((issue) => <text fg={TUI_COLOR.danger}>{issue.message}</text>)}
      <text fg={TUI_COLOR.muted}>{props.inlineEdit ? keyHint('Editing: paste supported  [Enter] Apply  [esc] Cancel') : keyHint(`Selected: ${PROVIDER_FIELD_LABELS[props.selectedField]}  [Enter] Edit  [p] Protocol  [f] Fetch Models  [e] Model Defaults  [Ctrl+S] Save  [esc] Cancel`)}</text>
    </box>
  )
}

function ProviderList(props: { providers: ManagedProviderSummary[]; selectedIndex: number; scrollOffset: number; runtimeStatuses: Record<string, ProviderRuntimeStatus> }) {
  const hasProvider = () => props.providers.length > 0
  const defaultProvider = () => props.providers.find((provider) => provider.isDefault)?.displayName ?? '-'
  if (!hasProvider()) {
    return (
      <box flexDirection="column">
        <text fg={TUI_COLOR.accent}>{titleLine('Providers (0)', 'default -')}</text>
        <text fg={TUI_COLOR.warning}>No providers configured.</text>
        <ProviderActionBar hasProvider={false} />
      </box>
    )
  }
  const visibleProviders = () => props.providers.slice(props.scrollOffset, props.scrollOffset + CONTENT_WINDOW_SIZE)
  return (
    <box flexDirection="column">
      <text fg={TUI_COLOR.accent}>{titleLine(`Providers (${props.providers.length})`, `default ${defaultProvider()}`)}</text>
      {visibleProviders().map((provider, index) => (
        <text fg={props.scrollOffset + index === props.selectedIndex ? TUI_COLOR.accent : TUI_COLOR.text}>
          {renderProviderRow(provider, props.scrollOffset + index === props.selectedIndex)}
          {props.runtimeStatuses[provider.name] ? ` test:${props.runtimeStatuses[provider.name]}` : ''}
        </text>
      ))}
      <ProviderActionBar hasProvider={true} />
    </box>
  )
}

function ProviderActionBar(props: { hasProvider: boolean }) {
  return (
    <box flexDirection="row">
      <text fg={props.hasProvider ? TUI_COLOR.muted : TUI_COLOR.disabled}>[Enter] Edit  </text>
      <text fg={TUI_COLOR.muted}>[a] Add  </text>
      <text fg={props.hasProvider ? TUI_COLOR.muted : TUI_COLOR.disabled}>[d] Delete  </text>
      <text fg={props.hasProvider ? TUI_COLOR.muted : TUI_COLOR.disabled}>[t] Test  </text>
      <text fg={props.hasProvider ? TUI_COLOR.muted : TUI_COLOR.disabled}>[s] Default  </text>
      <text fg={TUI_COLOR.disabled}>[f] Fetch Models</text>
    </box>
  )
}

function AgentList(props: { agents: AgentModelSummary[]; selectedIndex: number; scrollOffset: number; bulkEdit?: PageShellState['agentBulkEdit'] }) {
  if (props.agents.length < 1) return <text fg={TUI_COLOR.warning}>No agents available.</text>
  const visibleAgents = () => props.agents.slice(props.scrollOffset, props.scrollOffset + CONTENT_WINDOW_SIZE)
  return (
    <box flexDirection="column">
      <text fg={TUI_COLOR.accent}>{titleLine(`Agent Models (${props.agents.length})`, props.bulkEdit?.enabled ? `${props.bulkEdit.selectedAgentNames.size} selected` : 'provider/model')}</text>
      {visibleAgents().map((agent, index) => (
        <text fg={props.scrollOffset + index === props.selectedIndex ? TUI_COLOR.accent : TUI_COLOR.text}>
          {renderAgentRow(agent, props.scrollOffset + index === props.selectedIndex, props.bulkEdit?.enabled ? props.bulkEdit.selectedAgentNames.has(agent.name) : undefined)}
        </text>
      ))}
      <text fg={TUI_COLOR.muted}>{props.bulkEdit?.enabled ? keyHint('[Space] Toggle  [a] All  [Enter] Provider  [esc] Cancel') : keyHint('[Enter] Configure  [Ctrl+E] Bulk Provider  [esc] Back')}</text>
    </box>
  )
}

function statusLine(shell: PageShellState | undefined): string {
  if (!shell) return 'Loading...'
  const currentStatusLine = visibleStatusLine(shell.statusLine)
  if (currentStatusLine?.message) return currentStatusLine.message
  if (shell.focusRegion === 'sidebar') return 'Sidebar: ↑/↓ move, Enter switch, Esc close'
  if (shell.activePage === 'provider') return 'Provider: ↑/↓ select, a add, r refresh, Esc sidebar'
  if (shell.agentBulkEdit?.enabled) return 'Agents: ↑/↓ select, Space toggle, a all, Enter provider, Esc cancel'
  return 'Agents: ↑/↓ select, Enter configure model, Ctrl+E bulk provider, r refresh, Esc sidebar'
}

async function tui(api: ProviderManagerTuiApi) {
  const root = configRootFromApi(api)
  const builtinAgents = builtinAgentsFromApi(api)
  const [data, setData] = createSignal<ProviderManagerData | null>(null)
  const [providerDraft, setProviderDraft] = createSignal<ProviderEditDraft | null>(null)
  const [providerEditField, setProviderEditField] = createSignal<ProviderEditField>('name')
  const [providerInlineEdit, setProviderInlineEdit] = createSignal<ProviderInlineEditState | null>(null)
  const [agentModelOptions, setAgentModelOptions] = createSignal<ModelOptionSet | null>(null)
  const [fetchModelCandidates, setFetchModelCandidates] = createSignal<ProviderModelConfig[]>([])
  const [modelDefaultsDraft, setModelDefaultsDraft] = createSignal<ProviderModelConfigDefaults | null>(null)
  const [providerRuntimeStatuses, setProviderRuntimeStatuses] = createSignal<Record<string, ProviderRuntimeStatus>>({})
  const [runtimeAbort, setRuntimeAbort] = createSignal<AbortController | null>(null)
  let statusLineTimer: ReturnType<typeof setTimeout> | null = null

  async function reload(shell?: PageShellState) {
    const next = await loadProviderManagerData(root, builtinAgents)
    setData(shell ? replaceShell(next, shell) : next)
  }

  function setShell(shell: PageShellState) {
    const currentData = data()
    if (!currentData) return
    setData(replaceShell(currentData, shell))
    scheduleStatusLineClear(shell.statusLine?.expiresAt)
  }

  function scheduleStatusLineClear(expiresAt: number | undefined) {
    if (statusLineTimer) clearTimeout(statusLineTimer)
    statusLineTimer = null
    if (expiresAt === undefined) return
    statusLineTimer = setTimeout(() => {
      const currentData = data()
      if (!currentData || currentData.shell.statusLine?.expiresAt !== expiresAt) return
      setData(replaceShell(currentData, { ...currentData.shell, statusLine: null }))
      statusLineTimer = null
    }, Math.max(0, expiresAt - Date.now()))
  }

  function lockModal(modalState: NonNullable<PageShellState['modalState']>) {
    const currentData = data()
    if (!currentData) return
    setData(replaceShell(currentData, openShellModal(currentData.shell, modalState)))
  }

  function unlockModal() {
    const currentData = data()
    if (!currentData) return
    setData(replaceShell(currentData, closeShellModal(currentData.shell)))
  }

  function startRuntimeTask(): AbortController {
    runtimeAbort()?.abort()
    const controller = new AbortController()
    setRuntimeAbort(controller)
    return controller
  }

  function finishRuntimeTask(controller: AbortController) {
    if (runtimeAbort() === controller) setRuntimeAbort(null)
  }

  async function openProviderManager() {
    await reload()
    setProviderDraft(null)
    setProviderInlineEdit(null)
    api.route?.navigate(PROVIDER_MANAGER_ROUTE)
  }

  function updateShell(mutator: (current: PageShellState, currentData: ProviderManagerData) => PageShellState) {
    const currentData = data()
    if (!currentData) return
    setData(replaceShell(currentData, mutator(currentData.shell, currentData)))
  }

  function warnUnavailable(action: ProviderAction, currentData = data()): boolean {
    if (!currentData) return true
    const message = providerUnavailableActionMessage(action, {
      hasProvider: currentData.providers.length > 0,
      hasDraft: Boolean(providerDraft())
    })
    if (!message) return false
    setShell(statusShell(currentData.shell, message, 'warn'))
    return true
  }

  function startAddProvider() {
    setProviderDraft(emptyProviderDraft())
    setProviderEditField('name')
    setProviderInlineEdit(null)
    updateShell((shell) => ({ ...shell, activePage: 'provider', sidebarCursorPage: 'provider', focusRegion: 'content', statusLine: null }))
  }

  function startEditProvider() {
    const currentData = data()
    if (!currentData) return
    const selected = currentData.shell.pageStates.provider.selectedIndex
    const provider = currentData.providers[selected]
    if (!provider) {
      warnUnavailable('edit', currentData)
      return
    }
    setProviderDraft(draftFromProvider(provider))
    setProviderEditField('name')
    setProviderInlineEdit(null)
    updateShell((shell) => ({ ...shell, activePage: 'provider', sidebarCursorPage: 'provider', focusRegion: 'content', statusLine: null }))
  }

  function moveProviderEditField(delta: -1 | 1) {
    const current = PROVIDER_EDIT_FIELDS.indexOf(providerEditField())
    const next = Math.max(0, Math.min(PROVIDER_EDIT_FIELDS.length - 1, current + delta))
    setProviderEditField(PROVIDER_EDIT_FIELDS[next] ?? providerEditField())
  }

  function editProviderTextField(field: 'name' | 'baseUrl' | 'apiKey') {
    const draft = providerDraft()
    if (!draft) return
    setProviderEditField(field)
    setProviderInlineEdit({ field, value: draft[field] })
  }

  function inputProviderTextValue(value: string) {
    const inline = providerInlineEdit()
    if (!inline) return
    setProviderInlineEdit({ ...inline, value: value.replace(/[\r\n]/g, '') })
  }

  function confirmProviderText() {
    const draft = providerDraft()
    const inline = providerInlineEdit()
    if (!draft || !inline) return
    setProviderDraft({ ...draft, [inline.field]: inline.value.trim(), validationErrors: [], dirtyFields: new Set([...draft.dirtyFields, inline.field]) })
    setProviderInlineEdit(null)
  }

  function cancelProviderText() {
    setProviderInlineEdit(null)
  }

  async function pasteProviderText() {
    const inline = providerInlineEdit()
    if (!inline) return
    try {
      const value = (await readClipboardText()).replace(/[\r\n]/g, '')
      if (!value) return
      setProviderInlineEdit({ ...inline, value: `${inline.value}${value}` })
    } catch (error) {
      const currentData = data()
      if (!currentData) return
      setShell(statusShell(currentData.shell, `Clipboard paste failed: ${error instanceof Error ? error.message : String(error)}`, 'warn'))
    }
  }

  async function fetchProviderModels() {
    const draft = providerDraft()
    if (!draft) {
      warnUnavailable('fetch-models')
      return
    }
    if (!draft.baseUrl || !draft.apiKey || !draft.apiType) {
      setProviderDraft({
        ...draft,
        validationErrors: [{ code: 'provider.fetchModels.missingInput', message: 'baseUrl, apiKey and apiType are required before fetching models', severity: 'error' }]
      })
      return
    }
    const currentData = data()
    if (!currentData) return
    const controller = startRuntimeTask()
    setFetchModelCandidates([])
    setData(replaceShell(currentData, openShellModal(currentData.shell, { kind: 'fetch-models', phase: 'loading', selectedIndex: 0, selectedModelIds: new Set() })))
    const result = await fetchProviderModelsFromRemote(draft, undefined, controller.signal)
    finishRuntimeTask(controller)
    const latestData = data()
    if (!latestData) return
    if (controller.signal.aborted) {
      setData(replaceShell(latestData, openShellModal(latestData.shell, { kind: 'fetch-models', phase: 'failure', selectedIndex: 0, selectedModelIds: new Set(), message: 'Fetch models cancelled' })))
      setShell(statusShell(latestData.shell, 'Fetch models cancelled', 'warn'))
      return
    }
    if (!result.ok) {
      setProviderDraft({
        ...draft,
        validationErrors: [{ code: 'provider.fetchModels.failed', message: result.message, severity: 'error' }]
      })
      setData(replaceShell(latestData, openShellModal(latestData.shell, { kind: 'fetch-models', phase: 'failure', selectedIndex: 0, selectedModelIds: new Set(), message: result.message })))
      return
    }
    setFetchModelCandidates(result.models)
    const existingModelIds = new Set(draft.models.map((model) => model.id))
    const selectedModelIds = new Set(result.models.filter((model) => existingModelIds.has(model.id)).map((model) => model.id))
    setData(replaceShell(latestData, openShellModal(latestData.shell, { kind: 'fetch-models', phase: 'success', selectedIndex: 0, selectedModelIds })))
  }

  async function editModelDefaults() {
    const draft = providerDraft()
    if (!draft) {
      warnUnavailable('model-defaults')
      return
    }
    setModelDefaultsDraft({ ...draft.modelConfigDefaults, inputTypes: [...draft.modelConfigDefaults.inputTypes], reasoningEfforts: [...draft.modelConfigDefaults.reasoningEfforts] })
    lockModal({ kind: 'model-config-defaults', selectedField: 'contextWindow' })
  }

  function moveModelDefaultsField(delta: -1 | 1) {
    const currentData = data()
    const modal = currentData?.shell.modalState
    if (!currentData || modal?.kind !== 'model-config-defaults') return
    const current = MODEL_DEFAULT_FIELDS.indexOf(modal.selectedField as typeof MODEL_DEFAULT_FIELDS[number])
    const selectedField = MODEL_DEFAULT_FIELDS[Math.max(0, Math.min(MODEL_DEFAULT_FIELDS.length - 1, current + delta))] ?? modal.selectedField
    setData(replaceShell(currentData, openShellModal(currentData.shell, { kind: 'model-config-defaults', selectedField })))
  }

  async function editSelectedModelDefaultField() {
    const currentData = data()
    const modal = currentData?.shell.modalState
    const defaults = modelDefaultsDraft()
    if (!currentData || modal?.kind !== 'model-config-defaults' || !defaults) return
    if (modal.selectedField !== 'contextWindow' && modal.selectedField !== 'maxOutput') return
    const next = await promptValue(api, modal.selectedField === 'contextWindow' ? 'Context Window Size' : 'Max Output Size', defaults[modal.selectedField])
    if (next === null) return
    setModelDefaultsDraft({ ...defaults, [modal.selectedField]: next })
  }

  function toggleSelectedModelDefaultField() {
    const modal = data()?.shell.modalState
    const defaults = modelDefaultsDraft()
    if (modal?.kind !== 'model-config-defaults' || !defaults) return
    if (modal.selectedField === 'inputTypes') {
      setModelDefaultsDraft({ ...defaults, inputTypes: defaults.inputTypes.includes('image') ? ['text'] : ['text', 'image'] })
      return
    }
    if (['minimal', 'low', 'medium', 'high', 'xhigh'].includes(modal.selectedField)) {
      const effort = modal.selectedField as ProviderModelConfigDefaults['reasoningEfforts'][number]
      const reasoningEfforts = defaults.reasoningEfforts.includes(effort)
        ? defaults.reasoningEfforts.filter((item) => item !== effort)
        : [...defaults.reasoningEfforts, effort]
      setModelDefaultsDraft({ ...defaults, reasoningEfforts })
    }
  }

  function saveModelDefaultsDraft() {
    const draft = providerDraft()
    const defaults = modelDefaultsDraft()
    const currentData = data()
    if (!draft || !defaults || !currentData) return
    setProviderDraft({
      ...draft,
      modelConfigDefaults: defaults,
      validationErrors: []
    })
    setModelDefaultsDraft(null)
    setData(replaceShell(currentData, closeShellModal(currentData.shell)))
  }

  function openModelList() {
    const currentData = data()
    const draft = providerDraft()
    if (!currentData || !draft) return
    const selectedIndex = Math.max(0, Math.min(draft.models.length - 1, 0))
    setData(replaceShell(currentData, openShellModal(currentData.shell, { kind: 'model-list', selectedIndex, selectedModelIds: new Set(draft.models.map((model) => model.id)) })))
  }

  function updateModelListModal(mutator: (modal: Extract<NonNullable<PageShellState['modalState']>, { kind: 'model-list' }>, draft: ProviderEditDraft) => Extract<NonNullable<PageShellState['modalState']>, { kind: 'model-list' }> | null) {
    const currentData = data()
    const draft = providerDraft()
    const modal = currentData?.shell.modalState
    if (!currentData || !draft || modal?.kind !== 'model-list') return
    const next = mutator(modal, draft)
    setData(replaceShell(currentData, next ? openShellModal(currentData.shell, next) : closeShellModal(currentData.shell)))
  }

  function moveModelListSelection(delta: -1 | 1) {
    updateModelListModal((modal, draft) => {
      if (modal.editing || draft.models.length < 1) return modal
      return { ...modal, selectedIndex: Math.max(0, Math.min(draft.models.length - 1, modal.selectedIndex + delta)) }
    })
  }

  function startAddModel() {
    updateModelListModal((modal) => ({ ...modal, editing: { mode: 'add', value: '' } }))
  }

  function toggleSelectedModel() {
    updateModelListModal((modal, draft) => {
      if (modal.editing) return modal
      const model = draft.models[modal.selectedIndex]
      if (!model) return modal
      const selectedModelIds = new Set(modal.selectedModelIds)
      if (selectedModelIds.has(model.id)) selectedModelIds.delete(model.id)
      else selectedModelIds.add(model.id)
      return { ...modal, selectedModelIds }
    })
  }

  function startEditModel() {
    updateModelListModal((modal, draft) => {
      const model = draft.models[modal.selectedIndex]
      if (!model) return { ...modal, editing: { mode: 'add', value: '' } }
      return { ...modal, editing: { mode: 'edit', value: model.id } }
    })
  }

  function inputModelId(value: string) {
    updateModelListModal((modal) => modal.editing ? { ...modal, editing: { ...modal.editing, value: value.replace(/[\r\n]/g, '') } } : modal)
  }

  function confirmModelId() {
    const draft = providerDraft()
    const currentData = data()
    const modal = currentData?.shell.modalState
    if (!draft || !currentData || modal?.kind !== 'model-list' || !modal.editing) return
    const id = modal.editing.value.trim()
    if (!id) return
    const nextModels = [...draft.models]
    if (modal.editing.mode === 'add') {
      if (!nextModels.some((model) => model.id === id)) nextModels.push({ id, ...draft.modelConfigDefaults })
      const selectedModelIds = new Set(modal.selectedModelIds)
      selectedModelIds.add(id)
      setProviderDraft({ ...draft, models: nextModels, validationErrors: [], dirtyFields: new Set([...draft.dirtyFields, 'models']) })
      setData(replaceShell(currentData, openShellModal(currentData.shell, { kind: 'model-list', selectedIndex: nextModels.length - 1, selectedModelIds })))
      return
    }
    const current = nextModels[modal.selectedIndex]
    if (!current) return
    nextModels[modal.selectedIndex] = { ...current, id }
    const selectedModelIds = new Set(modal.selectedModelIds)
    selectedModelIds.delete(current.id)
    selectedModelIds.add(id)
    setProviderDraft({ ...draft, models: nextModels, validationErrors: [], dirtyFields: new Set([...draft.dirtyFields, 'models']) })
    setData(replaceShell(currentData, openShellModal(currentData.shell, { kind: 'model-list', selectedIndex: modal.selectedIndex, selectedModelIds })))
  }

  function cancelModelIdEdit() {
    updateModelListModal((modal) => ({ ...modal, editing: undefined }))
  }

  function saveModelListSelection() {
    const draft = providerDraft()
    const currentData = data()
    const modal = currentData?.shell.modalState
    if (!draft || !currentData || modal?.kind !== 'model-list' || modal.editing) return
    const nextModels = draft.models.filter((model) => modal.selectedModelIds.has(model.id))
    setProviderDraft({ ...draft, models: nextModels, validationErrors: [], dirtyFields: new Set([...draft.dirtyFields, 'models']) })
    setData(replaceShell(currentData, closeShellModal(currentData.shell)))
  }

  async function chooseProviderProtocol() {
    const draft = providerDraft()
    if (!draft) return
    const next = await selectValue(api, 'Provider protocol', PROVIDER_API_TYPES.map((value) => ({ title: value, value })), () => lockModal({ kind: 'protocol-select', selectedIndex: PROVIDER_API_TYPES.indexOf(draft.apiType) }), unlockModal)
    if (!next) return
    setProviderDraft({ ...draft, apiType: next, defaultModel: null, models: [], validationErrors: [], protocolChanged: true, dirtyFields: new Set([...draft.dirtyFields, 'apiType']) })
  }

  async function saveProviderDraftFromPage() {
    const currentData = data()
    const draft = providerDraft()
    if (!currentData) return
    if (!draft) {
      warnUnavailable('save', currentData)
      return
    }
    try {
      const next = await handleProviderSaveAction(root, currentData, draft, builtinAgents)
      setProviderDraft(null)
      setProviderInlineEdit(null)
      setData(next)
    } catch (error) {
      const validationErrors = error instanceof ProviderDraftValidationError ? error.issues : [{
        code: 'provider.save.failed',
        message: error instanceof Error ? error.message : String(error),
        severity: 'error' as const
      }]
      setProviderDraft({
        ...draft,
        validationErrors
      })
      api.ui?.toast?.({ variant: 'error', title: 'Provider Manager', message: error instanceof Error ? error.message : String(error), duration: 5000 })
    }
  }

  async function editCurrentProviderField() {
    const field = providerEditField()
    if (providerInlineEdit()) return
    if (field === 'apiType') return chooseProviderProtocol()
    if (field === 'models') return openModelList()
    if (field === 'name' || field === 'baseUrl' || field === 'apiKey') return editProviderTextField(field)
  }

  async function leaveProviderDraft() {
    const draft = providerDraft()
    if (!draft) return
    if (providerInlineEdit()) {
      cancelProviderText()
      return
    }
    if (draft.dirtyFields.size < 1) {
      setProviderDraft(null)
      return
    }
    const confirmed = await selectValue(api, 'Discard unsaved provider changes?', [
      { title: 'Discard changes', value: true },
      { title: 'Keep editing', value: false }
    ], () => lockModal({ kind: 'leave-confirm', target: 'provider-edit' }), unlockModal)
    if (confirmed) setProviderDraft(null)
  }

  async function setSelectedProviderDefault() {
    const currentData = data()
    if (!currentData || providerDraft() || currentData.shell.activePage !== 'provider') return
    const selected = currentData.shell.pageStates.provider.selectedIndex
    const provider = currentData.providers[selected]
    if (!provider) {
      warnUnavailable('default', currentData)
      return
    }
    if (provider.isDefault) {
      setShell(statusShell(currentData.shell, 'Selected provider is already default', 'warn'))
      return
    }
    await setDefaultProvider(root, provider.name)
    const refreshed = await loadProviderManagerData(root, builtinAgents)
    setData(replaceShell(refreshed, {
      ...currentData.shell,
      pageStates: {
        ...currentData.shell.pageStates,
        provider: { ...currentData.shell.pageStates.provider, selectedIndex: 0 }
      },
      statusLine: { message: `${provider.name} set as default provider`, level: 'info' }
    }))
  }

  async function deleteSelectedProvider() {
    const currentData = data()
    if (!currentData || providerDraft() || currentData.shell.activePage !== 'provider') return
    const selected = currentData.shell.pageStates.provider.selectedIndex
    const provider = currentData.providers[selected]
    if (!provider) {
      warnUnavailable('delete', currentData)
      return
    }
    const confirmed = await selectValue(api, `Delete provider ${provider.name}?`, [
      { title: 'Delete provider', value: true },
      { title: 'Cancel', value: false }
    ], () => lockModal({ kind: 'provider-delete-confirm', providerName: provider.name, isDefault: provider.isDefault }), unlockModal)
    if (!confirmed) return
    if (provider.isDefault) {
      setShell(statusShell(currentData.shell, 'Switch default provider before deleting this provider', 'warn'))
      return
    }
    try {
      await deleteProvider(root, provider.name)
      const refreshed = await loadProviderManagerData(root, builtinAgents)
      const nextIndex = Math.max(0, Math.min(refreshed.providers.length - 1, selected))
      setData(replaceShell(refreshed, {
        ...currentData.shell,
        pageStates: {
          ...currentData.shell.pageStates,
          provider: { ...currentData.shell.pageStates.provider, selectedIndex: nextIndex }
        },
        statusLine: { message: `${provider.name} deleted`, level: 'info' }
      }))
    } catch (error) {
      setShell(statusShell(currentData.shell, error instanceof Error ? error.message : String(error), 'error'))
    }
  }

  async function testSelectedProvider() {
    const currentData = data()
    if (!currentData || providerDraft() || currentData.shell.activePage !== 'provider') return
    const selected = currentData.shell.pageStates.provider.selectedIndex
    const provider = currentData.providers[selected]
    if (!provider) {
      warnUnavailable('test', currentData)
      return
    }
    setProviderRuntimeStatuses(({ [provider.name]: _removed, ...rest }) => rest)
    const controller = startRuntimeTask()
    setData(replaceShell(currentData, openShellModal(currentData.shell, { kind: 'provider-test', providerName: provider.name, phase: 'testing' })))
    const result = await testProviderConnection(provider, undefined, controller.signal)
    finishRuntimeTask(controller)
    const latestData = data()
    if (!latestData) return
    if (controller.signal.aborted) {
      setProviderRuntimeStatuses((current) => ({ ...current, [provider.name]: 'cancelled' }))
      const shell = latestData.shell.modalState?.kind === 'provider-test'
        ? openShellModal(latestData.shell, { kind: 'provider-test', providerName: provider.name, phase: 'cancelled' })
        : statusShell(latestData.shell, `${provider.name} test cancelled`, 'warn')
      setData(replaceShell(latestData, shell))
      return
    }
    setData(replaceShell(latestData, openShellModal(latestData.shell, { kind: 'provider-test', providerName: provider.name, phase: result.ok ? 'success' : 'failure' })))
    setShell(statusShell(latestData.shell, result.ok ? `${provider.name} test completed` : result.message, result.ok ? 'info' : 'error'))
  }

  function closeNonAgentModal() {
    const currentData = data()
    if (!currentData || currentData.shell.modalState?.kind === 'agent-model-picker') return
    runtimeAbort()?.abort()
    setRuntimeAbort(null)
    if (currentData.shell.modalState?.kind === 'fetch-models') setFetchModelCandidates([])
    if (currentData.shell.modalState?.kind === 'model-config-defaults') setModelDefaultsDraft(null)
    if (currentData.shell.modalState?.kind === 'provider-test' && currentData.shell.modalState.phase === 'testing') {
      const providerName = currentData.shell.modalState.providerName
      setProviderRuntimeStatuses((current) => ({ ...current, [providerName]: 'cancelled' }))
    }
    setData(replaceShell(currentData, closeShellModal(currentData.shell)))
  }

  function updateFetchModelsModal(mutator: (modal: Extract<NonNullable<PageShellState['modalState']>, { kind: 'fetch-models' }>, models: ProviderModelConfig[]) => Extract<NonNullable<PageShellState['modalState']>, { kind: 'fetch-models' }>) {
    const currentData = data()
    const modal = currentData?.shell.modalState
    if (!currentData || modal?.kind !== 'fetch-models') return
    setData(replaceShell(currentData, openShellModal(currentData.shell, mutator(modal, fetchModelCandidates()))))
  }

  function confirmFetchModelsModal() {
    const currentData = data()
    const draft = providerDraft()
    const modal = currentData?.shell.modalState
    if (!currentData || !draft || modal?.kind !== 'fetch-models') return
    if (modal.phase !== 'success') return closeNonAgentModal()
    setProviderDraft(applyFetchedModelSelection(draft, fetchModelCandidates(), modal.selectedModelIds))
    setFetchModelCandidates([])
    setData(replaceShell(currentData, closeShellModal(currentData.shell)))
  }

  async function configureSelectedAgent() {
    const currentData = data()
    if (!currentData) return
    const selected = currentData.shell.pageStates.agents.selectedIndex
    const agent = currentData.agents[selected]
    if (!agent) return
    const options = buildModelOptionSet(currentData.providers)
    setAgentModelOptions(options)
    lockModal({ kind: 'agent-model-picker', draft: createAgentModelDraft(agent.name, options) })
  }

  function startAgentBulkProviderSwitch() {
    const currentData = data()
    if (!currentData || currentData.shell.activePage !== 'agents' || currentData.agents.length < 1) return
    const agent = currentData.agents[currentData.shell.pageStates.agents.selectedIndex]
    const selectedAgentNames = new Set(agent ? [agent.name] : [])
    setShell({
      ...currentData.shell,
      agentBulkEdit: { enabled: true, selectedAgentNames },
      statusLine: null
    })
  }

  function toggleCurrentAgentSelection() {
    const currentData = data()
    const bulkEdit = currentData?.shell.agentBulkEdit
    if (!currentData || !bulkEdit?.enabled) return
    const agent = currentData.agents[currentData.shell.pageStates.agents.selectedIndex]
    if (!agent) return
    const selectedAgentNames = new Set(bulkEdit.selectedAgentNames)
    if (selectedAgentNames.has(agent.name)) selectedAgentNames.delete(agent.name)
    else selectedAgentNames.add(agent.name)
    setShell({ ...currentData.shell, agentBulkEdit: { enabled: true, selectedAgentNames } })
  }

  function selectAllAgentsForBulkSwitch() {
    const currentData = data()
    const bulkEdit = currentData?.shell.agentBulkEdit
    if (!currentData || !bulkEdit?.enabled) return
    setShell({ ...currentData.shell, agentBulkEdit: { enabled: true, selectedAgentNames: new Set(currentData.agents.map((agent) => agent.name)) } })
  }

  function cancelAgentBulkProviderSwitch() {
    const currentData = data()
    if (!currentData) return
    setShell({ ...currentData.shell, agentBulkEdit: { enabled: false, selectedAgentNames: new Set() } })
  }

  function openAgentProviderSwitchModal() {
    const currentData = data()
    const bulkEdit = currentData?.shell.agentBulkEdit
    if (!currentData || !bulkEdit?.enabled) return
    if (bulkEdit.selectedAgentNames.size < 1) {
      setShell(statusShell(currentData.shell, 'Select at least one agent', 'warn'))
      return
    }
    const providerNames = availableProvidersForAgents(currentData.agents, currentData.providers, bulkEdit.selectedAgentNames)
    const agentNames = [...bulkEdit.selectedAgentNames]
    setData(replaceShell(currentData, openShellModal(currentData.shell, {
      kind: 'agent-provider-switch',
      selectedIndex: 0,
      providerNames,
      agentNames,
      message: providerNames.length ? undefined : 'No provider can cover selected agent models.'
    })))
  }

  function moveAgentProviderSwitchSelection(delta: -1 | 1) {
    const currentData = data()
    const modal = currentData?.shell.modalState
    if (!currentData || modal?.kind !== 'agent-provider-switch' || modal.providerNames.length < 1) return
    const selectedIndex = Math.max(0, Math.min(modal.providerNames.length - 1, modal.selectedIndex + delta))
    setData(replaceShell(currentData, openShellModal(currentData.shell, { ...modal, selectedIndex })))
  }

  async function confirmAgentProviderSwitch() {
    const currentData = data()
    const modal = currentData?.shell.modalState
    if (!currentData || modal?.kind !== 'agent-provider-switch') return
    const providerName = modal.providerNames[modal.selectedIndex]
    if (!providerName) {
      setData(replaceShell(currentData, closeShellModal(currentData.shell)))
      return
    }
    const next = await handleAgentProviderSwitchAction(root, currentData, new Set(modal.agentNames), providerName, builtinAgents)
    setData(replaceShell(next, closeShellModal(next.shell)))
  }

  function currentAgentDraft(): AgentModelDraft | null {
    const modal = data()?.shell.modalState
    return modal?.kind === 'agent-model-picker' ? modal.draft : null
  }

  function updateAgentDraft(mutator: (draft: AgentModelDraft, options: ModelOptionSet) => AgentModelDraft | null) {
    const currentData = data()
    const options = agentModelOptions()
    const draft = currentAgentDraft()
    if (!currentData || !options || !draft) return
    const nextDraft = mutator(draft, options)
    const shell = nextDraft
      ? openShellModal(currentData.shell, { kind: 'agent-model-picker', draft: nextDraft })
      : closeShellModal(currentData.shell)
    if (!nextDraft) setAgentModelOptions(null)
    setData(replaceShell(currentData, shell))
  }

  async function confirmAgentDraft() {
    const currentData = data()
    const options = agentModelOptions()
    const draft = currentAgentDraft()
    if (!currentData || !options || !draft) return
    const nextDraft = confirmAgentModelStep(draft, options)
    const complete = Boolean(nextDraft.provider && nextDraft.model && (nextDraft.step === 'select-model' || nextDraft.reasoningEffort !== null))
    if (!complete) {
      setData(replaceShell(currentData, openShellModal(currentData.shell, { kind: 'agent-model-picker', draft: nextDraft })))
      return
    }
    const next = await handleAgentModelConfirmAction(root, currentData, nextDraft, builtinAgents)
    setAgentModelOptions(null)
    setData(replaceShell(next, closeShellModal(next.shell)))
  }

  api.route?.register([{ name: PROVIDER_MANAGER_ROUTE, render: () => <ProviderManagerRoute data={data} providerDraft={providerDraft} providerEditField={providerEditField} providerInlineEdit={providerInlineEdit} fetchModelCandidates={fetchModelCandidates} modelDefaultsDraft={modelDefaultsDraft} providerRuntimeStatuses={providerRuntimeStatuses} onProviderInput={inputProviderTextValue} onProviderSubmit={confirmProviderText} onModelInput={inputModelId} onModelSubmit={confirmModelId} /> }])

  api.keymap?.registerLayer({
    commands: [{
      name: 'provider-manager.open',
      title: 'Provider Manager',
      desc: 'Inspect configured providers and agent models',
      description: 'Inspect configured providers and agent models',
      namespace: 'palette',
      category: 'Provider',
      slashName: 'provider',
      slashAliases: ['providers'],
      run: async () => {
        api.ui?.dialog?.clear?.()
        await openProviderManager()
      }
    }],
    bindings: []
  })

  api.keymap?.registerLayer({
    enabled: () => api.route?.current?.name === PROVIDER_MANAGER_ROUTE && data()?.shell.focusRegion !== 'modal' && !providerInlineEdit(),
    commands: [
      { name: 'provider-manager.up', title: 'Move up', category: 'Provider', run: () => {
        if (providerDraft()) return moveProviderEditField(-1)
        updateShell((shell, currentData) => shell.focusRegion === 'sidebar' ? moveSidebarCursor(shell, -1) : moveContent(shell, currentData, -1))
      } },
      { name: 'provider-manager.down', title: 'Move down', category: 'Provider', run: () => {
        if (providerDraft()) return moveProviderEditField(1)
        updateShell((shell, currentData) => shell.focusRegion === 'sidebar' ? moveSidebarCursor(shell, 1) : moveContent(shell, currentData, 1))
      } },
      { name: 'provider-manager.enter', title: 'Confirm', category: 'Provider', run: () => {
        const currentData = data()
        if (!currentData) return
        if (providerDraft()) return void editCurrentProviderField()
        if (currentData.shell.focusRegion === 'sidebar') updateShell((shell) => activateSidebarPage(shell))
        else if (currentData.shell.activePage === 'provider') startEditProvider()
        else if (currentData.shell.activePage === 'agents' && currentData.shell.agentBulkEdit?.enabled) openAgentProviderSwitchModal()
        else if (currentData.shell.activePage === 'agents') void configureSelectedAgent()
      } },
      { name: 'provider-manager.escape', title: 'Back to sidebar', category: 'Provider', run: () => {
        if (providerDraft()) return void leaveProviderDraft()
        const currentData = data()
        if (!currentData) return
        if (currentData.shell.agentBulkEdit?.enabled) return cancelAgentBulkProviderSwitch()
        if (currentData.shell.focusRegion === 'sidebar') api.route?.navigate('home')
        else updateShell((shell) => returnToSidebar(shell))
      } },
      { name: 'provider-manager.add', title: 'Add provider', desc: 'Add a provider to providers.json/auth.json', category: 'Provider', run: () => {
        const currentData = data()
        if (currentData?.shell.activePage === 'agents' && currentData.shell.agentBulkEdit?.enabled) return selectAllAgentsForBulkSwitch()
        startAddProvider()
      } },
      { name: 'provider-manager.edit-name', title: 'Edit provider name', category: 'Provider', run: () => editProviderTextField('name') },
      { name: 'provider-manager.edit-url', title: 'Edit provider base URL', category: 'Provider', run: () => editProviderTextField('baseUrl') },
      { name: 'provider-manager.edit-key', title: 'Edit provider API key', category: 'Provider', run: () => editProviderTextField('apiKey') },
      { name: 'provider-manager.protocol', title: 'Select provider protocol', category: 'Provider', run: () => chooseProviderProtocol() },
      { name: 'provider-manager.fetch-models', title: 'Fetch provider models', category: 'Provider', run: () => fetchProviderModels() },
      { name: 'provider-manager.model-defaults', title: 'Edit model defaults', category: 'Provider', run: () => editModelDefaults() },
      { name: 'provider-manager.save', title: 'Save provider draft', category: 'Provider', run: () => saveProviderDraftFromPage() },
      { name: 'provider-manager.agent-bulk.start', title: 'Start bulk provider switch', category: 'Provider', run: () => startAgentBulkProviderSwitch() },
      { name: 'provider-manager.agent-bulk.toggle', title: 'Toggle selected agent', category: 'Provider', run: () => toggleCurrentAgentSelection() },
      { name: 'provider-manager.agent-bulk.all', title: 'Select all agents', category: 'Provider', run: () => selectAllAgentsForBulkSwitch() },
      { name: 'provider-manager.agent-bulk.confirm', title: 'Choose provider for selected agents', category: 'Provider', run: () => openAgentProviderSwitchModal() },
      { name: 'provider-manager.delete', title: 'Delete provider', category: 'Provider', run: () => deleteSelectedProvider() },
      { name: 'provider-manager.test', title: 'Test provider', category: 'Provider', run: () => testSelectedProvider() },
      { name: 'provider-manager.default', title: 'Set default provider', category: 'Provider', run: () => setSelectedProviderDefault() },
      { name: 'provider-manager.refresh', title: 'Refresh providers', desc: 'Reload provider manager config', category: 'Provider', run: () => reload(data()?.shell) }
    ],
    bindings: [
      { key: 'up', cmd: 'provider-manager.up', desc: 'Move up' },
      { key: 'down', cmd: 'provider-manager.down', desc: 'Move down' },
      { key: 'enter', cmd: 'provider-manager.enter', desc: 'Confirm' },
      { key: 'return', cmd: 'provider-manager.enter', desc: 'Confirm' },
      { key: 'escape', cmd: 'provider-manager.escape', desc: 'Back to sidebar' },
      { key: 'a', cmd: 'provider-manager.add', desc: 'Add provider' },
      { key: 'n', cmd: 'provider-manager.edit-name', desc: 'Edit name' },
      { key: 'u', cmd: 'provider-manager.edit-url', desc: 'Edit URL' },
      { key: 'k', cmd: 'provider-manager.edit-key', desc: 'Edit API key' },
      { key: 'p', cmd: 'provider-manager.protocol', desc: 'Select protocol' },
      { key: 'f', cmd: 'provider-manager.fetch-models', desc: 'Fetch models' },
      { key: 'e', cmd: 'provider-manager.model-defaults', desc: 'Edit model defaults' },
      { key: 'ctrl+e', cmd: 'provider-manager.agent-bulk.start', desc: 'Bulk switch agent provider' },
      { key: 'space', cmd: 'provider-manager.agent-bulk.toggle', desc: 'Toggle agent' },
      { key: 'ctrl+s', cmd: 'provider-manager.save', desc: 'Save provider' },
      { key: 'd', cmd: 'provider-manager.delete', desc: 'Delete provider' },
      { key: 't', cmd: 'provider-manager.test', desc: 'Test provider' },
      { key: 's', cmd: 'provider-manager.default', desc: 'Set default' },
      { key: 'r', cmd: 'provider-manager.refresh', desc: 'Refresh providers' }
    ]
  })

  api.keymap?.registerLayer({
    enabled: () => api.route?.current?.name === PROVIDER_MANAGER_ROUTE && Boolean(providerInlineEdit()),
    commands: [
      { name: 'provider-manager.provider-input.enter', title: 'Apply provider field text', category: 'Provider', run: () => confirmProviderText() },
      { name: 'provider-manager.provider-input.escape', title: 'Cancel provider field text', category: 'Provider', run: () => cancelProviderText() },
      { name: 'provider-manager.provider-input.paste', title: 'Paste provider field text', category: 'Provider', run: () => pasteProviderText() }
    ],
    bindings: [
      { key: 'enter', cmd: 'provider-manager.provider-input.enter', desc: 'Apply' },
      { key: 'return', cmd: 'provider-manager.provider-input.enter', desc: 'Apply' },
      { key: 'escape', cmd: 'provider-manager.provider-input.escape', desc: 'Cancel' },
      { key: 'ctrl+v', cmd: 'provider-manager.provider-input.paste', desc: 'Paste' }
    ]
  })

  api.keymap?.registerLayer({
    enabled: () => api.route?.current?.name === PROVIDER_MANAGER_ROUTE && data()?.shell.modalState?.kind === 'agent-model-picker',
    commands: [
      { name: 'provider-manager.agent-modal.up', title: 'Move agent option up', category: 'Provider', run: () => updateAgentDraft((draft) => moveAgentModelSelection(draft, -1)) },
      { name: 'provider-manager.agent-modal.down', title: 'Move agent option down', category: 'Provider', run: () => updateAgentDraft((draft) => moveAgentModelSelection(draft, 1)) },
      { name: 'provider-manager.agent-modal.enter', title: 'Confirm agent option', category: 'Provider', run: () => void confirmAgentDraft() },
      { name: 'provider-manager.agent-modal.escape', title: 'Back or cancel agent picker', category: 'Provider', run: () => updateAgentDraft((draft, options) => escapeAgentModelStep(draft, options)) },
      { name: 'provider-manager.agent-modal.backspace', title: 'Search backspace', category: 'Provider', run: () => updateAgentDraft((draft, options) => backspaceAgentModelSearch(draft, options)) },
      ...AGENT_SEARCH_CHARS.map((char, index) => ({
        name: agentSearchCommandName(index),
        title: `Search ${char}`,
        category: 'Provider',
        run: () => updateAgentDraft((draft, options) => inputAgentModelSearch(draft, char, options))
      }))
    ],
    bindings: [
      { key: 'up', cmd: 'provider-manager.agent-modal.up', desc: 'Move up' },
      { key: 'down', cmd: 'provider-manager.agent-modal.down', desc: 'Move down' },
      { key: 'enter', cmd: 'provider-manager.agent-modal.enter', desc: 'Select' },
      { key: 'return', cmd: 'provider-manager.agent-modal.enter', desc: 'Select' },
      { key: 'escape', cmd: 'provider-manager.agent-modal.escape', desc: 'Back' },
      { key: 'backspace', cmd: 'provider-manager.agent-modal.backspace', desc: 'Backspace' },
      ...AGENT_SEARCH_CHARS.map((char, index) => ({ key: char, cmd: agentSearchCommandName(index), desc: 'Search' }))
    ]
  })

  api.keymap?.registerLayer({
    enabled: () => api.route?.current?.name === PROVIDER_MANAGER_ROUTE && data()?.shell.modalState?.kind === 'model-list' && Boolean((data()?.shell.modalState as Extract<NonNullable<PageShellState['modalState']>, { kind: 'model-list' }> | undefined)?.editing),
    commands: [
      { name: 'provider-manager.model-input.escape', title: 'Cancel model id edit', category: 'Provider', run: () => cancelModelIdEdit() }
    ],
    bindings: [
      { key: 'escape', cmd: 'provider-manager.model-input.escape', desc: 'Cancel' }
    ]
  })

  api.keymap?.registerLayer({
    enabled: () => {
      const modal = data()?.shell.modalState
      return api.route?.current?.name === PROVIDER_MANAGER_ROUTE && Boolean(modal) && modal?.kind !== 'agent-model-picker' && !(modal?.kind === 'model-list' && modal.editing)
    },
    commands: [
      { name: 'provider-manager.modal.up', title: 'Move modal selection up', category: 'Provider', run: () => {
        if (data()?.shell.modalState?.kind === 'agent-provider-switch') return moveAgentProviderSwitchSelection(-1)
        if (data()?.shell.modalState?.kind === 'model-list') return moveModelListSelection(-1)
        if (data()?.shell.modalState?.kind === 'model-config-defaults') return moveModelDefaultsField(-1)
        updateFetchModelsModal((modal, models) => moveFetchModelSelection(modal, models.length, -1))
      } },
      { name: 'provider-manager.modal.down', title: 'Move modal selection down', category: 'Provider', run: () => {
        if (data()?.shell.modalState?.kind === 'agent-provider-switch') return moveAgentProviderSwitchSelection(1)
        if (data()?.shell.modalState?.kind === 'model-list') return moveModelListSelection(1)
        if (data()?.shell.modalState?.kind === 'model-config-defaults') return moveModelDefaultsField(1)
        updateFetchModelsModal((modal, models) => moveFetchModelSelection(modal, models.length, 1))
      } },
      { name: 'provider-manager.modal.toggle', title: 'Toggle model selection', category: 'Provider', run: () => {
        if (data()?.shell.modalState?.kind === 'model-list') return toggleSelectedModel()
        if (data()?.shell.modalState?.kind === 'model-config-defaults') return toggleSelectedModelDefaultField()
        updateFetchModelsModal((modal, models) => toggleFetchModelSelection(modal, models))
      } },
      { name: 'provider-manager.modal.all', title: 'Select all or add model', category: 'Provider', run: () => {
        if (data()?.shell.modalState?.kind === 'model-list') return startAddModel()
        updateFetchModelsModal((modal, models) => selectAllFetchedModels(modal, models))
      } },
      { name: 'provider-manager.modal.edit', title: 'Edit modal field', category: 'Provider', run: () => {
        if (data()?.shell.modalState?.kind === 'agent-provider-switch') return void confirmAgentProviderSwitch()
        if (data()?.shell.modalState?.kind === 'model-list') return startEditModel()
        if (data()?.shell.modalState?.kind === 'model-config-defaults') return void editSelectedModelDefaultField()
        confirmFetchModelsModal()
      } },
      { name: 'provider-manager.modal.save', title: 'Save modal', category: 'Provider', run: () => {
        if (data()?.shell.modalState?.kind === 'model-list') return saveModelListSelection()
        if (data()?.shell.modalState?.kind === 'model-config-defaults') return saveModelDefaultsDraft()
        confirmFetchModelsModal()
      } },
      { name: 'provider-manager.modal.close', title: 'Close modal', category: 'Provider', run: () => closeNonAgentModal() }
    ],
    bindings: [
      { key: 'up', cmd: 'provider-manager.modal.up', desc: 'Move up' },
      { key: 'down', cmd: 'provider-manager.modal.down', desc: 'Move down' },
      { key: 'space', cmd: 'provider-manager.modal.toggle', desc: 'Toggle' },
      { key: 'a', cmd: 'provider-manager.modal.all', desc: 'All' },
      { key: 'enter', cmd: 'provider-manager.modal.edit', desc: 'Edit' },
      { key: 'return', cmd: 'provider-manager.modal.edit', desc: 'Edit' },
      { key: 'ctrl+s', cmd: 'provider-manager.modal.save', desc: 'Save' },
      { key: 'escape', cmd: 'provider-manager.modal.close', desc: 'Close' }
    ]
  })
}

export default {
  id: 'provider-manager',
  tui
}
