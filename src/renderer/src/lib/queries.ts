import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Tables } from '../../../shared/database.types'

export type Empresa = Tables<'empresas'>
// ContaBancaria estende com is_caixa_fisico (adicionada via migration
// mas o database.types ainda não foi regenerado).
export type ContaBancaria = Tables<'contas_bancarias'> & {
  is_caixa_fisico: boolean
}
export type CentroCusto = Tables<'centros_de_custo'>
export type TipoOperacao = Tables<'tipos_operacao'>
export type SaldoGeralRow = Tables<'v_saldo_geral'>
export type Lancamento = Tables<'lancamentos'>

export const queryKeys = {
  empresas: ['catalog', 'empresas'] as const,
  contas: ['catalog', 'contas'] as const,
  centros: ['catalog', 'centros'] as const,
  tiposOperacao: ['catalog', 'tipos_operacao'] as const,
  fornecedores: ['catalog', 'fornecedores'] as const,
  profiles: ['catalog', 'profiles'] as const,
  saldoGeral: (filters?: SaldoGeralFilters) =>
    ['saldo_geral', filters ?? {}] as const,
  lancamentosRecentes: ['lancamentos', 'recentes'] as const,
  lancamentosCountMes: (periodo: string) =>
    ['lancamentos', 'count_mes', periodo] as const,
}

const FIVE_MIN = 1000 * 60 * 5

async function fetchAll<T>(
  table: 'empresas' | 'contas_bancarias' | 'centros_de_custo' | 'tipos_operacao',
): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*').eq('ativo', true)
  if (error) throw error
  return (data ?? []) as T[]
}

export const empresasQuery = queryOptions({
  queryKey: queryKeys.empresas,
  queryFn: () => fetchAll<Empresa>('empresas'),
  staleTime: FIVE_MIN,
})

export const contasQuery = queryOptions({
  queryKey: queryKeys.contas,
  queryFn: () => fetchAll<ContaBancaria>('contas_bancarias'),
  staleTime: FIVE_MIN,
})

export const centrosCustoQuery = queryOptions({
  queryKey: queryKeys.centros,
  queryFn: () => fetchAll<CentroCusto>('centros_de_custo'),
  staleTime: FIVE_MIN,
})

export const tiposOperacaoQuery = queryOptions({
  queryKey: queryKeys.tiposOperacao,
  queryFn: () => fetchAll<TipoOperacao>('tipos_operacao'),
  staleTime: FIVE_MIN,
})

export interface SaldoGeralFilters {
  /** ISO date (YYYY-MM-DD) representing the first day of the desired month. */
  periodo?: string
  empresaIds?: string[]
  onlyDivergentes?: boolean
}

/**
 * Calcula o intervalo [start, endInclusive] do mês a partir do primeiro
 * dia (formato YYYY-MM-DD). Pra alimentar a RPC `dashboard_saldo_geral_intervalo`.
 */
function monthBounds(
  periodoIso: string,
): { dataInicio: string; dataFim: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodoIso)) return null
  const [y, m] = periodoIso.split('-').map((s) => Number.parseInt(s, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null
  const start = `${periodoIso.slice(0, 7)}-01`
  // Último dia do mês: dia 0 do mês seguinte
  const lastDay = new Date(y!, m!, 0)
  const fim = `${y}-${String(m).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
  return { dataInicio: start, dataFim: fim }
}

export const saldoGeralQuery = (filters: SaldoGeralFilters = {}) =>
  queryOptions({
    queryKey: queryKeys.saldoGeral(filters),
    queryFn: async (): Promise<SaldoGeralRow[]> => {
      // A view `v_saldo_geral` tem um bug estrutural: o JOIN com movs_periodo
      // usa `si.periodo` (do saldo_inicial cadastrado) em vez do período
      // filtrado. Resultado: filtrar por outro mês retorna zero pra
      // contas cujo saldo_inicial foi cadastrado num mês diferente.
      // Solução: rotear pra mesma RPC do modo "intervalo", passando os
      // bounds do mês — assim Dashboard e Saldo Geral (mês) ficam corretos.
      if (filters.periodo) {
        const bounds = monthBounds(filters.periodo)
        if (bounds) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const client = supabase as any
          const { data, error } = await client.rpc(
            'dashboard_saldo_geral_intervalo',
            {
              p_data_inicio: bounds.dataInicio,
              p_data_fim: bounds.dataFim,
              p_conta_ids: null,
              p_empresa_ids:
                filters.empresaIds && filters.empresaIds.length > 0
                  ? filters.empresaIds
                  : null,
            },
          )
          if (error) throw error as Error
          let rows = (data ?? []) as SaldoGeralRow[]
          if (filters.onlyDivergentes) {
            rows = rows.filter((r) => r.status === 'DIVERGENTE')
          }
          return rows
        }
      }

      // Fallback (sem período): usa a view direto, sem filtro temporal.
      let query = supabase.from('v_saldo_geral').select('*')

      if (filters.empresaIds && filters.empresaIds.length > 0) {
        query = query.in('empresa_id', filters.empresaIds)
      }
      if (filters.onlyDivergentes) {
        query = query.eq('status', 'DIVERGENTE')
      }

      const { data, error } = await query.order('empresa', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 30,
  })

export const lancamentosRecentesQuery = queryOptions({
  queryKey: queryKeys.lancamentosRecentes,
  queryFn: async (): Promise<Lancamento[]> => {
    const { data, error } = await supabase
      .from('lancamentos')
      .select('*')
      .order('data', { ascending: false })
      .limit(100)
    if (error) throw error
    return data ?? []
  },
  staleTime: 1000 * 30,
})

export const lancamentosCountMesQuery = (periodoIsoFirstDay: string) =>
  queryOptions({
    queryKey: queryKeys.lancamentosCountMes(periodoIsoFirstDay),
    queryFn: async (): Promise<number> => {
      const start = periodoIsoFirstDay
      const startDate = new Date(`${start}T00:00:00`)
      const next = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)
      const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`

      const { count, error } = await supabase
        .from('lancamentos')
        .select('*', { count: 'exact', head: true })
        .gte('data', start)
        .lt('data', end)
      if (error) throw error
      return count ?? 0
    },
    staleTime: 1000 * 30,
  })

/** Returns the first day of the current month as YYYY-MM-DD. */
export function currentPeriodoIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}
