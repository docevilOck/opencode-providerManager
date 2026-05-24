import { describe, expect, it } from 'vitest'
import { renderProviderManagerShell } from './provider-manager-shell.js'
import { createInitialPageShellState } from '../core/page-state-service.js'

describe('renderProviderManagerShell', () => {
  it('renders sidebar and active provider page', () => {
    const output = renderProviderManagerShell({
      shell: createInitialPageShellState(),
      providers: [],
      agents: []
    })
    expect(output).toContain('>* provider')
    expect(output).toContain('No providers configured')
  })

  it('renders config loading errors inside shell', () => {
    const output = renderProviderManagerShell({
      shell: createInitialPageShellState(),
      providers: [],
      agents: [],
      error: 'invalid config'
    })
    expect(output).toContain('>* provider')
    expect(output).toContain('Error: invalid config')
  })
})
