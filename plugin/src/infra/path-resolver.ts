import { join } from 'node:path'

export type OpencodeConfigPaths = {
  root: string
  providersJson: string
  authJson: string
  settingsJson: string
  pluginJson: string
  globalOpencodeJson: string
  globalOpencodeJsonc: string
}

export function resolveOpencodePaths(root: string): OpencodeConfigPaths {
  return {
    root,
    providersJson: join(root, 'providers.json'),
    authJson: join(root, 'auth.json'),
    settingsJson: join(root, 'settings.json'),
    pluginJson: join(root, 'plugins', 'provider-manager', 'provider-manager.json'),
    globalOpencodeJson: join(root, 'opencode.json'),
    globalOpencodeJsonc: join(root, 'opencode.jsonc')
  }
}
