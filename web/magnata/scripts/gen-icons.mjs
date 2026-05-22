// Gera icon-192.png, icon-512.png e apple-touch-icon.png a partir de logo-rodopav.png.
// Roda com `node scripts/gen-icons.mjs` na pasta web/magnata.
// Usa o `sharp` instalado no app/ (caminho relativo: ../../node_modules/sharp).
import { readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// web/magnata → ../../node_modules/sharp (compartilhado do app/)
const sharpUrl = pathToFileURL(resolve(root, '../../node_modules/sharp/lib/index.js')).href
const { default: sharp } = await import(sharpUrl)

const src = readFileSync(resolve(root, 'public/logo-rodopav.png'))

async function gen(size, fname) {
  const buf = await sharp(src).resize(size, size, { fit: 'cover' }).png().toBuffer()
  await writeFile(resolve(root, 'public', fname), buf)
  console.log(`  ${fname}: ${(buf.length / 1024).toFixed(1)} KB`)
}

await gen(192, 'icon-192.png')
await gen(512, 'icon-512.png')
await gen(180, 'apple-touch-icon.png')
console.log('OK')
