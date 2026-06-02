import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Tables } from '../../../shared/database.types'

export type PendenteConciliacaoRow = Tables<'v_pendentes_conciliacao'>

export interface PendentesFilters {
  /** Primeiro dia do mês (YYYY-MM-DD) — usado quando dataInicio/Fim ausentes. */
  periodo?: string | null
  /** Intervalo custom (sobrepõe periodo). */
  dataInicio?: string | null
  dataFimExclusive?: string | null
  /** Filtra por conta bancária (origem OU destino). */
  contaId?: string | null
}

export const conciliacaoKeys = {
  pendentes: (filters: PendentesFilters) =>
    ['conciliacao', 'pendentes', filters] as const,
  resumo: (filters: PendentesFilters) =>
    ['conciliacao', 'resumo', filters] as const,
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

function resolveRange(
  f: PendentesFilters,
): { start: string; end: string } | null {
  if (f.dataInicio && f.dataFimExclusive) {
    return { start: f.dataInicio, end: f.dataFimExclusive }
  }
  if (f.periodo) return periodoBounds(f.periodo)
  return null
}

export const pendentesQuery = (filters: PendentesFilters) =>
  queryOptions({
    queryKey: conciliacaoKeys.pendentes(filters),
    queryFn: async (): Promise<PendenteConciliacaoRow[]> => {
      const range = resolveRange(filters)
      let q = supabase
        .from('v_pendentes_conciliacao')
        .select('*')
        .order('data', { ascending: false })
      if (range) {
        q = q.gte('data', range.start).lt('data', range.end)
      }
      if (filters.contaId) {
        q = q.or(
          `conta_origem_id.eq.${filters.contaId},conta_destino_id.eq.${filters.contaId}`,
        )
      }
      const { data, error } = await q
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

export const conciliacaoResumoQuery = (filters: PendentesFilters) =>
  queryOptions({
    queryKey: conciliacaoKeys.resumo(filters),
    queryFn: async (): Promise<ConciliacaoResumo> => {
      const range = resolveRange(filters)
      const buildBase = () => {
        let q = supabase
          .from('lancamentos')
          .select('*', { count: 'exact', head: true })
          .is('estorno_de_id', null)
        if (range) q = q.gte('data', range.start).lt('data', range.end)
        if (filters.contaId) {
          q = q.or(
            `conta_origem_id.eq.${filters.contaId},conta_destino_id.eq.${filters.contaId}`,
          )
        }
        return q
      }
      const [totalRes, conciliadosRes] = await Promise.all([
        buildBase(),
        buildBase().not('conciliado_em', 'is', null),
      ])
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
  /**
   * Data de compensação (opcional, ISO YYYY-MM-DD).
   * Quando preenchida, o campo `data` do lançamento é REESCRITO pra essa data
   * — ou seja, a movimentação passa a contar pro saldo/conferência como se
   * tivesse acontecido nessa data. Útil quando a baixa bancária confirmou
   * uma transação retroativa (compensação D+2 etc.) ou futura.
   */
  dataCompensacao?: string | null
}

export async function conciliarLancamento(input: ConciliarInput): Promise<void> {
  type LancUpdate = {
    conciliado_em?: string | null
    conciliado_por?: string | null
    conciliacao_observacao?: string | null
    data?: string
  }
  const updates: LancUpdate = {
    conciliado_em: new Date().toISOString(),
    conciliado_por: input.profileId,
    conciliacao_observacao: input.observacao?.trim() || null,
  }
  if (input.dataCompensacao) {
    updates.data = input.dataCompensacao
  }
  // `.select()` força o Supabase a retornar as linhas afetadas. Sem isso,
  // se a RLS bloqueia silenciosamente (0 rows updated, sem erro), a
  // mutation julgava sucesso e o toast mentia. Agora a gente detecta.
  const { data, error } = await supabase
    .from('lancamentos')
    .update(updates)
    .eq('id', input.id)
    .select('id, conciliado_em, data')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(
      'Não foi possível conciliar este lançamento. Você pode não ter permissão, ou o lançamento já não existe.',
    )
  }
}

export interface ConciliarBatchInput {
  ids: string[]
  profileId: string
  observacao?: string | null
}

export interface ConciliarBatchResult {
  /** IDs efetivamente conciliados (consideram RLS — quem o backend deixou). */
  conciliados: string[]
  /** IDs que NÃO foram conciliados (RLS / não existem / já estavam conciliados). */
  falhou: string[]
}

/**
 * Concilia vários lançamentos numa única chamada via `.in('id', ids)`.
 * Mais rápido que um loop client-side (1 request × N) e atômico no banco.
 *
 * Os IDs que NÃO retornam no `data` são considerados "falhou" — caso a RLS
 * bloqueie silenciosamente algum, o caller mostra isso pro usuário em vez
 * de fingir que tudo deu certo.
 */
export async function conciliarLancamentosBatch(
  input: ConciliarBatchInput,
): Promise<ConciliarBatchResult> {
  if (input.ids.length === 0) {
    return { conciliados: [], falhou: [] }
  }
  const updates = {
    conciliado_em: new Date().toISOString(),
    conciliado_por: input.profileId,
    conciliacao_observacao: input.observacao?.trim() || null,
  }
  const { data, error } = await supabase
    .from('lancamentos')
    .update(updates)
    .in('id', input.ids)
    // Só pega quem ainda estava pendente — evita re-conciliar e gastar
    // updates à toa quando o usuário marca um já conciliado por engano.
    .is('conciliado_em', null)
    .select('id')
  if (error) throw error
  const conciliadosSet = new Set((data ?? []).map((r) => r.id))
  const conciliados = input.ids.filter((id) => conciliadosSet.has(id))
  const falhou = input.ids.filter((id) => !conciliadosSet.has(id))
  return { conciliados, falhou }
}

export async function desfazerConciliacao(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('lancamentos')
    .update({
      conciliado_em: null,
      conciliado_por: null,
      conciliacao_observacao: null,
    })
    .eq('id', id)
    .select('id, conciliado_em')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(
      'Não foi possível desfazer a conciliação. Você pode não ter permissão.',
    )
  }
}
