import { readFile } from 'node:fs/promises'
import type { OpencodeConfigSnapshot } from '../types/provider.js'
import { resolveOpencodePaths } from './path-resolver.js'

export function parseJsonc(content: string): unknown {
  let output = ''
  let inString = false
  let escaped = false
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const next = content[index + 1]
    if (inString) {
      output += char
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      output += char
      continue
    }
    if (char === '/' && next === '/') {
      while (index < content.length && content[index] !== '\n') index += 1
      output += '\n'
      continue
    }
    if (char === '/' && next === '*') {
      index += 2
      while (index < content.length && !(content[index] === '*' && content[index + 1] === '/')) index += 1
      index += 1
      continue
    }
    output += char
  }
  return JSON.parse(stripTrailingCommas(output))
}

function stripTrailingCommas(content: string): string {
  let output = ''
  let inString = false
  let escaped = false
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    if (inString) {
      output += char
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      output += char
      continue
    }
    if (char === ',') {
      let nextIndex = index + 1
      while (/\s/.test(content[nextIndex] ?? '')) nextIndex += 1
      if (content[nextIndex] === '}' || content[nextIndex] === ']') continue
    }
    output += char
  }
  return output
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
