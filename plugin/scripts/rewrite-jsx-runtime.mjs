import { readFileSync, writeFileSync } from 'node:fs'
import { globSync } from 'node:fs'

const files = globSync('dist/**/*.js')
for (const file of files) {
  const source = readFileSync(file, 'utf8')
  const rewritten = source.replaceAll('"@opentui/solid/jsx-runtime"', '"solid-js/jsx-runtime"')
  if (rewritten !== source) {
    writeFileSync(file, rewritten, 'utf8')
  }
}
