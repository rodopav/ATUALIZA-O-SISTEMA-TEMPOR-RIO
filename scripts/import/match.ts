// Funções utilitárias de normalização e fuzzy match.

// U+0300..U+036F é o bloco "Combining Diacritical Marks" do Unicode.
const DIACRITICS_RE = /[̀-ͯ]/g

export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const cols = a.length + 1
  const rows = b.length + 1
  const matrix: number[] = new Array(cols * rows).fill(0)

  for (let i = 0; i < cols; i += 1) matrix[i] = i
  for (let j = 0; j < rows; j += 1) matrix[j * cols] = j

  for (let j = 1; j < rows; j += 1) {
    for (let i = 1; i < cols; i += 1) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      const idx = j * cols + i
      const del = matrix[idx - 1]
      const ins = matrix[idx - cols]
      const sub = matrix[idx - cols - 1]
      const dv = (del ?? 0) + 1
      const iv = (ins ?? 0) + 1
      const sv = (sub ?? 0) + cost
      matrix[idx] = Math.min(dv, iv, sv)
    }
  }

  return matrix[matrix.length - 1] ?? Math.max(a.length, b.length)
}

// Similaridade aproximada baseada em Levenshtein no intervalo [0, 1].
export function similarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1
  const distance = levenshtein(a, b)
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - distance / maxLen
}

// Procura uma chave normalizada no mapa, primeiro exata depois com tolerância de 2.
export function fuzzyLookup<V>(map: Map<string, V>, query: string, maxDistance = 2): V | null {
  const norm = normalize(query)
  if (!norm) return null

  const direct = map.get(norm)
  if (direct !== undefined) return direct

  let best: { value: V; distance: number } | null = null
  for (const [key, value] of map.entries()) {
    const d = levenshtein(norm, key)
    if (d <= maxDistance && (best === null || d < best.distance)) {
      best = { value, distance: d }
      if (d === 0) break
    }
  }
  return best?.value ?? null
}

// Versão case-insensitive contains - usada para procurar respo­nsável por trecho do nome.
export function findByContains<V>(map: Map<string, V>, needle: string): V | null {
  const norm = normalize(needle)
  if (!norm) return null
  for (const [key, value] of map.entries()) {
    if (key.includes(norm)) return value
  }
  return null
}

// Similaridade entre descrições (lowercased).
export function descriptionSimilarity(a: string, b: string): number {
  return similarity(normalize(a), normalize(b))
}
