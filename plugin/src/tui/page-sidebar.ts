import type { PageId } from '../types/tui.js'

export function renderSidebar(pages: PageId[], activePage: PageId, sidebarCursorPage: PageId): string[] {
  return pages.map((page) => {
    const cursor = page === sidebarCursorPage ? '>' : ' '
    const active = page === activePage ? '*' : ' '
    return `${cursor}${active} ${page}`
  })
}
