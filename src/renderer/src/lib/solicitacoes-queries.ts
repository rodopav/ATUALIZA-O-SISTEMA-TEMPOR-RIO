import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Enums, Tables } from '../../../shared/database.types'

export type SolicitacaoSaldo = Tables<'solicitacoes_saldo'>
export type SolicitacaoStatus = Enums<'status_solicitacao'>

/**
 * Linha enriquecida com joins. Mantemos o shape declarado aqui pois o tipo
 * inferido do select-with-join do Postgrest é opaco.
 */
export interface SolicitacaoSaldoRow {
  id: string
  solicitante_id: string
  conta_destino_id: string
  conta_origem_sugerida_id: string | null
  valor: number
  descricao: string
  centro_custo_id: string | null
  status: SolicitacaoStatus
  resolvida_em: string | null
  resolvida_por: string | null
  motivo_rejeicao: string | null
  conta_origem_efetiva_id: string | null
  lancamento_gerado_id: string | null
  observacao_aprovacao: string | null
  data_compensacao_sugerida: string | null
  created_at: string
  updated_at: string
  conta_destino: { apelido: string } | null
  origem_sugerida: { apelido: string } | null
  origem_efetiva: { apelido: string } | null
  centro: { nome: string } | null
}

/** Versão "admin" — inclui os dados do solicitante. */
export interface AdminSolicitacaoSaldoRow extends SolicitacaoSaldoRow {
  solicitante: { nome_completo: string; email: string } | null
}

export const solicitacoesKeys = {
  all: ['solicitacoes'] as const,
  minhas: (status?: SolicitacaoStatus | null) =>
    ['solicitacoes', 'minhas', status ?? 'all'] as const,
  admin: (status?: SolicitacaoStatus | null) =>
    ['solicitacoes', 'admin', status ?? 'all'] as const,
  pendentesCount: ['solicitacoes', 'pendentes-count'] as const,
}

const SELECT_BASE = `
  id, solicitante_id, conta_destino_id, conta_origem_sugerida_id, valor,
  descricao, centro_custo_id, status, resolvida_em, resolvida_por,
  motivo_rejeicao, conta_origem_efetiva_id, lancamento_gerado_id,
  observacao_aprovacao, data_compensacao_sugerida, created_at, updated_at,
  conta_destino:contas_bancarias!conta_destino_id(apelido),
  origem_sugerida:contas_bancarias!conta_origem_sugerida_id(apelido),
  origem_efetiva:contas_bancarias!conta_origem_efetiva_id(apelido),
  centro:centros_de_custo(nome)
`.trim()

const SELECT_WITH_SOLICITANTE = `${SELECT_BASE},
  solicitante:profiles!solicitante_id(nome_completo, email)
`.trim()

const ONE_MIN = 1000 * 60

/**
 * Lista das próprias solicitações do usuário logado. A RLS de não-admins já
 * filtra por `solicitante_id = auth.uid()`, mas admins enxergam tudo — por
 * isso filtramos explicitamente aqui também, garantindo a consistência da
 * página `/solicitacoes` para qualquer perfil.
 */
export const minhasSolicitacoesQuery = (
  solicitanteId: string | null,
  status?: SolicitacaoStatus | null,
) =>
  queryOptions({
    queryKey: [...solicitacoesKeys.minhas(status), solicitanteId ?? 'none'],
    queryFn: async (): Promise<SolicitacaoSaldoRow[]> => {
      if (!solicitanteId) return []
      let q = supabase
        .from('solicitacoes_saldo')
        .select(SELECT_BASE)
        .eq('solicitante_id', solicitanteId)
        .order('created_at', { ascending: false })
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as SolicitacaoSaldoRow[]
    },
    enabled: Boolean(solicitanteId),
    staleTime: ONE_MIN,
  })

/**
 * Lista completa para administradores (RLS permite). Inclui o nome do
 * solicitante para exibição em tabela.
 */
export const adminSolicitacoesQuery = (
  status?: SolicitacaoStatus | null,
) =>
  queryOptions({
    queryKey: solicitacoesKeys.admin(status),
    queryFn: async (): Promise<AdminSolicitacaoSaldoRow[]> => {
      let q = supabase
        .from('solicitacoes_saldo')
        .select(SELECT_WITH_SOLICITANTE)
        .order('created_at', { ascending: false })
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as AdminSolicitacaoSaldoRow[]
    },
    staleTime: ONE_MIN,
  })

/**
 * Contagem de pendentes — usada no Sidebar (badge "N" ao lado de
 * "Aprovar solicitações"). Polling rápido faz sentido aqui.
 */
export const pendentesCountQuery = queryOptions({
  queryKey: solicitacoesKeys.pendentesCount,
  queryFn: async (): Promise<number> => {
    const { count, error } = await supabase
      .from('solicitacoes_saldo')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDENTE')
    if (error) throw error
    return count ?? 0
  },
  staleTime: 1000 * 30,
})

/** KPIs do dashboard administrativo (contagens). */
export interface SolicitacoesKpis {
  pendentes: number
  aprovadasNoMes: number
  rejeitadasNoMes: number
}

