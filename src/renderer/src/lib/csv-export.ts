// Geração de CSV compatível com Excel-PT-BR (separador `;`, BOM UTF-8).
// Quem chamar passa colunas tipadas + linhas; a função baixa o arquivo.

export type CsvColumn<T> = {
  header: string
  accessor: (row: T) => string | number | boolean | null | undefined
}

function escapeCsvValue(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  // Aspas duplas dentro do campo são escapadas dobrando-as.
  if (/[;\n\r"]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function buildCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const header = columns.map((c) => escapeCsvValue(c.header)).join(';')
  const body = rows
    .map((row) => columns.map((c) => escapeCsvValue(c.accessor(row))).join(';'))
    .join('\r\n')
  return `${header}\r\n${body}\r\n`
}

export function downloadCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  const csv = buildCsv(columns, rows)
  // BOM UTF-8 garante que Excel-PT-BR abra com acentos corretos.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Helpers para formatos PT-BR — usados nos accessors de número/moeda/data.
export function brlNumber(v: number | null | undefined): string {
  if (v === null || v === undefined) return ''
  // Usa vírgula como separador decimal (compatível com Excel-PT-BR).
  return v.toFixed(2).replace('.', ',')
}

export function brDateString(v: string | null | undefined): string {
  if (!v) return ''
  // De ISO YYYY-MM-DD para dd/MM/yyyy
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
  if (!m) return v
  return `${m[3]}/${m[2]}/${m[1]}`
}
