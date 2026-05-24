import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { loadProviderManagerData } from './provider-manager-service.js'

describe('loadProviderManagerData', () => {
  it('loads provider and agent summaries together', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'providers.json'), JSON.stringify({ OpenAI: { baseUrl: 'https://api.openai.com/v1', apiType: 'openai-responses', models: [{ id: 'gpt-5' }] } }))
    await writeFile(join(root, 'settings.json'), JSON.stringify({ defaultProvider: 'OpenAI' }))
    const data = await loadProviderManagerData(root, [{ name: 'reviewer' }])
    expect(data.providers[0]?.name).toBe('OpenAI')
    expect(data.agents[0]?.name).toBe('reviewer')
    expect(data.shell.activePage).toBe('provider')
  })
})