export const adminKpisQuery = queryOptions({
  queryKey: ['solicitacoes', 'admin', 'kpis'] as const,
  queryFn: async (): Promise<SolicitacoesKpis> => {
    const now = new Date()
    const inicioMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00.000Z`
    const countOf = (status: SolicitacaoStatus, fromIso?: string) => {
      let q = supabase
        .from('solicitacoes_saldo')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)
      if (fromIso) q = q.gte('resolvida_em', fromIso)
      return q
    }
    const [p, a, r] = await Promise.all([
      countOf('PENDENTE'),
      countOf('APROVADA', inicioMes),
      countOf('REJEITADA', inicioMes),
    ])
    if (p.error) throw p.error
    if (a.error) throw a.error
    if (r.error) throw r.error
    return {
      pendentes: p.count ?? 0,
      aprovadasNoMes: a.count ?? 0,
      rejeitadasNoMes: r.count ?? 0,
    }
  },
  staleTime: 1000 * 30,
})

// ---------- Mutations ----------

export interface CriarSolicitacaoInput {
  solicitante_id: string
  conta_destino_id: string
  conta_origem_sugerida_id: string | null
  valor: number
  descricao: string
  centro_custo_id: string | null
  /** Data efetiva sugerida (YYYY-MM-DD) — opcional. */
  data_compensacao_sugerida?: string | null
}

export async function criarSolicitacao(
  input: CriarSolicitacaoInput,
): Promise<string> {
  type SolicInsert = {
    solicitante_id: string
    conta_destino_id: string
    conta_origem_sugerida_id: string | null
    valor: number
    descricao: string
    centro_custo_id: string | null
    data_compensacao_sugerida?: string | null
  }
  const payload: SolicInsert = {
    solicitante_id: input.solicitante_id,
    conta_destino_id: input.conta_destino_id,
    conta_origem_sugerida_id: input.conta_origem_sugerida_id,
    valor: input.valor,
    descricao: input.descricao.trim(),
    centro_custo_id: input.centro_custo_id,
  }
  if (input.data_compensacao_sugerida) {
    payload.data_compensacao_sugerida = input.data_compensacao_sugerida
  }
  const { data, error } = await supabase
    .from('solicitacoes_saldo')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(payload as any)
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function cancelarSolicitacao(id: string): Promise<void> {
  const { error } = await supabase
    .from('solicitacoes_saldo')
    .update({ status: 'CANCELADA' })
    .eq('id', id)
  if (error) throw error
}

export interface AprovarSolicitacaoInput {
  id: string
  conta_origem_id: string
  observacao?: string | null
  centro_custo_id?: string | null
  /**
   * Data de compensação (ISO YYYY-MM-DD). Quando preenchida, o lançamento
   * gerado nasce com essa data ao invés de CURRENT_DATE. Útil pra registrar
   * transferências retroativas ou futuras.
   */
  data_compensacao?: string | null
}

export async function aprovarSolicitacao(
  input: AprovarSolicitacaoInput,
): Promise<string> {
  const { data, error } = await supabase.rpc('aprovar_solicitacao_saldo', {
    p_solic_id: input.id,
    p_conta_origem_id: input.conta_origem_id,
    p_observacao: input.observacao ?? undefined,
    p_centro_custo_id: input.centro_custo_id ?? undefined,
    p_data_compensacao: input.data_compensacao ?? undefined,
  })
  if (error) throw error
  // RPC retorna o id do lançamento gerado.
  return String(data)
}

/**
 * Edita uma solicitação enquanto status='PENDENTE'. Backend bloqueia se já
 * resolvida (via trigger enforce_solicitacao_edit).
 */
export interface EditarSolicitacaoInput {
  id: string
  valor?: number
  descricao?: string
  conta_destino_id?: string
  conta_origem_sugerida_id?: string | null
  centro_custo_id?: string | null
  /** Data efetiva sugerida (YYYY-MM-DD) — pode ser '' pra apagar. */
  data_compensacao_sugerida?: string | null
}

export async function editarSolicitacao(
  input: EditarSolicitacaoInput,
): Promise<void> {
  type SolicUpdate = {
    valor?: number
    descricao?: string
    conta_destino_id?: string
    conta_origem_sugerida_id?: string | null
    centro_custo_id?: string | null
    data_compensacao_sugerida?: string | null
  }
  const updates: SolicUpdate = {}
  if (input.valor !== undefined) updates.valor = input.valor
  if (input.descricao !== undefined) updates.descricao = input.descricao
  if (input.conta_destino_id !== undefined)
    updates.conta_destino_id = input.conta_destino_id
  if (input.conta_origem_sugerida_id !== undefined)
    updates.conta_origem_sugerida_id = input.conta_origem_sugerida_id
  if (input.centro_custo_id !== undefined)
    updates.centro_custo_id = input.centro_custo_id
  if (input.data_compensacao_sugerida !== undefined)
    updates.data_compensacao_sugerida =
      input.data_compensacao_sugerida || null
  if (Object.keys(updates).length === 0) return
  const { data, error } = await supabase
    .from('solicitacoes_saldo')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updates as any)
    .eq('id', input.id)
    .select('id, status')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(
      'Não foi possível editar esta solicitação. Verifique se ela ainda está PENDENTE.',
    )
  }
}

export interface RejeitarSolicitacaoInput {
  id: string
  motivo: string
}

export async function rejeitarSolicitacao(
  input: RejeitarSolicitacaoInput,
): Promise<void> {
  const { error } = await supabase.rpc('rejeitar_solicitacao_saldo', {
    p_solic_id: input.id,
    p_motivo: input.motivo,
  })
  if (error) throw error
}
