import type { ProviderApiType, ProviderEditDraft } from '../types/provider.js'
import type { ValidationIssue } from '../types/tui.js'

const SUPPORTED_API_TYPES: ProviderApiType[] = [
  'openai-responses',
  'openai-chat',
  'openai-compatible-chat',
  'anthropic-messages',
  'gemini',
  'bedrock-converse'
]

function issue(field: string, code: string, message: string): ValidationIssue {
  return { field, code, message, severity: 'error' }
}

export function validateProviderDraft(draft: ProviderEditDraft, otherProviderNames: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (draft.name.trim() === '') issues.push(issue('name', 'provider.name.empty', 'Provider name is required'))
  if (otherProviderNames.some((name) => name.toLowerCase() === draft.name.toLowerCase())) {
    issues.push(issue('name', 'provider.name.duplicate', 'Provider name already exists'))
  }
  try {
    new URL(draft.baseUrl)
  } catch {
    issues.push(issue('baseUrl', 'provider.baseUrl.invalid', 'Base URL must be a valid URL'))
  }
  if (!SUPPORTED_API_TYPES.includes(draft.apiType)) {
    issues.push(issue('apiType', 'provider.apiType.unsupported', 'API type is not supported'))
  }
  if (draft.models.length > 0 && !draft.defaultModel) {
    issues.push(issue('defaultModel', 'provider.defaultModel.missing', 'Default model is required'))
  }
  if (draft.defaultModel && !draft.models.some((model) => model.id === draft.defaultModel)) {
    issues.push(issue('defaultModel', 'provider.defaultModel.notFound', 'Default model must exist in provider models'))
  }
  return issues
}
