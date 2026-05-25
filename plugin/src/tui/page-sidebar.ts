import type { PageId } from '../types/tui.js'

export function renderSidebar(pages: PageId[], activePage: PageId, sidebarCursorPage: PageId, showActive = true): string[] {
  return pages.map((page) => {
    const cursor = page === sidebarCursorPage ? '>' : ' '
    const active = showActive && page === activePage ? '*' : ' '
    return `${cursor} ${active} ${page}`
  })
}
