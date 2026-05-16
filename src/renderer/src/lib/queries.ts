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

export const saldoGeralQuery = (filters: SaldoGeralFilters = {}) =>
  queryOptions({
    queryKey: queryKeys.saldoGeral(filters),
    queryFn: async (): Promise<SaldoGeralRow[]> => {
      let query = supabase.from('v_saldo_geral').select('*')

      if (filters.periodo) {
        query = query.eq('periodo', filters.periodo)
      }
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
