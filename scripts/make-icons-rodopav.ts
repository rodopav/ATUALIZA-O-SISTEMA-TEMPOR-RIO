// Gera o ícone "RODOPAV" para os 3 apps a partir do wordmark.
// Mesmo ícone replicado em build/icon.png, icon-admin.png, icon-magnata.png.
// 1024×1024 com cantos arredondados, fundo asf-950, wordmark grande centralizado.

import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const WORDMARK_SRC = path.join(ROOT, 'build', 'wordmark-rodopav.png')

const ICON_SIZE = 1024 // alto resolução para nitidez em todos os zoom levels do Windows
const CORNER_RADIUS = 160 // ~15% (estilo modern app icon)
const BG = '#0a0a0a' // asf-950
// Wordmark ocupa 92% da largura — letras grandes, legíveis até em 16×16
const WORDMARK_WIDTH = Math.round(ICON_SIZE * 0.92)

async function loadWordmarkTransparent(): Promise<Buffer> {
  // 1) carrega original em RAW e remove fundo branco → alpha 0
  const original = await sharp(WORDMARK_SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const px = Buffer.from(original.data)
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i] ?? 0
    const g = px[i + 1] ?? 0
    const b = px[i + 2] ?? 0
    if (r > 235 && g > 235 && b > 235) {
      px[i + 3] = 0
    }
  }

  // 2) trim do alpha (recorta whitespace transparente em volta da letra)
  const trimmed = await sharp(px, { raw: original.data ? original.info : undefined })
    .png()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 5 })
    .toBuffer()

  // 3) redimensiona para a largura desejada
  return sharp(trimmed)
    .resize({ width: WORDMARK_WIDTH, withoutEnlargement: false })
    .png()
    .toBuffer()
}

async function buildIcon(out: string, wordmark: Buffer): Promise<void> {
  // Máscara de cantos arredondados via SVG
  const maskSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}">
       <rect x="0" y="0" width="${ICON_SIZE}" height="${ICON_SIZE}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="white"/>
     </svg>`,
  )

  const wmMeta = await sharp(wordmark).metadata()
  const wmHeight = wmMeta.height ?? 300
  const wmWidth = wmMeta.width ?? WORDMARK_WIDTH
  const top = Math.round((ICON_SIZE - wmHeight) / 2)
  const left = Math.round((ICON_SIZE - wmWidth) / 2)

  await sharp({
    create: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      channels: 4,
      background: BG,
    },
  })
    .composite([
      { input: wordmark, top, left },
      { input: maskSvg, blend: 'dest-in' },
    ])
    .png({ compressionLevel: 9 })
    .toFile(out)
  console.log(`wrote ${path.relative(ROOT, out)}`)
}

const wordmark = await loadWordmarkTransparent()

await buildIcon(path.join(ROOT, 'build', 'icon.png'), wordmark)
await buildIcon(path.join(ROOT, 'build', 'icon-admin.png'), wordmark)
await buildIcon(path.join(ROOT, 'build', 'icon-magnata.png'), wordmark)

console.log('done')
