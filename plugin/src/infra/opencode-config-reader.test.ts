import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { resolveOpencodePaths } from './path-resolver.js'
import { readOpencodeConfigSnapshot } from './opencode-config-reader.js'

describe('opencode config reader', () => {
  it('resolves all provider manager config paths from a config root', () => {
    const paths = resolveOpencodePaths('/home/test/.config/opencode')
    expect(paths.providersJson).toContain('providers.json')
    expect(paths.authJson).toContain('auth.json')
    expect(paths.settingsJson).toContain('settings.json')
    expect(paths.pluginJson.replaceAll('\\', '/')).toContain('plugins/provider-manager/provider-manager.json')
    expect(paths.globalOpencodeJson).toContain('opencode.json')
  })

  it('reads missing files as empty objects and attaches builtin agents', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    const snapshot = await readOpencodeConfigSnapshot(root, [{ name: 'reviewer' }])
    expect(snapshot.providersJson).toEqual({})
    expect(snapshot.authJson).toEqual({})
    expect(snapshot.settingsJson).toEqual({})
    expect(snapshot.pluginJson).toEqual({})
    expect(snapshot.globalOpencodeJson).toEqual({})
    expect(snapshot.builtinAgents).toEqual([{ name: 'reviewer' }])
    expect(typeof snapshot.loadedAt).toBe('number')
  })

  it('parses existing json files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'providers.json'), JSON.stringify({ OpenAI: { baseUrl: 'https://api.openai.com/v1' } }))
    const snapshot = await readOpencodeConfigSnapshot(root, [])
    expect(snapshot.providersJson).toEqual({ OpenAI: { baseUrl: 'https://api.openai.com/v1' } })
  })

  it('reads opencode.jsonc with comments when json is absent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'opencode.jsonc'), '{\n  // agent config\n  "agent": { "reviewer": { "model": "gpt-5" } }\n}')
    const snapshot = await readOpencodeConfigSnapshot(root, [])
    expect(snapshot.globalOpencodeSource).toBe('jsonc')
    expect(snapshot.globalOpencodeJson).toEqual({ agent: { reviewer: { model: 'gpt-5' } } })
  })

  it('keeps comment markers inside json strings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'opencode.jsonc'), JSON.stringify({ agent: { reviewer: { prompt: 'a // b /* c */', model: 'gpt-5' } } }))
    const snapshot = await readOpencodeConfigSnapshot(root, [])
    expect(snapshot.globalOpencodeJson).toEqual({ agent: { reviewer: { prompt: 'a // b /* c */', model: 'gpt-5' } } })
  })

  it('parses jsonc trailing commas outside strings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-manager-'))
    await writeFile(join(root, 'opencode.jsonc'), `{
      "agent": {
        "reviewer": {
          "model": "gpt-5",
          "tools": [
            "read",
            "write",
          ],
          "prompt": "keep ,] and ,} inside strings",
        },
      },
    }`)
    const snapshot = await readOpencodeConfigSnapshot(root, [])
    expect(snapshot.globalOpencodeJson).toEqual({
      agent: {
        reviewer: {
          model: 'gpt-5',
          tools: ['read', 'write'],
          prompt: 'keep ,] and ,} inside strings'
        }
      }
    })
  })
})
