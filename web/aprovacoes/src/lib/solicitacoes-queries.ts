import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'

export type SolicitacaoStatus = 'PENDENTE' | 'APROVADA' | 'REJEITADA'

export interface Solicitacao {
  id: string
  created_at: string
  /** quando admin aprovou ou rejeitou (banco: resolvida_em) */
  resolvida_em: string | null
  status: SolicitacaoStatus
  valor: number
  descricao: string
  motivo_rejeicao: string | null
  aprovada_em_ausencia: boolean
  liberada_em_ausencia_em: string | null
  solicitante: {
    id: string
    nome_completo: string
  } | null
  conta_destino: {
    id: string
    apelido: string
  } | null
  conta_origem_sugerida: {
    id: string
    apelido: string
  } | null
  /** Quem aprovou/rejeitou (banco: resolvida_por). null se ainda PENDENTE. */
  resolvedor: {
    id: string
    nome_completo: string
  } | null
}

// Nomes das FKs reais (verificadas no pg_constraint):
//   solicitacoes_saldo_solicitante_id_fkey
//   solicitacoes_saldo_conta_destino_id_fkey
//   solicitacoes_saldo_conta_origem_sugerida_id_fkey
//   solicitacoes_saldo_resolvida_por_fkey
// PostgREST silenciosamente falha a query inteira se a FK name não bater.
const SELECT = `
  id, created_at, resolvida_em, status, valor, descricao,
  motivo_rejeicao, aprovada_em_ausencia, liberada_em_ausencia_em,
  solicitante:profiles!solicitacoes_saldo_solicitante_id_fkey(id, nome_completo),
  conta_destino:contas_bancarias!solicitacoes_saldo_conta_destino_id_fkey(id, apelido),
  conta_origem_sugerida:contas_bancarias!solicitacoes_saldo_conta_origem_sugerida_id_fkey(id, apelido),
  resolvedor:profiles!solicitacoes_saldo_resolvida_por_fkey(id, nome_completo)
`

function pickNum(v: unknown): number {
  const n = typeof v === 'string' ? Number.parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : 0
}

function mapRow(r: any): Solicitacao {
  return {
    id: r.id,
    created_at: r.created_at,
    resolvida_em: r.resolvida_em,
    status: r.status,
    valor: pickNum(r.valor),
    descricao: r.descricao ?? '',
    motivo_rejeicao: r.motivo_rejeicao,
    aprovada_em_ausencia: Boolean(r.aprovada_em_ausencia),
    liberada_em_ausencia_em: r.liberada_em_ausencia_em,
    solicitante: r.solicitante ?? null,
    conta_destino: r.conta_destino ?? null,
    conta_origem_sugerida: r.conta_origem_sugerida ?? null,
    resolvedor: r.resolvedor ?? null,
  }
}

export const solicitacoesPendentesQuery = queryOptions({
  queryKey: ['solicitacoes', 'pendentes'] as const,
  queryFn: async (): Promise<Solicitacao[]> => {
    const { data, error } = await supabase
      .from('solicitacoes_saldo')
      .select(SELECT)
      .eq('status', 'PENDENTE')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return ((data ?? []) as any[]).map(mapRow)
  },
  staleTime: 15_000,
})

export const solicitacoesAusenciaQuery = queryOptions({
  queryKey: ['solicitacoes', 'ausencia-pendentes'] as const,
  queryFn: async (): Promise<Solicitacao[]> => {
    const { data, error } = await supabase
      .from('solicitacoes_saldo')
      .select(SELECT)
      .eq('aprovada_em_ausencia', true)
      .eq('status', 'APROVADA')
      .order('liberada_em_ausencia_em', { ascending: false })
      .limit(100)
    if (error) throw error
    return ((data ?? []) as any[]).map(mapRow)
  },
  staleTime: 15_000,
})

export const solicitacoesHistoricoQuery = queryOptions({
  queryKey: ['solicitacoes', 'historico'] as const,
  queryFn: async (): Promise<Solicitacao[]> => {
    const { data, error } = await supabase
      .from('solicitacoes_saldo')
      .select(SELECT)
      .in('status', ['APROVADA', 'REJEITADA'])
      .order('resolvida_em', { ascending: false })
      .limit(50)
    if (error) throw error
    return ((data ?? []) as any[]).map(mapRow)
  },
  staleTime: 30_000,
})

/* ===================== Ações ===================== */

export async function aprovarSolicitacao(
  id: string,
  contaOrigemId: string,
): Promise<void> {
  const { error } = await supabase.rpc('aprovar_solicitacao_saldo', {
    p_solic_id: id,
    p_conta_origem_id: contaOrigemId,
  })
  if (error) throw error
}

export async function rejeitarSolicitacao(id: string, motivo: string): Promise<void> {
  const { error } = await supabase.rpc('rejeitar_solicitacao_saldo', {
    p_solic_id: id,
    p_motivo: motivo,
  })
  if (error) throw error
}

export async function revisarAusencia(
  id: string,
  aprovar: boolean,
  motivo: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('revisar_solicitacao_ausencia', {
    p_solic_id: id,
    p_aprovar: aprovar,
    p_motivo: motivo,
  })
  if (error) throw error
}

export interface CascadePreview {
  qtd: number
  total: number
}

export async function preverCascadeAusencia(id: string): Promise<CascadePreview> {
  const { data, error } = await supabase.rpc('prever_cascade_ausencia', {
    p_solic_id: id,
  })
  if (error) throw error
  const r = (data ?? {}) as Record<string, unknown>
  return {
    qtd: pickNum(r.qtd),
    total: pickNum(r.total),
  }
}

/* ===================== Contas pra origem ===================== */

export interface ContaSugerida {
  id: string
  apelido: string
  banco: string | null
  empresa: string | null
}

export const contasParaOrigemQuery = queryOptions({
  queryKey: ['contas', 'para-origem'] as const,
  queryFn: async (): Promise<ContaSugerida[]> => {
    const { data, error } = await supabase
      .from('v_contas_lookup')
      .select('id, apelido, banco')
      .order('apelido', { ascending: true })
    if (error) throw error
    return ((data ?? []) as any[]).map((r) => ({
      id: r.id,
      apelido: r.apelido,
      banco: r.banco,
      empresa: null,
    }))
  },
  staleTime: 5 * 60_000,
})
