import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'

const STALE_30S = 30_000

function pickNum(v: unknown): number {
  const n = typeof v === 'string' ? Number.parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : 0
}
function pickNullableNum(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'string' ? Number.parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : null
}

/* ===================== KPIs executivos ===================== */

export interface KpisExecutivos {
  saldo_geral: number
  saldo_contas: number
  saldo_caixa_fisico: number
  limite_total_configurado: number
  limite_total_disponivel: number
  limite_consumido: number
  pct_limite_consumido: number
  tarifas_mes_valor: number
  tarifas_mes_count: number
  usou_limite_mes_count: number
  contas_negativas_count: number
  liquidez_imediata: number
  runway_meses: number | null
  runway_dias_historico: number
  runway_saidas_90d: number
  runway_media_diaria: number
  saldo_variacao_pct: number
  solicitacoes_pendentes_count: number
  solicitacoes_ausencia_pendentes_count: number
}

export const kpisExecutivosQuery = queryOptions({
  queryKey: ['magnata', 'kpis-executivos'] as const,
  queryFn: async (): Promise<KpisExecutivos> => {
    const { data, error } = await supabase.rpc('magnata_kpis_executivos')
    if (error) throw error
    const r = (data ?? {}) as Record<string, unknown>
    return {
      saldo_geral: pickNum(r.saldo_geral),
      saldo_contas: pickNum(r.saldo_contas),
      saldo_caixa_fisico: pickNum(r.saldo_caixa_fisico),
      limite_total_configurado: pickNum(r.limite_total_configurado),
      limite_total_disponivel: pickNum(r.limite_total_disponivel),
      limite_consumido: pickNum(r.limite_consumido),
      pct_limite_consumido: pickNum(r.pct_limite_consumido),
      tarifas_mes_valor: pickNum(r.tarifas_mes_valor),
      tarifas_mes_count: pickNum(r.tarifas_mes_count),
      usou_limite_mes_count: pickNum(r.usou_limite_mes_count),
      contas_negativas_count: pickNum(r.contas_negativas_count),
      liquidez_imediata: pickNum(r.liquidez_imediata),
      runway_meses: pickNullableNum(r.runway_meses),
      runway_dias_historico: pickNum(r.runway_dias_historico),
      runway_saidas_90d: pickNum(r.runway_saidas_90d),
      runway_media_diaria: pickNum(r.runway_media_diaria),
      saldo_variacao_pct: pickNum(r.saldo_variacao_pct),
      solicitacoes_pendentes_count: pickNum(r.solicitacoes_pendentes_count),
      solicitacoes_ausencia_pendentes_count: pickNum(r.solicitacoes_ausencia_pendentes_count),
    }
  },
  staleTime: STALE_30S,
})

/* ===================== Alertas ===================== */

export type AlertaSeveridade = 'CRITICA' | 'AVISO' | 'INFO'

export interface MagnataAlerta {
  tipo: string
  severidade: AlertaSeveridade
  titulo: string
  descricao: string
}

export const alertasQuery = queryOptions({
  queryKey: ['magnata', 'alertas'] as const,
  queryFn: async (): Promise<MagnataAlerta[]> => {
    const { data, error } = await supabase.rpc('magnata_alertas')
    if (error) throw error
    const arr = Array.isArray(data) ? (data as unknown[]) : []
    return arr
      .map((raw): MagnataAlerta | null => {
        if (!raw || typeof raw !== 'object') return null
        const r = raw as Record<string, unknown>
        const sev = String(r.severidade ?? 'INFO').toUpperCase()
        const severidade: AlertaSeveridade =
          sev === 'CRITICA' || sev === 'AVISO' || sev === 'INFO' ? sev : 'INFO'
        return {
          tipo: String(r.tipo ?? ''),
          severidade,
          titulo: String(r.titulo ?? ''),
          descricao: String(r.descricao ?? ''),
        }
      })
      .filter((a): a is MagnataAlerta => a !== null)
  },
  staleTime: STALE_30S,
})

/* ===================== Drill-downs ===================== */

export interface DrillContaNegativa {
  conta_id: string
  apelido: string
  banco: string | null
  empresa: string | null
  saldo_atual: number
  tem_limite: boolean
  limite_disponivel: number | null
}

export const drillContasNegativasQuery = queryOptions({
  queryKey: ['magnata', 'drill', 'contas-negativas'] as const,
  queryFn: async (): Promise<DrillContaNegativa[]> => {
    const { data, error } = await supabase.rpc('magnata_drill_contas_negativas')
    if (error) throw error
    return ((data ?? []) as DrillContaNegativa[]).map((r) => ({
      ...r,
      saldo_atual: pickNum(r.saldo_atual),
      limite_disponivel: pickNullableNum(r.limite_disponivel),
    }))
  },
  staleTime: STALE_30S,
})

export interface DrillMovimento {
  lancamento_id: string
  data: string
  descricao: string
  valor: number
  natureza: string
  conta_apelido: string
  is_transferencia: boolean
}

export const drillMovimentosMesQuery = queryOptions({
  queryKey: ['magnata', 'drill', 'movimentos-mes'] as const,
  queryFn: async (): Promise<DrillMovimento[]> => {
    const { data, error } = await supabase.rpc('magnata_drill_movimentos_mes', {
      p_limit: 10,
    })
    if (error) throw error
    return ((data ?? []) as DrillMovimento[]).map((r) => ({
      ...r,
      valor: pickNum(r.valor),
    }))
  },
  staleTime: STALE_30S,
})

/* ===================== Limites por conta ===================== */

export interface LimitePorConta {
  conta_id: string
  apelido: string
  banco: string | null
  empresa: string | null
  saldo: number
  valor_limite: number
  limite_disponivel: number
  total_disponivel: number
  pct_consumido: number
}

export const limitesPorContaQuery = queryOptions({
  queryKey: ['magnata', 'limites-por-conta'] as const,
  queryFn: async (): Promise<LimitePorConta[]> => {
    const { data, error } = await supabase.rpc('dashboard_limites_por_conta')
    if (error) throw error
    return ((data ?? []) as LimitePorConta[]).map((r) => ({
      ...r,
      saldo: pickNum(r.saldo),
      valor_limite: pickNum(r.valor_limite),
      limite_disponivel: pickNum(r.limite_disponivel),
      total_disponivel: pickNum(r.total_disponivel),
      pct_consumido: pickNum(r.pct_consumido),
    }))
  },
  staleTime: STALE_30S,
})
