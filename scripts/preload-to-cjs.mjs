// Pós-build: converte out/preload/index.mjs (ESM) para out/preload/index.js (CJS).
// Necessário porque Electron com sandbox: true não suporta preload em ESM.

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(__dirname, '..', 'out', 'preload', 'index.mjs')
const DST = path.resolve(__dirname, '..', 'out', 'preload', 'index.js')

if (!existsSync(SRC)) {
  console.log('[preload-to-cjs] sem index.mjs para converter (já é CJS ou build não rodou).')
  process.exit(0)
}

let content = readFileSync(SRC, 'utf8')

// import { a, b } from "module"  →  const { a, b } = require("module");
content = content.replace(
  /import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["']\s*;?/g,
  'const {$1} = require("$2");',
)
// import default from "module"  →  const default = require("module");
content = content.replace(
  /import\s+(\w+)\s+from\s+["']([^"']+)["']\s*;?/g,
  'const $1 = require("$2");',
)
// import "module"  →  require("module");
content = content.replace(
  /^\s*import\s+["']([^"']+)["']\s*;?/gm,
  'require("$1");',
)
// export { foo, bar };  →  (removido — preload não exporta nada de útil pra app)
content = content.replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, '')
// export default x  →  module.exports = x
content = content.replace(/^\s*export\s+default\s+/gm, 'module.exports = ')

writeFileSync(DST, content, 'utf8')
unlinkSync(SRC)
console.log(`[preload-to-cjs] index.mjs → index.js (${content.length} bytes, CJS)`)
