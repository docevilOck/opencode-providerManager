import type { PageId, PageShellState, StatusLine } from '../types/tui.js'

const PAGES: PageId[] = ['provider', 'agents']
export const STATUS_LINE_TTL_MS = 2000

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function createTransientStatusLine(message: string, level: StatusLine['level'], now = Date.now()): StatusLine {
  return { message, level, expiresAt: now + STATUS_LINE_TTL_MS }
}

export function visibleStatusLine(statusLine: StatusLine | null | undefined, now = Date.now()): StatusLine | null {
  if (!statusLine) return null
  if (statusLine.expiresAt !== undefined && statusLine.expiresAt <= now) return null
  return statusLine
}

export function createInitialPageShellState(): PageShellState {
  return {
    pages: PAGES,
    activePage: 'provider',
    sidebarCursorPage: 'provider',
    focusRegion: 'sidebar',
    pageStates: {
      provider: { selectedIndex: 0, scrollOffset: 0 },
      agents: { selectedIndex: 0, scrollOffset: 0 }
    },
    modalState: null,
    statusLine: null
  }
}

export function moveSidebarCursor(state: PageShellState, delta: -1 | 1): PageShellState {
  const current = state.pages.indexOf(state.sidebarCursorPage)
  const nextIndex = clamp(current + delta, 0, state.pages.length - 1)
  const sidebarCursorPage = state.pages[nextIndex] ?? state.sidebarCursorPage
  return {
    ...state,
    sidebarCursorPage,
    statusLine: sidebarCursorPage !== state.activePage ? { message: 'Press Enter to switch page', level: 'info' } : null
  }
}

export function activateSidebarPage(state: PageShellState): PageShellState {
  return {
    ...state,
    activePage: state.sidebarCursorPage,
    focusRegion: 'content',
    statusLine: null
  }
}

export function returnToSidebar(state: PageShellState): PageShellState {
  return {
    ...state,
    focusRegion: 'sidebar',
    sidebarCursorPage: state.activePage,
    statusLine: null
  }
}

export function visibleScrollOffset(selectedIndex: number, scrollOffset: number, itemCount: number, windowSize: number): number {
  const maxOffset = Math.max(0, itemCount - windowSize)
  if (itemCount <= windowSize) return 0
  if (selectedIndex < scrollOffset) return clamp(selectedIndex, 0, maxOffset)
  if (selectedIndex >= scrollOffset + windowSize) return clamp(selectedIndex - windowSize + 1, 0, maxOffset)
  return clamp(scrollOffset, 0, maxOffset)
}
