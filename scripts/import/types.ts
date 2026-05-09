// Tipos compartilhados pelo importador de Excel.
// Mantido isolado para que `scripts/import-excel.ts` permaneça abaixo de 500 linhas.

import type { TablesInsert } from '../../src/shared/database.types.js'

export type LancamentoInsert = TablesInsert<'lancamentos'>
export type SaldoInicialInsert = TablesInsert<'saldos_iniciais'>
export type FornecedorInsert = TablesInsert<'fornecedores_clientes'>

export type WarningKind =
  | 'tipo_operacao_nao_encontrado'
  | 'centro_custo_nao_encontrado'
  | 'conta_origem_nao_encontrada'
  | 'conta_destino_nao_encontrada'
  | 'responsavel_nao_encontrado'
  | 'data_invalida'
  | 'valor_invalido'
  | 'natureza_invalida'
  | 'descricao_vazia'
  | 'transferencia_nao_pareada'
  | 'sheet_ignorada'

export type ImportWarning = {
  kind: WarningKind
  sheet: string
  row: number | null
  column: string | null
  value: string | null
  message: string
}

export type ImportError = {
  sheet: string
  row: number | null
  message: string
}

export type TransferPair = {
  sheet: string
  rowEntrada: number
  rowSaida: number
  data: string
  valor: number
  descricao: string
  contaOrigem: string | null
  contaDestino: string | null
}

export type ProcessedRow = {
  insert: LancamentoInsert
  sourceSheet: string
  sourceRow: number
  isTransferencia: boolean
  pairedWithRow: number | null
}

export type SheetProcessResult = {
  rows: ProcessedRow[]
  warnings: ImportWarning[]
  errors: ImportError[]
  rowsRead: number
}

export type Catalogs = {
  // apelido normalizado -> id
  contas: Map<string, string>
  // nome normalizado -> id
  centros: Map<string, string>
  // nome normalizado -> { id, isTransferencia }
  tipos: Map<string, { id: string; isTransferencia: boolean }>
  // nome_completo normalizado -> id
  profiles: Map<string, string>
  // nome normalizado -> id
  fornecedores: Map<string, string>
  // mapa de raw -> normalizado para enriquecer logs
  contasRaw: Map<string, string>
  centrosRaw: Map<string, string>
  tiposRaw: Map<string, string>
}

export type ImportStats = {
  startedAt: string
  finishedAt: string
  xlsxPath: string
  rowsRead: number
  rowsInserted: number
  rowsSkipped: number
  saldosUpserted: number
  fornecedoresCriados: number
  pairsDetected: TransferPair[]
  warnings: ImportWarning[]
  errors: ImportError[]
  sheetSummary: Array<{ sheet: string; lidas: number; processadas: number; pulos: number }>
}

export type EnvVars = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

// Mapa de sheet -> nome do responsável a procurar em profiles.nome_completo.
export const SHEET_RESPONSAVEL_MAP: ReadonlyMap<string, string> = new Map([
  ['FINANCEIRO - DERIK', 'derik'],
  ['FINANCEIRO - JULIANA', 'juliana'],
  ['FINANCEIRO - RH', 'rh'],
  ['FINANCEIRO - YURI', 'yuri'],
  ['FINANCEIRO - MARIA EDUARDA', 'maria eduarda'],
])

export const SALDO_GERAL_SHEET = 'SALDO GERAL'

// Colunas do layout FINANCEIRO - * (1-based, conforme spec).
export const COL_DATA = 1
export const COL_MES = 2
export const COL_RI = 3
export const COL_FORNECEDOR_CLIENTE = 4
export const COL_DESCRICAO = 5
export const COL_VALOR = 6
export const COL_NATUREZA = 7
export const COL_OPERACAO = 8
export const COL_BANCO_SAIDA = 9
export const COL_BANCO_ENTRADA = 10
export const COL_CENTRO_CUSTO = 11

// Colunas do SALDO GERAL (1-based).
export const SALDO_COL_CONTA = 2
export const SALDO_COL_VALOR = 3
