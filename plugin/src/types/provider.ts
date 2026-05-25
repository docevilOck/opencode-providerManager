import type { ValidationIssue } from './tui.js'

export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'

export type ProviderApiType =
  | 'openai-responses'
  | 'openai-chat'
  | 'openai-compatible-chat'
  | 'anthropic-messages'
  | 'gemini'
  | 'bedrock-converse'

export type ProviderModelConfig = {
  id: string
  contextWindow: string
  maxOutput: string
  inputTypes: Array<'text' | 'image'>
  reasoningEfforts: ReasoningEffort[]
}

export type ProviderModelConfigDefaults = Omit<ProviderModelConfig, 'id'>

export type ManagedProviderSummary = {
  name: string
  id: string
  displayName: string
  baseUrl: string
  apiType: ProviderApiType
  modelCount: number
  defaultModel: string | null
  apiKey?: string | null
  isDefault: boolean
  authStatus: 'ok' | 'missing' | 'invalid'
  status: 'active' | 'ready' | 'warn' | 'error'
  source: 'providers-json' | 'plugin-json' | 'opencode-json'
  models: ProviderModelConfig[]
  createdOrder: number
}

export type ProviderEditField = 'name' | 'baseUrl' | 'apiType' | 'apiKey' | 'models' | 'defaultModel'

export type ProviderEditDraft = {
  originalName: string | null
  name: string
  baseUrl: string
  apiType: ProviderApiType
  apiKey: string
  defaultModel: string | null
  models: ProviderModelConfig[]
  modelConfigDefaults: ProviderModelConfigDefaults
  dirtyFields: Set<ProviderEditField>
  validationErrors: ValidationIssue[]
  protocolChanged: boolean
}

export type OpencodeConfigSnapshot = {
  providersJson: unknown
  authJson: unknown
  settingsJson: unknown
  pluginJson: unknown
  globalOpencodeJson: unknown
  globalOpencodeSource: 'json' | 'jsonc' | 'missing'
  builtinAgents: unknown[]
  loadedAt: number
}
