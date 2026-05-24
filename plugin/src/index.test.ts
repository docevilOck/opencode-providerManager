import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import plugin, { registerProviderManagerPlugin, type ProviderManagerSession } from './index.js'

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
    expect(JSON.parse(await readFile(join(root, 'opencode.jsonc'), 'utf8')).agent.reviewer).toEqual({ provider: 'OpenAI', model: 'gpt-5', reasoningEffort: 'high' })
    expect(agentOutput).toContain('reviewer')
    expect(agentOutput).toContain('model: gpt-5')
    expect(agentOutput).toContain('status: override')
  })
})
