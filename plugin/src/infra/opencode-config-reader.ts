import { readFile } from 'node:fs/promises'
import type { OpencodeConfigSnapshot } from '../types/provider.js'
import { resolveOpencodePaths } from './path-resolver.js'

async function readJsonObject(filePath: string): Promise<unknown> {
  try {
    const content = await readFile(filePath, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

export async function readOpencodeConfigSnapshot(root: string, builtinAgents: unknown[]): Promise<OpencodeConfigSnapshot> {
  const paths = resolveOpencodePaths(root)
  const [providersJson, authJson, settingsJson, pluginJson, globalOpencodeJson] = await Promise.all([
    readJsonObject(paths.providersJson),
    readJsonObject(paths.authJson),
    readJsonObject(paths.settingsJson),
    readJsonObject(paths.pluginJson),
    readJsonObject(paths.globalOpencodeJson)
  ])

  return {
    providersJson,
    authJson,
    settingsJson,
    pluginJson,
    globalOpencodeJson,
    builtinAgents,
    loadedAt: Date.now()
  }
}
