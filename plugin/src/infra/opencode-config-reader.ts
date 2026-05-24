import { readFile } from 'node:fs/promises'
import type { OpencodeConfigSnapshot } from '../types/provider.js'
import { resolveOpencodePaths } from './path-resolver.js'

export function parseJsonc(content: string): unknown {
  const withoutBlockComments = content.replace(/\/\*[\s\S]*?\*\//g, '')
  const withoutLineComments = withoutBlockComments.replace(/(^|\s)\/\/.*$/gm, '$1')
  return JSON.parse(withoutLineComments)
}

async function readJsonObject(filePath: string): Promise<unknown> {
  try {
    const content = await readFile(filePath, 'utf8')
    return parseJsonc(content)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

async function readRequiredJsonObject(filePath: string): Promise<unknown> {
  const content = await readFile(filePath, 'utf8')
  return parseJsonc(content)
}

async function readGlobalOpencodeConfig(root: string): Promise<{ value: unknown; source: 'json' | 'jsonc' | 'missing' }> {
  const paths = resolveOpencodePaths(root)
  try {
    return { value: await readRequiredJsonObject(paths.globalOpencodeJson), source: 'json' }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  try {
    return { value: await readRequiredJsonObject(paths.globalOpencodeJsonc), source: 'jsonc' }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  return { value: {}, source: 'missing' }
}

export async function readOpencodeConfigSnapshot(root: string, builtinAgents: unknown[]): Promise<OpencodeConfigSnapshot> {
  const paths = resolveOpencodePaths(root)
  const [providersJson, authJson, settingsJson, pluginJson, globalOpencode] = await Promise.all([
    readJsonObject(paths.providersJson),
    readJsonObject(paths.authJson),
    readJsonObject(paths.settingsJson),
    readJsonObject(paths.pluginJson),
    readGlobalOpencodeConfig(root)
  ])

  return {
    providersJson,
    authJson,
    settingsJson,
    pluginJson,
    globalOpencodeJson: globalOpencode.value,
    globalOpencodeSource: globalOpencode.source,
    builtinAgents,
    loadedAt: Date.now()
  }
}
