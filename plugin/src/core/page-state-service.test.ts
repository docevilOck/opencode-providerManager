import { describe, expect, it } from 'vitest'
import { activateSidebarPage, createInitialPageShellState, moveSidebarCursor, returnToSidebar } from './page-state-service.js'

describe('page state service', () => {
  it('keeps sidebar cursor separate from active page until Enter', () => {
    const state = createInitialPageShellState()
    const moved = moveSidebarCursor(state, 1)
    expect(moved.activePage).toBe('provider')
    expect(moved.sidebarCursorPage).toBe('agents')
    expect(moved.statusLine?.message).toBe('Press Enter to switch page')

    const activated = activateSidebarPage(moved)
    expect(activated.activePage).toBe('agents')
    expect(activated.focusRegion).toBe('content')
  })

  it('returns content focus to sidebar at current active page', () => {
    const state = activateSidebarPage(moveSidebarCursor(createInitialPageShellState(), 1))
    const next = returnToSidebar(state)
    expect(next.focusRegion).toBe('sidebar')
    expect(next.sidebarCursorPage).toBe('agents')
  })
})
