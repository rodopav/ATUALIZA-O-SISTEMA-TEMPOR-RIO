/**
 * Brazilian CPF utilities (digit validation only — no API lookups).
 */

export function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '')
}

export function formatCPF(value: string): string {
  const d = digitsOnly(value).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** Standard CPF check-digit validation. */
export function validateCPF(input: string): boolean {
  const d = digitsOnly(input)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false

  const calcDigit = (slice: string, factorStart: number): number => {
    let sum = 0
    let factor = factorStart
    for (let i = 0; i < slice.length; i++) {
      const ch = slice.charAt(i)
      sum += Number.parseInt(ch, 10) * factor
      factor--
    }
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  const d1 = calcDigit(d.slice(0, 9), 10)
  const d2 = calcDigit(d.slice(0, 10), 11)
  return d1 === Number.parseInt(d.charAt(9), 10) && d2 === Number.parseInt(d.charAt(10), 10)
}
