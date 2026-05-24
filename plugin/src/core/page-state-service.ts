import type { PageId, PageShellState } from '../types/tui.js'

const PAGES: PageId[] = ['provider', 'agents']

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
  const nextIndex = Math.max(0, Math.min(state.pages.length - 1, current + delta))
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
