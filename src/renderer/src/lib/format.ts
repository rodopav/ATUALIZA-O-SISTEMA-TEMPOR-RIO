import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatBRL(value: number | null | undefined): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return brlFormatter.format(safe)
}

function toDate(d: string | Date): Date {
  if (d instanceof Date) return d
  // Handles both YYYY-MM-DD and full ISO strings.
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    // Construct as local date to avoid TZ shift to "previous day".
    const [y, m, day] = d.split('-').map((n) => Number.parseInt(n, 10))
    if (
      y !== undefined &&
      m !== undefined &&
      day !== undefined &&
      Number.isFinite(y) &&
      Number.isFinite(m) &&
      Number.isFinite(day)
    ) {
      return new Date(y, m - 1, day)
    }
  }
  return parseISO(d)
}

export function formatDate(d: string | Date): string {
  return format(toDate(d), 'dd/MM/yyyy', { locale: ptBR })
}

/**
 * Capitalized "Fevereiro/2026" style. Accepts Date or ISO date string,
 * including the postgres "first day of month" convention used by
 * `v_saldo_geral.periodo` (YYYY-MM-DD).
 */
export function formatPeriodo(d: string | Date): string {
  const raw = format(toDate(d), 'LLLL/yyyy', { locale: ptBR })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

/**
 * Relative time in Brazilian Portuguese, e.g. "há 2 horas".
 * Returns "Nunca" when value is null/undefined.
 */
export function formatRelative(d: string | Date | null | undefined): string {
  if (!d) return 'Nunca'
  const date = toDate(d)
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR })
}

/**
 * Parses a Brazilian-formatted currency string into a number.
 * Examples: "R$ 1.234,56" → 1234.56 ; "1234,5" → 1234.5 ; "" → 0
 */
export function parseBRL(input: string): number {
  if (!input) return 0
  const cleaned = input
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.\-]/g, '')
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}
