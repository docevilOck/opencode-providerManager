import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { writeGlobalAgentConfig, writeProvidersConfig } from './opencode-config-writer.js'

describe('opencode config writer', () => {
  it('writes providers json', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeProvidersConfig(root, { OpenAI: { baseUrl: 'https://api.openai.com/v1' } })
    const content = JSON.parse(await readFile(join(root, 'providers.json'), 'utf8'))
    expect(content.OpenAI.baseUrl).toBe('https://api.openai.com/v1')
  })

  it('writes global agent model override', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeGlobalAgentConfig(root, 'reviewer', { provider: 'OpenAI', model: 'gpt-5', reasoningEffort: 'high' })
    const content = JSON.parse(await readFile(join(root, 'opencode.json'), 'utf8'))
    expect(content.agent.reviewer).toEqual({ provider: 'OpenAI', model: 'gpt-5', reasoningEffort: 'high' })
  })

  it('writes back to opencode.jsonc when that source is preferred', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'opencode.jsonc'), '{\n  // keep source\n  "agent": {}\n}')
    await writeGlobalAgentConfig(root, 'reviewer', { provider: 'OpenAI', model: 'gpt-5' }, 'jsonc')
    const jsonc = JSON.parse(await readFile(join(root, 'opencode.jsonc'), 'utf8'))
    expect(jsonc.agent.reviewer).toEqual({ provider: 'OpenAI', model: 'gpt-5' })
  })
})
