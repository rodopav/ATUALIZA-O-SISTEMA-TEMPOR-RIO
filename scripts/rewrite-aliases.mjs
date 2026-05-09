// Rewrite `@/` and `@shared/` aliases to relative paths in the renderer.
// One-shot migration script — run with `node scripts/rewrite-aliases.mjs`.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const RENDERER_SRC = path.join(ROOT, 'src/renderer/src')
const SHARED_DIR = path.join(ROOT, 'src/shared')

const ALIAS_RE = /from\s+['"](@\/[^'"]+|@shared\/[^'"]+)['"]/g
const SIDE_RE = /^(\s*)import\s+['"](@\/[^'"]+|@shared\/[^'"]+)['"]/gm
const DYN_RE = /import\(\s*['"](@\/[^'"]+|@shared\/[^'"]+)['"]\s*\)/g

function toPosix(p) {
  return p.split(path.sep).join('/')
}

function relImport(fromFile, target) {
  let rel = path.relative(path.dirname(fromFile), target)
  rel = toPosix(rel)
  if (!rel.startsWith('.')) rel = './' + rel
  return rel
}

function resolveAlias(spec) {
  if (spec.startsWith('@/')) return path.join(RENDERER_SRC, spec.slice(2))
  if (spec.startsWith('@shared/')) return path.join(SHARED_DIR, spec.slice(8))
  return null
}

async function walk(dir) {
  const out = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(p)))
    else if (/\.(ts|tsx|mts|cts)$/.test(entry.name)) out.push(p)
  }
  return out
}

let changed = 0
const files = await walk(RENDERER_SRC)
for (const file of files) {
  const orig = await fs.readFile(file, 'utf8')
  let next = orig
  next = next.replace(ALIAS_RE, (_m, spec) => {
    const target = resolveAlias(spec)
    if (!target) return _m
    return `from '${relImport(file, target)}'`
  })
  next = next.replace(SIDE_RE, (_m, lead, spec) => {
    const target = resolveAlias(spec)
    if (!target) return _m
    return `${lead}import '${relImport(file, target)}'`
  })
  next = next.replace(DYN_RE, (_m, spec) => {
    const target = resolveAlias(spec)
    if (!target) return _m
    return `import('${relImport(file, target)}')`
  })
  if (next !== orig) {
    await fs.writeFile(file, next)
    changed += 1
  }
}
console.log(`rewrote ${changed} files`)
