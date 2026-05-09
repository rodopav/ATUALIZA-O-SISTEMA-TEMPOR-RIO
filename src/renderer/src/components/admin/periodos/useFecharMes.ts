import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../lib/auth-store'
import type { Tables } from '../../../../../shared/database.types'

export type SaldoGeralRow = Tables<'v_saldo_geral'>

export interface PeriodoTotals {
  saldo_inicial: number
  entradas: number
  saidas: number
  saldo_atual: number
  rows: number
}

export function totalsFromRows(rows: SaldoGeralRow[]): PeriodoTotals {
  return rows.reduce(
    (acc, r) => ({
      saldo_inicial: acc.saldo_inicial + Number(r.saldo_inicial ?? 0),
      entradas: acc.entradas + Number(r.entradas ?? 0),
      saidas: acc.saidas + Number(r.saidas ?? 0),
      saldo_atual: acc.saldo_atual + Number(r.saldo_atual ?? 0),
      rows: acc.rows + 1,
    }),
    { saldo_inicial: 0, entradas: 0, saidas: 0, saldo_atual: 0, rows: 0 },
  )
}

export async function fetchPeriodoSummary(periodo: string): Promise<{
  totals: PeriodoTotals
  rows: SaldoGeralRow[]
}> {
  const { data, error } = await supabase
    .from('v_saldo_geral')
    .select('*')
    .eq('periodo', periodo)
  if (error) throw error
  const rows = data ?? []
  return { totals: totalsFromRows(rows), rows }
}

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder()
  const buffer = await crypto.subtle.digest('SHA-256', enc.encode(text))
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface FecharMesArgs {
  periodo: string
  rows: SaldoGeralRow[]
}

export function useFecharMes() {
  const qc = useQueryClient()
  const session = useAuthStore.getState().session
  return useMutation({
    mutationFn: async ({ periodo, rows }: FecharMesArgs): Promise<void> => {
      if (!session) throw new Error('Sessão expirada.')
      const payloadObj = {
        periodo,
        totals: totalsFromRows(rows),
        rows: rows.map((r) => ({
          conta_id: r.conta_id,
          saldo_inicial: Number(r.saldo_inicial ?? 0),
          entradas: Number(r.entradas ?? 0),
          saidas: Number(r.saidas ?? 0),
          saldo_atual: Number(r.saldo_atual ?? 0),
        })),
      }
      const totals_hash = await sha256Hex(JSON.stringify(payloadObj))
      const { error } = await supabase.from('periodos_fechados').insert({
        periodo,
        fechado_por: session.user.id,
        totals_hash,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'periodos_fechados'] })
    },
  })
}

interface ReabrirMesArgs {
  id: string
  motivo: string
}

export function useReabrirMes() {
  const qc = useQueryClient()
  const session = useAuthStore.getState().session
  return useMutation({
    mutationFn: async ({ id, motivo }: ReabrirMesArgs): Promise<void> => {
      if (!session) throw new Error('Sessão expirada.')
      const { error } = await supabase
        .from('periodos_fechados')
        .update({
          reaberto_em: new Date().toISOString(),
          reaberto_por: session.user.id,
          motivo_reabertura: motivo,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'periodos_fechados'] })
    },
  })
}
