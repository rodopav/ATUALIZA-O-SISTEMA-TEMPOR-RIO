import { queryOptions, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Tables, Enums } from '../../../shared/database.types'

export type CentroCustoDashboardRow = Tables<'v_dashboard_centro_custo'>
export type ConferenciaRow = Tables<'v_conferencia'>
export type SaldoGeralRow = Tables<'v_saldo_geral'>

export type AcaoAudit = Enums<'acao_audit'>

export interface AuditLogRow {
  id: number
  entidade: string
  entidade_id: string
  acao: AcaoAudit
  usuario_id: string
  ts: string
  valores_antes: unknown
  valores_depois: unknown
  motivo: string | null
  ip: string | null
  user_agent: string | null
  usuario: { nome_completo: string; email: string } | null
}

export interface AuditLogFilters {
  /** Profile id (uuid). */
  usuarioId?: string | null
  /** Free-text entidade (e.g. "lancamentos"). */
  entidade?: string | null
  acao?: AcaoAudit | null
  /** YYYY-MM-DD inclusive. */
  dataDe?: string | null
  /** YYYY-MM-DD inclusive (we compare < next-day). */
  dataAte?: string | null
  /** Page size — defaults to 50. */
  pageSize?: number
  /** Cursor: id of last row of the previous page (we fetch `id < cursor`). */
  cursor?: number | null
}

const STALE_30S = 1000 * 30

const AUDIT_SELECT = `
  id, entidade, entidade_id, acao, usuario_id, ts, valores_antes, valores_depois,
  motivo, ip, user_agent,
  usuario:profiles!usuario_id(nome_completo, email)
`.trim()

export const centrosCustoDashboardQuery = (periodo: string) =>
  queryOptions({
    queryKey: ['dashboards', 'centros_custo', periodo] as const,
    queryFn: async (): Promise<CentroCustoDashboardRow[]> => {
      const { data, error } = await supabase
        .from('v_dashboard_centro_custo')
        .select('*')
        .eq('periodo', periodo)
        .order('codigo', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: STALE_30S,
  })

export const conferenciaQuery = (periodo: string) =>
  queryOptions({
    queryKey: ['dashboards', 'conferencia', periodo] as const,
    queryFn: async (): Promise<ConferenciaRow | null> => {
      const { data, error } = await supabase
        .from('v_conferencia')
        .select('*')
        .eq('periodo', periodo)
        .maybeSingle()
      if (error) throw error
      return data
    },
    staleTime: STALE_30S,
  })

export const divergenciasQuery = (periodo: string) =>
  queryOptions({
    queryKey: ['dashboards', 'divergencias', periodo] as const,
    queryFn: async (): Promise<SaldoGeralRow[]> => {
      const { data, error } = await supabase
        .from('v_saldo_geral')
        .select('*')
        .eq('periodo', periodo)
        .eq('status', 'DIVERGENTE')
        .order('empresa', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: STALE_30S,
  })

export const auditLogQuery = (filters: AuditLogFilters) =>
  queryOptions({
    queryKey: ['audit_log', filters] as const,
    queryFn: async (): Promise<AuditLogRow[]> => {
      const limit = filters.pageSize ?? 50
      let q = supabase
        .from('audit_log')
        .select(AUDIT_SELECT)
        .order('id', { ascending: false })
        .limit(limit)

      if (typeof filters.cursor === 'number') {
        q = q.lt('id', filters.cursor)
      }
      if (filters.usuarioId) q = q.eq('usuario_id', filters.usuarioId)
      if (filters.entidade) q = q.eq('entidade', filters.entidade)
      if (filters.acao) q = q.eq('acao', filters.acao)
      if (filters.dataDe) q = q.gte('ts', `${filters.dataDe}T00:00:00`)
      if (filters.dataAte) {
        // make "até" inclusive: < (data+1 day) at 00:00.
        const next = nextDayIso(filters.dataAte)
        if (next) q = q.lt('ts', `${next}T00:00:00`)
      }

      const { data, error } = await q
      if (error) throw error
      // Cast through unknown — Supabase select-with-join inferred type is opaque.
      return (data ?? []) as unknown as AuditLogRow[]
    },
    staleTime: STALE_30S,
  })

function nextDayIso(iso: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split('-').map((n) => Number.parseInt(n, 10))
  if (
    y === undefined ||
    m === undefined ||
    d === undefined ||
    !Number.isFinite(y) ||
    !Number.isFinite(m) ||
    !Number.isFinite(d)
  ) {
    return null
  }
  const next = new Date(y, m - 1, d + 1)
  const yy = next.getFullYear()
  const mm = String(next.getMonth() + 1).padStart(2, '0')
  const dd = String(next.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function useCentrosCustoDashboard(
  periodo: string,
): UseQueryResult<CentroCustoDashboardRow[]> {
  return useQuery(centrosCustoDashboardQuery(periodo))
}

export function useConferencia(
  periodo: string,
): UseQueryResult<ConferenciaRow | null> {
  return useQuery(conferenciaQuery(periodo))
}

export function useDivergencias(
  periodo: string,
): UseQueryResult<SaldoGeralRow[]> {
  return useQuery(divergenciasQuery(periodo))
}

export function useAuditLog(
  filters: AuditLogFilters,
): UseQueryResult<AuditLogRow[]> {
  return useQuery(auditLogQuery(filters))
}
