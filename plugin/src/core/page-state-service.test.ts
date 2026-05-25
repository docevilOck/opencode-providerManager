import { describe, expect, it } from 'vitest'
import { activateSidebarPage, createInitialPageShellState, createTransientStatusLine, moveSidebarCursor, returnToSidebar, visibleScrollOffset, visibleStatusLine } from './page-state-service.js'

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

  it('keeps selected content visible in a bounded scroll window', () => {
    expect(visibleScrollOffset(0, 0, 10, 3)).toBe(0)
    expect(visibleScrollOffset(3, 0, 10, 3)).toBe(1)
    expect(visibleScrollOffset(1, 4, 10, 3)).toBe(1)
    expect(visibleScrollOffset(8, 9, 10, 3)).toBe(7)
  })

  it('hides transient status lines after their ttl', () => {
    const statusLine = createTransientStatusLine('No provider selected', 'warn', 1000)
    expect(visibleStatusLine(statusLine, 2999)?.message).toBe('No provider selected')
    expect(visibleStatusLine(statusLine, 3000)).toBeNull()
  })
})
