/**
 * Brazilian CNPJ utilities (digit validation only — no API lookups).
 */

const CNPJ_REGEX = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/

export function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '')
}

export function formatCNPJ(value: string): string {
  const d = digitsOnly(value).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function isCNPJMask(value: string): boolean {
  return CNPJ_REGEX.test(value)
}

/** Standard CNPJ check-digit validation. */
export function validateCNPJ(input: string): boolean {
  const d = digitsOnly(input)
  if (d.length !== 14) return false
  if (/^(\d)\1{13}$/.test(d)) return false

  const calcDigit = (slice: string): number => {
    const weights =
      slice.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < slice.length; i++) {
      const ch = slice.charAt(i)
      const w = weights[i]
      if (w === undefined) return -1
      sum += Number.parseInt(ch, 10) * w
    }
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const d1 = calcDigit(d.slice(0, 12))
  const d2 = calcDigit(d.slice(0, 13))
  if (d1 < 0 || d2 < 0) return false
  return d1 === Number.parseInt(d.charAt(12), 10) && d2 === Number.parseInt(d.charAt(13), 10)
}
