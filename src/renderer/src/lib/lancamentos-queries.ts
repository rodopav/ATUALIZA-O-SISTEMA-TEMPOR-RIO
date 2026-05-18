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
  /** Snapshot do tipo_operacao.is_tarifa no momento do INSERT. */
  is_tarifa: boolean
  /** Marcado pelo trigger enforce_saldo quando saldo < valor + limite > 0. */
  usou_limite: boolean
  created_at: string
  updated_at: string
  conta_origem: { apelido: string; is_caixa_fisico?: boolean } | null
  conta_destino: { apelido: string; is_caixa_fisico?: boolean } | null
  centro: { nome: string } | null
  tipo: { nome: string; is_transferencia: boolean } | null
  fornecedor: { nome: string } | null
  responsavel: { nome_completo: string } | null
  conciliador: { nome_completo: string } | null
  /**
   * Reverse FK lookup — PostgREST retorna ARRAY (one-to-many) com os
   * lançamentos que tem `estorno_de_id = this.id`. Vazio quando não há.
   * Use `hasEstorno(row)` pra checagem segura — `Boolean(row.estorno)`
   * dá true em array vazio.
   */
  estorno: { id: string }[] | null
}

/** True se este lançamento já foi estornado (tem ao menos um filho via estorno_de_id). */
export function hasEstorno(row: Pick<LancamentoRow, 'estorno'>): boolean {
  if (!row.estorno) return false
  if (Array.isArray(row.estorno)) return row.estorno.length > 0
  return true
}

/**
 * Filters applied client-side and via Postgrest where appropriate.
 */
export interface LancamentosListFilters {
  /** YYYY-MM-DD month-anchor (first day). Filters within the month. */
  periodo?: string | null
  /** Custom date range (overrides periodo when ambos definidos). */
  dataInicio?: string | null
  dataFim?: string | null
  natureza?: 'ENTRADA' | 'SAIDA' | null
  centroCustoId?: string | null
  empresaId?: string | null
  contaId?: string | null
  responsavelId?: string | null
  fornecedorId?: string | null
  tipoOperacaoId?: string | null
  /**
   * Multi-select. Array vazio (ou null/undefined) = não filtra. Senão,
   * mostra qualquer linha que case em ANY dos status. Compat: ainda
   * aceita string única (legacy callers).
   */
  status?:
    | Array<'conciliado' | 'pendente' | 'estornado'>
    | 'all'
    | 'conciliado'
    | 'pendente'
    | 'estornado'
    | null
  valorMin?: number | null
  valorMax?: number | null
  search?: string | null
}

const SELECT_WITH_RELATIONS = `
  *,
  conta_origem:contas_bancarias!conta_origem_id(apelido,is_caixa_fisico),
  conta_destino:contas_bancarias!conta_destino_id(apelido,is_caixa_fisico),
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

      // Intervalo: custom range tem prioridade; senão usa o mês.
      if (filters.dataInicio && filters.dataFim) {
        q = q.gte('data', filters.dataInicio).lte('data', filters.dataFim)
      } else if (filters.periodo) {
        const { start, end } = periodoBounds(filters.periodo)
        q = q.gte('data', start).lt('data', end)
      }
      if (filters.natureza) {
        q = q.eq('natureza', filters.natureza)
      }
      if (filters.centroCustoId) {
        q = q.eq('centro_custo_id', filters.centroCustoId)
      }
      if (filters.responsavelId) {
        q = q.eq('responsavel_id', filters.responsavelId)
      }
      if (filters.fornecedorId) {
        q = q.eq('fornecedor_cliente_id', filters.fornecedorId)
      }
      if (filters.tipoOperacaoId) {
        q = q.eq('tipo_operacao_id', filters.tipoOperacaoId)
      }
      if (filters.contaId) {
        // Lançamento entra se a conta é a origem OU a destino.
        q = q.or(
          `conta_origem_id.eq.${filters.contaId},conta_destino_id.eq.${filters.contaId}`,
        )
      }
      if (filters.valorMin !== null && filters.valorMin !== undefined) {
        q = q.gte('valor', filters.valorMin)
      }
      if (filters.valorMax !== null && filters.valorMax !== undefined) {
        q = q.lte('valor', filters.valorMax)
      }
      // Status: aplicado client-side mais abaixo (sobre `rows`). Aceita
      // array (multi) ou string legacy. PostgREST OR de NULL-checks é
      // chato de codificar; com .limit(200) o filtro client é trivial.
      if (filters.search && filters.search.trim().length > 0) {
        q = q.ilike('descricao', `%${filters.search.trim()}%`)
      }

      const { data, error } = await q
      if (error) throw error
      let rows = (data ?? []) as unknown as LancamentoRow[]

      const statusList = Array.isArray(filters.status)
        ? filters.status
        : filters.status && filters.status !== 'all'
          ? [filters.status]
          : []
      // Filtro client-side de status (multi). Reflete a semântica antiga:
      //  - 'conciliado': conciliado_em IS NOT NULL
      //  - 'pendente':   conciliado_em IS NULL AND motivo_estorno IS NULL
      //  - 'estornado':  motivo_estorno IS NOT NULL
      if (statusList.length > 0) {
        rows = rows.filter((r) => {
          if (statusList.includes('conciliado') && r.conciliado_em) return true
          if (
            statusList.includes('pendente') &&
            !r.conciliado_em &&
            !r.motivo_estorno
          )
            return true
          if (statusList.includes('estornado') && r.motivo_estorno) return true
          return false
        })
      }

      // Filtro client-side por empresa: a empresa vem das contas (origem ou
      // destino). Postgrest não permite filtro em embed deep facilmente.
      if (filters.empresaId) {
        // Precisamos do empresa_id pelo lookup; mas o embed atual só traz apelido.
        // Por isso filtrar empresa exige fetch adicional ou apoio no lookup map
        // no front. Deixamos a flag aqui e o componente página resolve via
        // lookup global. (Sem filtro server-side por enquanto.)
      }
      return rows
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
