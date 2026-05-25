import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import plugin, { providerUnavailableActionMessage, registerProviderManagerPlugin, renderProviderManagerModalLines, type ProviderManagerSession } from './index.js'

describe('provider command session', () => {
  it('exports a tui plugin object instead of a legacy server function', () => {
    expect(plugin).toMatchObject({ id: 'provider-manager' })
    expect(typeof plugin.tui).toBe('function')
  })

  it('registers a /provider slash command through the TUI keymap', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'opencode.json'), JSON.stringify({
      model: 'rayplus/gpt-5.4',
      provider: {
        rayplus: {
          options: { baseURL: 'https://rayplus.site/v1', apiKey: 'secret' },
          models: { 'gpt-5.4': { name: 'GPT-5.4' } }
        }
      }
    }))
    let command: { name?: string; slashName?: string; slashAliases?: string[]; run: () => Promise<void> | void } | undefined
    let routeRender: (() => unknown) | undefined
    let routeName = ''

    await plugin.tui({
      route: {
        register: (routes) => {
          routeRender = routes[0]?.render as (() => unknown) | undefined
          return () => {}
        },
        navigate: (name, params) => {
          routeName = name
        }
      },
      keymap: {
        registerLayer: (layer) => {
          command = layer.commands.find((item) => item.name === 'provider-manager.open') ?? command
          return () => {}
        }
      },
      ui: {
        dialog: { clear: () => {} }
      },
      state: {
        path: { config: root },
        config: { agent: {} }
      }
    })

    expect(command?.slashName).toBe('provider')
    expect(command?.slashAliases).toEqual(['providers'])
    await command?.run()
    expect(routeName).toBe('provider-manager')
    expect(routeRender).toBeTypeOf('function')
  })

  it('registers provider manager interaction commands from the TUI plan', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    const commands: string[] = []

    await plugin.tui({
      route: {
        current: { name: 'provider-manager' },
        register: () => () => {},
        navigate: () => {}
      },
      keymap: {
        registerLayer: (layer) => {
          commands.push(...layer.commands.map((command) => command.name))
          return () => {}
        }
      },
      state: {
        path: { config: root },
        config: { agent: {} }
      }
    })

    expect(commands).toEqual(expect.arrayContaining([
      'provider-manager.open',
      'provider-manager.fetch-models',
      'provider-manager.model-defaults',
      'provider-manager.delete',
      'provider-manager.test',
      'provider-manager.default',
      'provider-manager.agent-bulk.start',
      'provider-manager.agent-bulk.toggle',
      'provider-manager.agent-bulk.all',
      'provider-manager.agent-bulk.confirm',
      'provider-manager.save'
    ]))
  })

  it('returns short status messages for unavailable provider actions', () => {
    expect(providerUnavailableActionMessage('edit', { hasProvider: false, hasDraft: false })).toBe('No provider selected. Press [a] to add one.')
    expect(providerUnavailableActionMessage('delete', { hasProvider: false, hasDraft: false })).toBe('No provider selected. Press [a] to add one.')
    expect(providerUnavailableActionMessage('test', { hasProvider: false, hasDraft: false })).toBe('No provider selected. Press [a] to add one.')
    expect(providerUnavailableActionMessage('default', { hasProvider: false, hasDraft: false })).toBe('No provider selected. Press [a] to add one.')
    expect(providerUnavailableActionMessage('edit', { hasProvider: true, hasDraft: false })).toBeNull()
    expect(providerUnavailableActionMessage('fetch-models', { hasProvider: true, hasDraft: false })).toBe('Open or add a provider before using this action')
    expect(providerUnavailableActionMessage('model-defaults', { hasProvider: true, hasDraft: false })).toBe('Open or add a provider before using this action')
    expect(providerUnavailableActionMessage('save', { hasProvider: true, hasDraft: false })).toBe('Open or add a provider before using this action')
    expect(providerUnavailableActionMessage('fetch-models', { hasProvider: true, hasDraft: true })).toBeNull()
  })

  it('exposes runtime save handlers reachable from /provider command', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    let handler: (() => Promise<unknown>) | undefined
    registerProviderManagerPlugin({
      configRoot: root,
      builtinAgents: [{ name: 'reviewer' }],
      registerCommand: (_name, registered) => {
        handler = registered as () => Promise<unknown>
      }
    })

    const session = await handler?.() as ProviderManagerSession
    expect(session.render()).toContain('No providers configured')

    const providerOutput = await session.handleProviderSave({
      originalName: null,
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiType: 'openai-responses',
      apiKey: 'secret',
      defaultModel: null,
      models: [],
      modelConfigDefaults: { contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] },
      dirtyFields: new Set(),
      validationErrors: [],
      protocolChanged: false
    })
    expect(JSON.parse(await readFile(join(root, 'auth.json'), 'utf8')).OpenAI.apiKey).toBe('secret')
    expect(providerOutput).toContain('OpenAI')

    await writeFile(join(root, 'opencode.jsonc'), '{"agent":{}}')
    const agentOutput = await session.handleAgentModelConfirm({
      agentName: 'reviewer',
      provider: 'OpenAI',
      model: 'gpt-5',
      reasoningEffort: 'high',
      step: 'select-reasoning',
      searchText: '',
      candidateItems: [],
      selectedIndex: 0
    })
    expect(JSON.parse(await readFile(join(root, 'opencode.jsonc'), 'utf8')).agent.reviewer).toEqual({ model: 'OpenAI/gpt-5', reasoningEffort: 'high' })
    expect(agentOutput).toContain('reviewer')
    expect(agentOutput).toContain('OpenAI/gpt-5')
    expect(agentOutput).toContain('override')
  })

  it('renders fetch models modal success state with existing models selected', () => {
    const output = renderProviderManagerModalLines({
      kind: 'fetch-models',
      phase: 'success',
      selectedIndex: 1,
      selectedModelIds: new Set(['gpt-5'])
    }, [
      { id: 'gpt-5', contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] },
      { id: 'gpt-5-mini', contextWindow: '256k', maxOutput: '128k', inputTypes: ['text'], reasoningEfforts: ['high'] }
    ])
    expect(output).toContain('Available Models (2)')
    expect(output).toContain('  [x] gpt-5')
    expect(output).toContain('> [ ] gpt-5-mini')
    expect(output).toContain('[Enter] Confirm [esc] Close')
  })

  it('renders fetch models loading and provider test states with themed titles', () => {
    expect(renderProviderManagerModalLines({
      kind: 'fetch-models',
      phase: 'loading',
      selectedIndex: 0,
      selectedModelIds: new Set()
    }, [])).toEqual([
      'Fetch Models  /  remote',
      'Fetching models...',
      '[esc] Cancel'
    ])

    expect(renderProviderManagerModalLines({
      kind: 'provider-test',
      providerName: 'OpenAI',
      phase: 'testing'
    }, [])).toEqual([
      'Provider Test  /  OpenAI',
      'Testing...',
      '[Enter] OK [esc] Close'
    ])
  })

  it('renders model defaults modal with all editable fields and selected reasoning', () => {
    const output = renderProviderManagerModalLines({
      kind: 'model-config-defaults',
      selectedField: 'high'
    }, [], {
      contextWindow: '256k',
      maxOutput: '128k',
      inputTypes: ['text', 'image'],
      reasoningEfforts: ['minimal', 'high']
    })
    expect(output).toContain('  Context Window Size : 256k')
    expect(output).toContain('  Max Output Size     : 128k')
    expect(output).toContain('  Input Type          : text,image')
    expect(output).toContain('    [x] minimal')
    expect(output).toContain('>   [x] high')
    expect(output).toContain('    [ ] xhigh')
    expect(output).toContain('[Ctrl+S] Save [esc] Close')
  })

  it('renders delete confirmation with default-provider guard messaging', () => {
    const output = renderProviderManagerModalLines({
      kind: 'provider-delete-confirm',
      providerName: 'OpenAI',
      isDefault: true
    }, [])
    expect(output).toContain('Delete Provider  /  OpenAI')
    expect(output).toContain('Switch default provider before deleting this provider.')
    expect(output).toContain('[esc] Close')
  })

  it('renders leave, protocol and model list modal chrome consistently', () => {
    expect(renderProviderManagerModalLines({
      kind: 'leave-confirm',
      target: 'provider-edit'
    }, [])).toEqual([
      'Unsaved changes',
      '[Enter] Confirm',
      '[esc] Close'
    ])

    const protocol = renderProviderManagerModalLines({
      kind: 'protocol-select',
      selectedIndex: 1
    }, [])
    expect(protocol[0]).toBe('Select API Protocol  /  provider')
    expect(protocol).toContain('> openai-chat')
    expect(protocol).toContain('[Up/Down] Move [Enter] Select')

    expect(renderProviderManagerModalLines({
      kind: 'model-list',
      selectedIndex: 0,
      selectedModelIds: new Set()
    }, [])).toEqual([
      'Models',
      '[Space] Toggle [Enter] Edit [a] Add [Ctrl+S] Save',
      '[esc] Close'
    ])
  })

  it('renders fetch models failure with error summary', () => {
    const output = renderProviderManagerModalLines({
      kind: 'fetch-models',
      phase: 'failure',
      selectedIndex: 0,
      selectedModelIds: new Set(),
      message: '401 Unauthorized'
    }, [])
    expect(output).toContain('Failed to fetch models')
    expect(output).toContain('401 Unauthorized')
  })

  it('renders agent provider switch modal with available providers', () => {
    const output = renderProviderManagerModalLines({
      kind: 'agent-provider-switch',
      selectedIndex: 1,
      providerNames: ['A', 'B'],
      agentNames: ['reviewer', 'planner']
    }, [])
    expect(output).toContain('Switch Provider (2 agents)  /  bulk')
    expect(output).toContain('  A')
    expect(output).toContain('> B')
  })

  it('renders agent provider switch modal with no available provider message', () => {
    const output = renderProviderManagerModalLines({
      kind: 'agent-provider-switch',
      selectedIndex: 0,
      providerNames: [],
      agentNames: ['reviewer'],
      message: 'No provider can cover selected agent models.'
    }, [])
    expect(output).toContain('No provider can cover selected agent models.')
  })
})
