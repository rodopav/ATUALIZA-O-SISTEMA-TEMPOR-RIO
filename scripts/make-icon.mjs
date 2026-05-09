// Generates a 512x512 solid-color PNG at build/icon.png (no external deps).
// Used as the source for electron-builder to generate platform icons.

import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const W = 512
const H = 512
// Rodopav brand — preto absoluto com circle amarelo âmbar (paleta Road Asfaltos)
const TOP = [0x0a, 0x0a, 0x0a]
const BOT = [0x2c, 0x2c, 0x2c]
const RING_COLOR = [0xf5, 0x9e, 0x0b]

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = crc ^ buf[i]
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (~crc) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 2 // color type RGB
ihdr[10] = 0 // compression
ihdr[11] = 0 // filter
ihdr[12] = 0 // interlace

// Build raw scanlines: 1 filter byte + W*3 bytes per row.
// Add a centered "circle" of lighter color for visual interest.
const rowLen = 1 + W * 3
const raw = Buffer.alloc(rowLen * H)
const cx = W / 2
const cy = H / 2
const r = W * 0.32
for (let y = 0; y < H; y++) {
  const off = y * rowLen
  raw[off] = 0 // no filter
  const t = y / (H - 1)
  const r0 = Math.round(TOP[0] + (BOT[0] - TOP[0]) * t)
  const g0 = Math.round(TOP[1] + (BOT[1] - TOP[1]) * t)
  const b0 = Math.round(TOP[2] + (BOT[2] - TOP[2]) * t)
  for (let x = 0; x < W; x++) {
    const dx = x - cx
    const dy = y - cy
    const inside = dx * dx + dy * dy <= r * r
    const pix = off + 1 + x * 3
    if (inside) {
      raw[pix] = RING_COLOR[0]
      raw[pix + 1] = RING_COLOR[1]
      raw[pix + 2] = RING_COLOR[2]
    } else {
      raw[pix] = r0
      raw[pix + 1] = g0
      raw[pix + 2] = b0
    }
  }
}

const idat = deflateSync(raw, { level: 9 })

const png = Buffer.concat([
  SIG,
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
])

mkdirSync('build/icons', { recursive: true })
writeFileSync('build/icon.png', png)
// Also place sized PNGs that electron-builder/Linux likes.
writeFileSync('build/icons/512x512.png', png)
console.log(`wrote build/icon.png (${png.length} bytes)`)
