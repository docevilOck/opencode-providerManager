import { describe, expect, it } from 'vitest'
import { renderProviderRow } from './provider-row.js'
import { renderAgentRow } from './agent-row.js'
import { renderSidebar } from './page-sidebar.js'
import { renderProviderEditScreen } from './provider-edit-screen.js'
import type { ProviderEditDraft } from '../types/provider.js'

describe('tui rendering', () => {
  it('renders provider row with selected and default markers', () => {
    const row = renderProviderRow({
      name: 'OpenAI', id: 'openai', displayName: 'OpenAI', baseUrl: '', apiType: 'openai-responses', modelCount: 12,
      defaultModel: 'gpt-5', isDefault: true, authStatus: 'ok', status: 'active', source: 'providers-json', models: [], createdOrder: 0
    }, true)
    expect(row).toContain('> * OpenAI')
    expect(row).toContain('models 12')
    expect(row).toContain('active/ok')
  })

  it('truncates long provider names in provider rows', () => {
    const row = renderProviderRow({
      name: 'OpenAIProductionGatewayForEnterpriseTeam',
      id: 'openai',
      displayName: 'OpenAIProductionGatewayForEnterpriseTeam',
      baseUrl: '',
      apiType: 'openai-responses',
      modelCount: 12,
      defaultModel: 'gpt-5-enterprise-reasoning-preview-2026-05-25',
      isDefault: true,
      authStatus: 'ok',
      status: 'active',
      source: 'providers-json',
      models: [],
      createdOrder: 0
    }, true)
    expect(row).toContain('OpenAIProductionGatew...')
    expect(row).not.toContain('OpenAIProductionGatewayForEnterpriseTeam')
    expect(row).not.toContain('default:')
  })

  it('renders agent row with incomplete status', () => {
    const row = renderAgentRow({ name: 'plan', provider: null, model: null, reasoningEffort: null, status: 'incomplete', source: 'builtin', isBuiltin: true, displayOrder: 0 }, true)
    expect(row).toContain('> plan')
    expect(row).toContain('<not set>')
    expect(row).toContain('incomplete')
  })

  it('renders agent row with provider/model and bulk checkbox', () => {
    const row = renderAgentRow({ name: 'plan', provider: 'OpenAI', model: 'gpt-5', reasoningEffort: 'high', status: 'override', source: 'global', isBuiltin: true, displayOrder: 0 }, true, true)
    expect(row).toContain('> [x] plan')
    expect(row).toContain('OpenAI/gpt-5')
    expect(row).toContain('high')
  })

  it('renders active page and sidebar cursor separately', () => {
    const sidebar = renderSidebar(['provider', 'agents'], 'provider', 'agents')
    expect(sidebar.some((line) => line.includes('* provider'))).toBe(true)
    expect(sidebar).toContain('>   agents')
    expect(renderSidebar(['provider', 'agents'], 'provider', 'agents', false)).toEqual(['    provider', '>   agents'])
  })

  it('renders provider validation errors directly below their fields', () => {
    const lines = renderProviderEditScreen({
      originalName: 'OpenAI',
      name: 'OpenAI',
      baseUrl: 'bad-url',
      apiType: 'openai-responses',
      apiKey: 'secret',
      defaultModel: 'missing',
      models: [{ id: 'gpt-5', contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] }],
      modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] },
      dirtyFields: new Set(),
      validationErrors: [
        { field: 'baseUrl', code: 'provider.baseUrl.invalid', message: 'Base URL must be a valid URL', severity: 'error' },
      ],
      protocolChanged: false
    })
    expect(lines).toContain('  API Key       : ************')
    expect(lines[lines.indexOf('  Base URL      : bad-url') + 1]).toBe('  Base URL must be a valid URL')
    expect(lines.some((line) => line.includes('Default Model'))).toBe(false)
  })

  it('renders provider edit selection and inline input cursor', () => {
    const draft: ProviderEditDraft = {
      originalName: null,
      name: 'OpenAI',
      baseUrl: '',
      apiType: 'openai-compatible-chat' as const,
      apiKey: '',
      defaultModel: null,
      models: [],
      modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text' as const], reasoningEfforts: ['high' as const] },
      dirtyFields: new Set(),
      validationErrors: [],
      protocolChanged: false
    }
    expect(renderProviderEditScreen(draft, 'name')).toContain('Edit Provider  /  new')
    expect(renderProviderEditScreen(draft, 'name')).toContain('> Name          : OpenAI')
    expect(renderProviderEditScreen(draft, 'name', { field: 'name', value: 'OpenAI2' })).toContain('>> Name          : [OpenAI2|]')
  })
})
