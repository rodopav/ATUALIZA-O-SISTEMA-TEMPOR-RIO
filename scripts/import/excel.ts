// Leitura e parsing das planilhas FINANCEIRO - * e SALDO GERAL.

import type { CellValue, Row, Worksheet } from 'exceljs'

import {
  COL_BANCO_ENTRADA,
  COL_BANCO_SAIDA,
  COL_CENTRO_CUSTO,
  COL_DATA,
  COL_DESCRICAO,
  COL_FORNECEDOR_CLIENTE,
  COL_NATUREZA,
  COL_OPERACAO,
  COL_RI,
  COL_VALOR,
  SALDO_COL_CONTA,
  SALDO_COL_VALOR,
  type Catalogs,
  type ImportError,
  type ImportWarning,
  type LancamentoInsert,
  type ProcessedRow,
  type SheetProcessResult,
  type TransferPair,
} from './types.js'
import { descriptionSimilarity, fuzzyLookup, normalize } from './match.js'

// --------- Helpers de leitura de células ---------

function unwrap(value: CellValue | undefined): unknown {
  if (value === null || value === undefined) return null

  // Date
  if (value instanceof Date) return value

  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  // RichText -> concat
  if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((rt) => rt.text).join('')
  }

  // Hyperlink -> texto visível
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text
  }

  // Fórmula -> resultado calculado
  if (typeof value === 'object' && 'result' in value) {
    const r = (value as { result?: unknown }).result
    if (r === undefined || r === null) return null
    return r
  }

  // Erro de célula
  if (typeof value === 'object' && 'error' in value) return null

  return null
}

function readString(value: CellValue | undefined): string | null {
  const u = unwrap(value)
  if (u === null) return null
  if (typeof u === 'string') {
    const t = u.trim()
    return t.length === 0 ? null : t
  }
  if (typeof u === 'number') return String(u)
  if (u instanceof Date) return u.toISOString().slice(0, 10)
  if (typeof u === 'boolean') return u ? 'true' : 'false'
  return null
}

