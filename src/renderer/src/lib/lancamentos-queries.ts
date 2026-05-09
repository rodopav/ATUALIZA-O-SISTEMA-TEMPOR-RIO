import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Tables } from '../../../shared/database.types'

export type FornecedorCliente = Tables<'fornecedores_clientes'>

/**
 * Joined "row" returned by the lançamentos grid query. Mirrors the Supabase
 * select-string used in `lancamentosListQuery` below.
 */
export interface LancamentoRow {
  id: string
  data: string
  descricao: string
  valor: number
  natureza: 'ENTRADA' | 'SAIDA'
  tipo_operacao_id: string
  centro_custo_id: string
  conta_origem_id: string | null
  conta_destino_id: string | null
  fornecedor_cliente_id: string | null
  fornecedor_cliente_texto: string | null
  ri: string | null
  observacoes: string | null
  responsavel_id: string
  estorno_de_id: string | null
  motivo_estorno: string | null
  conciliado_em: string | null
  conciliado_por: string | null
  conciliacao_observacao: string | null
  created_at: string
  updated_at: string
  conta_origem: { apelido: string } | null
  conta_destino: { apelido: string } | null
  centro: { nome: string } | null
  tipo: { nome: string; is_transferencia: boolean } | null
  fornecedor: { nome: string } | null
  responsavel: { nome_completo: string } | null
  conciliador: { nome_completo: string } | null
  estorno: { id: string } | null
}

/**
 * Filters applied client-side and via Postgrest where appropriate.
 */
export interface LancamentosListFilters {
  /** YYYY-MM-DD month-anchor (first day). Filters within the month. */
  periodo?: string | null
  natureza?: 'ENTRADA' | 'SAIDA' | null
  centroCustoId?: string | null
  search?: string | null
}

const SELECT_WITH_RELATIONS = `
  *,
  conta_origem:contas_bancarias!conta_origem_id(apelido),
  conta_destino:contas_bancarias!conta_destino_id(apelido),
  centro:centros_de_custo(nome),
  tipo:tipos_operacao(nome,is_transferencia),
  fornecedor:fornecedores_clientes(nome),
  responsavel:profiles!responsavel_id(nome_completo),
  conciliador:profiles!conciliado_por(nome_completo),
  estorno:lancamentos!estorno_de_id(id)
`.trim()

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

export const lancamentosListQuery = (filters: LancamentosListFilters) =>
  queryOptions({
    queryKey: ['lancamentos', 'list', filters] as const,
    queryFn: async (): Promise<LancamentoRow[]> => {
      let q = supabase
        .from('lancamentos')
        .select(SELECT_WITH_RELATIONS)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200)

      if (filters.periodo) {
        const { start, end } = periodoBounds(filters.periodo)
        q = q.gte('data', start).lt('data', end)
      }
      if (filters.natureza) {
        q = q.eq('natureza', filters.natureza)
      }
      if (filters.centroCustoId) {
        q = q.eq('centro_custo_id', filters.centroCustoId)
      }
      if (filters.search && filters.search.trim().length > 0) {
        q = q.ilike('descricao', `%${filters.search.trim()}%`)
      }

      const { data, error } = await q
      if (error) throw error
      // Cast through unknown: the inferred Supabase type for select-with-joins
      // is opaque; we declared LancamentoRow above to mirror the chosen shape.
      return (data ?? []) as unknown as LancamentoRow[]
    },
    staleTime: 1000 * 15,
  })

export const lancamentoByIdQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: ['lancamentos', 'detail', id] as const,
    queryFn: async (): Promise<LancamentoRow | null> => {
      if (!id) return null
      const { data, error } = await supabase
        .from('lancamentos')
        .select(SELECT_WITH_RELATIONS)
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return (data as unknown as LancamentoRow | null) ?? null
    },
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  })

export const fornecedoresQuery = queryOptions({
  queryKey: ['catalog', 'fornecedores', 'ativos'] as const,
  queryFn: async (): Promise<FornecedorCliente[]> => {
    const { data, error } = await supabase
      .from('fornecedores_clientes')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (error) throw error
    return data ?? []
  },
  staleTime: 1000 * 60 * 5,
})

/**
 * Calls the `periodo_esta_fechado` RPC to know whether the date is locked.
 */
export async function checkPeriodoFechado(data: string): Promise<boolean> {
  const { data: result, error } = await supabase.rpc('periodo_esta_fechado', {
    p_data: data,
  })
  if (error) throw error
  return Boolean(result)
}
