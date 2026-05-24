import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { parseJsonc } from './opencode-config-reader.js'
import { resolveOpencodePaths } from './path-resolver.js'

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function readJson(filePath: string): Promise<Record<string, unknown>> {
  try {
    return parseJsonc(await readFile(filePath, 'utf8')) as Record<string, unknown>
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

export async function writeProvidersConfig(root: string, providers: unknown): Promise<void> {
  const paths = resolveOpencodePaths(root)
  await writeJson(paths.providersJson, providers)
}

async function resolveGlobalConfigWritePath(root: string, preferredSource?: 'json' | 'jsonc' | 'missing'): Promise<string> {
  const paths = resolveOpencodePaths(root)
  if (preferredSource === 'jsonc') return paths.globalOpencodeJsonc
  if (preferredSource === 'json') return paths.globalOpencodeJson
  try {
    await readFile(paths.globalOpencodeJson, 'utf8')
    return paths.globalOpencodeJson
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  try {
    await readFile(paths.globalOpencodeJsonc, 'utf8')
    return paths.globalOpencodeJsonc
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  return paths.globalOpencodeJson
}

export async function writeGlobalAgentConfig(root: string, agentName: string, config: Record<string, unknown>, preferredSource?: 'json' | 'jsonc' | 'missing'): Promise<void> {
  const filePath = await resolveGlobalConfigWritePath(root, preferredSource)
  const current = await readJson(filePath)
  const agent = typeof current.agent === 'object' && current.agent !== null ? current.agent as Record<string, unknown> : {}
  agent[agentName] = config
  await writeJson(filePath, { ...current, agent })
}
