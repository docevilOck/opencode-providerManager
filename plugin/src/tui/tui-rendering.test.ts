import { describe, expect, it } from 'vitest'
import { renderProviderRow } from './provider-row.js'
import { renderAgentRow } from './agent-row.js'
import { renderSidebar } from './page-sidebar.js'

describe('tui rendering', () => {
  it('renders provider row with selected and default markers', () => {
    const row = renderProviderRow({
      name: 'OpenAI', id: 'openai', displayName: 'OpenAI', baseUrl: '', apiType: 'openai-responses', modelCount: 12,
      defaultModel: 'gpt-5', isDefault: true, authStatus: 'ok', status: 'active', source: 'providers-json', models: [], createdOrder: 0
    }, true)
    expect(row).toContain('> * OpenAI')
    expect(row).toContain('models: 12')
    expect(row).toContain('auth: ok')
  })

  it('renders agent row with incomplete status', () => {
    const row = renderAgentRow({ name: 'plan', provider: null, model: null, reasoningEffort: null, status: 'incomplete', source: 'builtin', isBuiltin: true, displayOrder: 0 }, true)
    expect(row).toContain('> plan')
    expect(row).toContain('model: <not set>')
    expect(row).toContain('status: incomplete')
  })

  it('renders active page and sidebar cursor separately', () => {
    const sidebar = renderSidebar(['provider', 'agents'], 'provider', 'agents')
    expect(sidebar.some((line) => line.includes('* provider'))).toBe(true)
    expect(sidebar).toContain('>  agents')
  })
})
