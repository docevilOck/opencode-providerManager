import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { resolveOpencodePaths } from './path-resolver.js'

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function readJson(filePath: string): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

export async function writeProvidersConfig(root: string, providers: unknown): Promise<void> {
  const paths = resolveOpencodePaths(root)
  await writeJson(paths.providersJson, providers)
}

export async function writeGlobalAgentConfig(root: string, agentName: string, config: Record<string, unknown>): Promise<void> {
  const paths = resolveOpencodePaths(root)
  const current = await readJson(paths.globalOpencodeJson)
  const agent = typeof current.agent === 'object' && current.agent !== null ? current.agent as Record<string, unknown> : {}
  agent[agentName] = config
  await writeJson(paths.globalOpencodeJson, { ...current, agent })
}
