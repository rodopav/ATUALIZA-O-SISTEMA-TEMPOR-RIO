// Admin (IAM) — preto absoluto + ring âmbar (paleta Road Asfaltos)
// Diferenciador: anel duplo concêntrico simulando "shield/lock"

import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const W = 512
const H = 512
const TOP = [0x0a, 0x0a, 0x0a]
const BOT = [0x2c, 0x2c, 0x2c]
const RING_OUTER = [0xf5, 0x9e, 0x0b]
const RING_INNER = [0xfc, 0xd3, 0x4d]

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
ihdr[8] = 8
ihdr[9] = 2
ihdr[10] = 0
ihdr[11] = 0
ihdr[12] = 0

const rowLen = 1 + W * 3
const raw = Buffer.alloc(rowLen * H)
const cx = W / 2
const cy = H / 2
// Shield-like center: outer ring + inner disk
const r1 = W * 0.36
const r2 = W * 0.22
for (let y = 0; y < H; y++) {
  const off = y * rowLen
  raw[off] = 0
  const t = y / (H - 1)
  const r0 = Math.round(TOP[0] + (BOT[0] - TOP[0]) * t)
  const g0 = Math.round(TOP[1] + (BOT[1] - TOP[1]) * t)
  const b0 = Math.round(TOP[2] + (BOT[2] - TOP[2]) * t)
  for (let x = 0; x < W; x++) {
    const dx = x - cx
    const dy = y - cy
    const d2 = dx * dx + dy * dy
    const pix = off + 1 + x * 3
    if (d2 <= r2 * r2) {
      raw[pix] = RING_INNER[0]
      raw[pix + 1] = RING_INNER[1]
      raw[pix + 2] = RING_INNER[2]
    } else if (d2 <= r1 * r1) {
      raw[pix] = RING_OUTER[0]
      raw[pix + 1] = RING_OUTER[1]
      raw[pix + 2] = RING_OUTER[2]
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

mkdirSync('build', { recursive: true })
writeFileSync('build/icon-admin.png', png)
console.log(`wrote build/icon-admin.png (${png.length} bytes)`)
