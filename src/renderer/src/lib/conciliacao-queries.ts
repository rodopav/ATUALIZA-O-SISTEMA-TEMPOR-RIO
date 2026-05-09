import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Tables } from '../../../shared/database.types'

export type PendenteConciliacaoRow = Tables<'v_pendentes_conciliacao'>

export interface PendentesFilters {
  /** Primeiro dia do mês (YYYY-MM-DD). */
  periodo: string
}

export const conciliacaoKeys = {
  pendentes: (periodo: string) => ['conciliacao', 'pendentes', periodo] as const,
  resumo: (periodo: string) => ['conciliacao', 'resumo', periodo] as const,
}

function periodoBounds(periodo: string): { start: string; end: string } {
  const [yearStr, monthStr] = periodo.split('-')
  const year = Number.parseInt(yearStr ?? '', 10)
  const month = Number.parseInt(monthStr ?? '', 10)
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 1)
  const fmt = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: fmt(startDate), end: fmt(endDate) }
}

export const pendentesQuery = (filters: PendentesFilters) =>
  queryOptions({
    queryKey: conciliacaoKeys.pendentes(filters.periodo),
    queryFn: async (): Promise<PendenteConciliacaoRow[]> => {
      const { start, end } = periodoBounds(filters.periodo)
      const { data, error } = await supabase
        .from('v_pendentes_conciliacao')
        .select('*')
        .gte('data', start)
        .lt('data', end)
        .order('data', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 15,
  })

export interface ConciliacaoResumo {
  pendentes: number
  conciliados: number
  total: number
  percentualConciliado: number
}

export const conciliacaoResumoQuery = (periodo: string) =>
  queryOptions({
    queryKey: conciliacaoKeys.resumo(periodo),
    queryFn: async (): Promise<ConciliacaoResumo> => {
      const { start, end } = periodoBounds(periodo)
      // Total de lançamentos do período (excluindo estornos para coerência).
      const totalQ = supabase
        .from('lancamentos')
        .select('*', { count: 'exact', head: true })
        .gte('data', start)
        .lt('data', end)
        .is('estorno_de_id', null)

      const conciliadosQ = supabase
        .from('lancamentos')
        .select('*', { count: 'exact', head: true })
        .gte('data', start)
        .lt('data', end)
        .is('estorno_de_id', null)
        .not('conciliado_em', 'is', null)

      const [totalRes, conciliadosRes] = await Promise.all([totalQ, conciliadosQ])
      if (totalRes.error) throw totalRes.error
      if (conciliadosRes.error) throw conciliadosRes.error

      const total = totalRes.count ?? 0
      const conciliados = conciliadosRes.count ?? 0
      const pendentes = Math.max(total - conciliados, 0)
      const percentualConciliado = total === 0 ? 100 : (conciliados / total) * 100
      return { pendentes, conciliados, total, percentualConciliado }
    },
    staleTime: 1000 * 15,
  })

export interface ConciliarInput {
  id: string
  observacao: string | null
  profileId: string
}

export async function conciliarLancamento(input: ConciliarInput): Promise<void> {
  const { error } = await supabase
    .from('lancamentos')
    .update({
      conciliado_em: new Date().toISOString(),
      conciliado_por: input.profileId,
      conciliacao_observacao: input.observacao?.trim() || null,
    })
    .eq('id', input.id)
  if (error) throw error
}

export async function desfazerConciliacao(id: string): Promise<void> {
  const { error } = await supabase
    .from('lancamentos')
    .update({
      conciliado_em: null,
      conciliado_por: null,
      conciliacao_observacao: null,
    })
    .eq('id', id)
  if (error) throw error
}
