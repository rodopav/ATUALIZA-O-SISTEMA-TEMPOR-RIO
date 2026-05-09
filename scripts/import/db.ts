// Inserções/upserts no Supabase em lotes.

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '../../src/shared/database.types.js'
import { fuzzyLookup } from './match.js'
import {
  SALDO_GERAL_SHEET,
  type Catalogs,
  type ImportError,
  type ImportWarning,
  type LancamentoInsert,
  type SaldoInicialInsert,
} from './types.js'

const BATCH_SIZE = 200

export async function insertLancamentosBatched(
  client: SupabaseClient<Database>,
  rows: LancamentoInsert[],
  apply: boolean,
  log: (msg: string) => void,
): Promise<{ inserted: number; errors: ImportError[] }> {
  const errors: ImportError[] = []
  let inserted = 0

  if (!apply) {
    log(`Dry-run: ${rows.length} lançamentos seriam inseridos.`)
    return { inserted: 0, errors }
  }

  // Filtra fornecedor pseudo-ids (que não existiriam em apply, mas por segurança).
  const cleaned = rows.map((r) => {
    if (r.fornecedor_cliente_id && r.fornecedor_cliente_id.startsWith('dryrun:')) {
      return { ...r, fornecedor_cliente_id: null }
    }
    return r
  })

  for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
    const slice = cleaned.slice(i, i + BATCH_SIZE)
    const resp = await client.from('lancamentos').insert(slice)
    const idx = Math.floor(i / BATCH_SIZE) + 1
    if (resp.error) {
      errors.push({
        sheet: '(batch)',
        row: null,
        message: `Lote ${idx} falhou: ${resp.error.message}`,
      })
      continue
    }
    inserted += slice.length
    log(`Lote ${idx}: ${slice.length} lançamentos inseridos.`)
  }

  return { inserted, errors }
}

export function periodoAtual(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export async function upsertSaldosIniciais(args: {
  client: SupabaseClient<Database>
  catalogs: Catalogs
  saldos: Array<{ apelidoConta: string; valor: number; rowNumber: number }>
  apply: boolean
  log: (msg: string) => void
}): Promise<{ count: number; warnings: ImportWarning[]; errors: ImportError[] }> {
  const { client, catalogs, saldos, apply, log } = args
  const periodo = periodoAtual()
  const warnings: ImportWarning[] = []
  const errors: ImportError[] = []
  const inserts: SaldoInicialInsert[] = []

  for (const s of saldos) {
    const contaId = fuzzyLookup(catalogs.contas, s.apelidoConta)
    if (!contaId) {
      warnings.push({
        kind: 'conta_destino_nao_encontrada',
        sheet: SALDO_GERAL_SHEET,
        row: s.rowNumber,
        column: 'B (CONTA)',
        value: s.apelidoConta,
        message: 'Conta não cadastrada no Supabase; saldo inicial ignorado.',
      })
      continue
    }
    inserts.push({
      conta_id: contaId,
      periodo,
      valor: Math.round(s.valor * 100) / 100,
    })
  }

  if (!apply) {
    log(`Dry-run: ${inserts.length} saldos iniciais seriam upserted (período ${periodo}).`)
    return { count: 0, warnings, errors }
  }

  if (inserts.length === 0) return { count: 0, warnings, errors }

  const resp = await client
    .from('saldos_iniciais')
    .upsert(inserts, { onConflict: 'conta_id,periodo' })
  if (resp.error) {
    errors.push({
      sheet: SALDO_GERAL_SHEET,
      row: null,
      message: `Upsert de saldos_iniciais falhou: ${resp.error.message}`,
    })
    return { count: 0, warnings, errors }
  }
  log(`${inserts.length} saldos iniciais upserted (período ${periodo}).`)
  return { count: inserts.length, warnings, errors }
}