function readNumber(value: CellValue | undefined): number | null {
  const u = unwrap(value)
  if (u === null) return null
  if (typeof u === 'number' && Number.isFinite(u)) return u
  if (typeof u === 'string') {
    // aceita "1.234,56" ou "1234.56"
    const cleaned = u.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function readDateISO(value: CellValue | undefined): string | null {
  const u = unwrap(value)
  if (u === null) return null
  if (u instanceof Date) {
    // Excel grava em UTC mesmo sem timezone — pegamos os componentes UTC para evitar drift.
    const y = u.getUTCFullYear()
    const m = String(u.getUTCMonth() + 1).padStart(2, '0')
    const d = String(u.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof u === 'number') {
    // Excel serial date (1900-based, com bug do ano bissexto)
    const ms = (u - 25569) * 86400 * 1000
    const dt = new Date(ms)
    if (Number.isNaN(dt.getTime())) return null
    const y = dt.getUTCFullYear()
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const d = String(dt.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof u === 'string') {
    // tenta ISO primeiro
    if (/^\d{4}-\d{2}-\d{2}/.test(u)) return u.slice(0, 10)
    // dd/mm/yyyy ou dd-mm-yyyy
    const m = u.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
    if (m && m[1] && m[2] && m[3]) {
      const dd = m[1].padStart(2, '0')
      const mm = m[2].padStart(2, '0')
      let yy = m[3]
      if (yy.length === 2) yy = Number(yy) > 50 ? `19${yy}` : `20${yy}`
      return `${yy}-${mm}-${dd}`
    }
  }
  return null
}

function readNatureza(value: CellValue | undefined): 'ENTRADA' | 'SAIDA' | null {
  const s = readString(value)
  if (s === null) return null
  const norm = normalize(s)
  if (norm === 'entrada') return 'ENTRADA'
  if (norm === 'saida' || norm === 'saída') return 'SAIDA'
  return null
}

// --------- Processamento de linha ---------

type ProcessRowInput = {
  row: Row
  rowNumber: number
  sheetName: string
  responsavelId: string
  catalogs: Catalogs
  fornecedorResolver: (
    rawName: string,
  ) => Promise<{ id: string; created: boolean } | null>
}

async function processRow(input: ProcessRowInput): Promise<{
  row: ProcessedRow | null
  warnings: ImportWarning[]
  errors: ImportError[]
}> {
  const { row, rowNumber, sheetName, responsavelId, catalogs, fornecedorResolver } = input
  const warnings: ImportWarning[] = []
  const errors: ImportError[] = []

  const dataISO = readDateISO(row.getCell(COL_DATA).value)
  if (!dataISO) {
    // linha sem data é considerada vazia/separadora — silencioso
    return { row: null, warnings, errors }
  }

  const valor = readNumber(row.getCell(COL_VALOR).value)
  if (valor === null || valor <= 0) {
    warnings.push({
      kind: 'valor_invalido',
      sheet: sheetName,
      row: rowNumber,
      column: 'F (VALOR)',
      value: readString(row.getCell(COL_VALOR).value),
      message: 'Valor inválido ou zero/negativo.',
    })
    return { row: null, warnings, errors }
  }

  const natureza = readNatureza(row.getCell(COL_NATUREZA).value)
  if (!natureza) {
    warnings.push({
      kind: 'natureza_invalida',
      sheet: sheetName,
      row: rowNumber,
      column: 'G (NATUREZA)',
      value: readString(row.getCell(COL_NATUREZA).value),
      message: 'Natureza não reconhecida — esperado ENTRADA ou SAIDA.',
    })
    return { row: null, warnings, errors }
  }

  const descricao = readString(row.getCell(COL_DESCRICAO).value)
  if (!descricao) {
    warnings.push({
      kind: 'descricao_vazia',
      sheet: sheetName,
      row: rowNumber,
      column: 'E (DESCRICAO)',
      value: null,
      message: 'Descrição vazia — linha ignorada.',
    })
    return { row: null, warnings, errors }
  }

  const tipoStr = readString(row.getCell(COL_OPERACAO).value)
  const tipoEntry = tipoStr ? fuzzyLookup(catalogs.tipos, tipoStr) : null
  if (!tipoEntry) {
    warnings.push({
      kind: 'tipo_operacao_nao_encontrado',
      sheet: sheetName,
      row: rowNumber,
      column: 'H (OPERACAO)',
      value: tipoStr,
      message: 'Tipo de operação não cadastrado. Linha ignorada.',
    })
    return { row: null, warnings, errors }
  }

  const centroStr = readString(row.getCell(COL_CENTRO_CUSTO).value)
  const centroId = centroStr ? fuzzyLookup(catalogs.centros, centroStr) : null
  if (!centroId) {
    warnings.push({
      kind: 'centro_custo_nao_encontrado',
      sheet: sheetName,
      row: rowNumber,
      column: 'K (CENTRO DE CUSTO)',
      value: centroStr,
      message: 'Centro de custo não cadastrado. Linha ignorada.',
    })
    return { row: null, warnings, errors }
  }

  let contaOrigemId: string | null = null
  let contaDestinoId: string | null = null

  if (natureza === 'SAIDA') {
    const ap = readString(row.getCell(COL_BANCO_SAIDA).value)
    contaOrigemId = ap ? fuzzyLookup(catalogs.contas, ap) : null
    if (!contaOrigemId) {
      warnings.push({
        kind: 'conta_origem_nao_encontrada',
        sheet: sheetName,
        row: rowNumber,
        column: 'I (BANCO SAIDA)',
        value: ap,
        message: 'Conta de origem não cadastrada. Linha ignorada.',
      })
      return { row: null, warnings, errors }
    }
  } else {
    const ap = readString(row.getCell(COL_BANCO_ENTRADA).value)
    contaDestinoId = ap ? fuzzyLookup(catalogs.contas, ap) : null
    if (!contaDestinoId) {
      warnings.push({
        kind: 'conta_destino_nao_encontrada',
        sheet: sheetName,
        row: rowNumber,
        column: 'J (BANCO ENTRADA)',
        value: ap,
        message: 'Conta de destino não cadastrada. Linha ignorada.',
      })
      return { row: null, warnings, errors }
    }
  }

  const fornecedorRaw = readString(row.getCell(COL_FORNECEDOR_CLIENTE).value)
  let fornecedorId: string | null = null
  if (fornecedorRaw) {
    const resolved = await fornecedorResolver(fornecedorRaw)
    if (resolved) fornecedorId = resolved.id
  }

  const ri = readString(row.getCell(COL_RI).value)

  const insert: LancamentoInsert = {
    data: dataISO,
    descricao,
    valor: Math.round(valor * 100) / 100,
    natureza,
    tipo_operacao_id: tipoEntry.id,
    centro_custo_id: centroId,
    conta_origem_id: contaOrigemId,
    conta_destino_id: contaDestinoId,
    responsavel_id: responsavelId,
    fornecedor_cliente_id: fornecedorId,
    fornecedor_cliente_texto: fornecedorRaw,
    ri,
    observacoes: null,
  }

  return {
    row: {
      insert,
      sourceSheet: sheetName,
      sourceRow: rowNumber,
      isTransferencia: tipoEntry.isTransferencia,
      pairedWithRow: null,
    },
    warnings,
    errors,
  }
}

// --------- API pública ---------

export type ProcessSheetArgs = {
  sheet: Worksheet
  responsavelId: string
  catalogs: Catalogs
  fornecedorResolver: (
    rawName: string,
  ) => Promise<{ id: string; created: boolean } | null>
}

export async function processSheet(args: ProcessSheetArgs): Promise<SheetProcessResult> {
  const { sheet, responsavelId, catalogs, fornecedorResolver } = args
  const rows: ProcessedRow[] = []
  const warnings: ImportWarning[] = []
  const errors: ImportError[] = []
  let rowsRead = 0

  // exceljs eachRow é síncrono, mas precisamos await dentro: copiamos a lista primeiro.
  const collected: Array<{ row: Row; rowNumber: number }> = []
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 1) return // pula header
    collected.push({ row, rowNumber })
  })

  for (const { row, rowNumber } of collected) {
    rowsRead += 1
    try {
      const out = await processRow({
        row,
        rowNumber,
        sheetName: sheet.name,
        responsavelId,
        catalogs,
        fornecedorResolver,
      })
      warnings.push(...out.warnings)
      errors.push(...out.errors)
      if (out.row) rows.push(out.row)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push({ sheet: sheet.name, row: rowNumber, message })
    }
  }

  return { rows, warnings, errors, rowsRead }
}

// --------- Pareamento de transferências ---------

const TRANSFER_SIM_THRESHOLD = 0.85

export function pairTransferencias(rows: ProcessedRow[]): {
  paired: ProcessedRow[]
  pairs: TransferPair[]
  warnings: ImportWarning[]
} {
  const pairs: TransferPair[] = []
  const warnings: ImportWarning[] = []
  const used = new Set<number>()
  const paired: ProcessedRow[] = []

  // separa transferências e demais.
  const transferIdx: number[] = []
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i]
    if (r && r.isTransferencia) transferIdx.push(i)
  }

  for (const i of transferIdx) {
    if (used.has(i)) continue
    const a = rows[i]
    if (!a) continue
    const aIns = a.insert
    if (!aIns.natureza) continue

    let bestJ: number | null = null
    let bestSim = -1

    for (const j of transferIdx) {
      if (j === i || used.has(j)) continue
      const b = rows[j]
      if (!b) continue
      const bIns = b.insert
      if (b.sourceSheet !== a.sourceSheet) continue
      if (aIns.natureza === bIns.natureza) continue
      if (aIns.data !== bIns.data) continue
      if (Math.abs(aIns.valor - bIns.valor) > 0.005) continue
      const sim = descriptionSimilarity(aIns.descricao, bIns.descricao)
      if (sim >= TRANSFER_SIM_THRESHOLD && sim > bestSim) {
        bestSim = sim
        bestJ = j
      }
    }

    if (bestJ === null) {
      warnings.push({
        kind: 'transferencia_nao_pareada',
        sheet: a.sourceSheet,
        row: a.sourceRow,
        column: 'H (OPERACAO)',
        value: null,
        message: `Transferência sem par detectada (data=${aIns.data} valor=${aIns.valor}). Importada como ${aIns.natureza} simples.`,
      })
      continue
    }

    const b = rows[bestJ]
    if (!b) continue

    const entrada = a.insert.natureza === 'ENTRADA' ? a : b
    const saida = a.insert.natureza === 'SAIDA' ? a : b

    used.add(i)
    used.add(bestJ)

    const merged: ProcessedRow = {
      insert: {
        ...entrada.insert,
        natureza: 'SAIDA', // transferências internas seguem como SAIDA conforme regra origem→destino.
        conta_origem_id: saida.insert.conta_origem_id,
        conta_destino_id: entrada.insert.conta_destino_id,
        // priorizamos o RI que existir (entrada usualmente).
        ri: entrada.insert.ri ?? saida.insert.ri ?? null,
        descricao: entrada.insert.descricao,
      },
      sourceSheet: entrada.sourceSheet,
      sourceRow: entrada.sourceRow,
      isTransferencia: true,
      pairedWithRow: saida.sourceRow,
    }

    pairs.push({
      sheet: entrada.sourceSheet,
      rowEntrada: entrada.sourceRow,
      rowSaida: saida.sourceRow,
      data: entrada.insert.data,
      valor: entrada.insert.valor,
      descricao: entrada.insert.descricao,
      contaOrigem: saida.insert.conta_origem_id ?? null,
      contaDestino: entrada.insert.conta_destino_id ?? null,
    })

    paired.push(merged)
  }

  // Acrescenta tudo que não foi consumido como par.
  for (let i = 0; i < rows.length; i += 1) {
    if (used.has(i)) continue
    const r = rows[i]
    if (r) paired.push(r)
  }

  return { paired, pairs, warnings }
}

// --------- Saldos iniciais ---------

export type RawSaldo = {
  apelidoConta: string
  valor: number
  rowNumber: number
}

export function readSaldosIniciais(sheet: Worksheet): {
  saldos: RawSaldo[]
  warnings: ImportWarning[]
} {
  const saldos: RawSaldo[] = []
  const warnings: ImportWarning[] = []

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 1) return // header
    const apelido = readString(row.getCell(SALDO_COL_CONTA).value)
    const valor = readNumber(row.getCell(SALDO_COL_VALOR).value)
    if (!apelido) return
    if (valor === null) {
      warnings.push({
        kind: 'valor_invalido',
        sheet: sheet.name,
        row: rowNumber,
        column: 'C (SALDO INICIAL)',
        value: readString(row.getCell(SALDO_COL_VALOR).value),
        message: `Saldo inicial inválido para "${apelido}". Linha ignorada.`,
      })
      return
    }
    saldos.push({ apelidoConta: apelido, valor, rowNumber })
  })

  return { saldos, warnings }
}
