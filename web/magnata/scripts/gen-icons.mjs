// Gera icon-192.png e icon-512.png a partir do favicon.svg.
// Roda com `node scripts/gen-icons.mjs` na pasta web/magnata.
// Usa o `sharp` do workspace `app/` (já está instalado lá).
import { readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// Resolve sharp via workspace vizinho — evita re-instalar.
const sharpUrl = pathToFileURL(resolve(root, '../../app/node_modules/sharp/lib/index.js')).href
const { default: sharp } = await import(sharpUrl)

const svg = readFileSync(resolve(root, 'public/favicon.svg'))

async function gen(size, fname) {
  const buf = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()
  await writeFile(resolve(root, 'public', fname), buf)
  console.log(`  ${fname}: ${buf.length} bytes`)
}

await gen(192, 'icon-192.png')
await gen(512, 'icon-512.png')
console.log('OK')
