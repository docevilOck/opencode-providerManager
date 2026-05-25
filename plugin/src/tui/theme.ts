export const TUI_THEME = {
  title: 'blue',
  accent: 'cyan',
  text: 'white',
  muted: 'gray',
  disabled: 'darkgray',
  success: 'green',
  warning: 'yellow',
  danger: 'red'
} as const

export function panelTitle(title: string): string {
  return `-- ${title}`
}

export function keyHint(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function titleLine(title: string, meta?: string): string {
  return meta ? `${title}  /  ${meta}` : title
}
