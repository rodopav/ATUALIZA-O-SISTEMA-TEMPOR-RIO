// Queries do app Magnata Dashboard. Cada uma cobre uma RPC ou view dedicada.
// Tipos pt-BR para refletir o domínio executivo.

import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Tables } from '../../../shared/database.types'

const STALE_30S = 1000 * 30
const STALE_5M = 1000 * 60 * 5

/* ===================== KPIs ===================== */

export interface MagnataKpis {
  saldo_total: number
  resultado_operacional: number
  runway_dias: number | null
  taxa_conciliacao: number
  volume_mes: number
  solicitacoes_pendentes_count: number
  solicitacoes_pendentes_valor: number
}

function pickNum(v: unknown): number {
  const n = typeof v === 'string' ? Number.parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : 0
}

function pickNullableNum(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'string' ? Number.parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : null
}

function parseKpis(raw: unknown): MagnataKpis {
  if (!raw || typeof raw !== 'object') {
    return {
      saldo_total: 0,
      resultado_operacional: 0,
      runway_dias: null,
      taxa_conciliacao: 0,
      volume_mes: 0,
      solicitacoes_pendentes_count: 0,
      solicitacoes_pendentes_valor: 0,
    }
  }
  const r = raw as Record<string, unknown>
  return {
    saldo_total: pickNum(r.saldo_total),
    resultado_operacional: pickNum(r.resultado_operacional),
    runway_dias: pickNullableNum(r.runway_dias),
    taxa_conciliacao: pickNum(r.taxa_conciliacao),
    volume_mes: pickNum(r.volume_mes),
    solicitacoes_pendentes_count: pickNum(r.solicitacoes_pendentes_count),
    solicitacoes_pendentes_valor: pickNum(r.solicitacoes_pendentes_valor),
  }
}

export const kpisQuery = queryOptions({
  queryKey: ['magnata', 'kpis'] as const,
  queryFn: async (): Promise<MagnataKpis> => {
    const { data, error } = await supabase.rpc('magnata_kpis')
    if (error) throw error
    return parseKpis(data)
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

function parseAlerta(raw: unknown): MagnataAlerta | null {
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
}

export const alertasQuery = queryOptions({
  queryKey: ['magnata', 'alertas'] as const,
  queryFn: async (): Promise<MagnataAlerta[]> => {
    const { data, error } = await supabase.rpc('magnata_alertas')
    if (error) throw error
    const list = (data ?? []) as unknown[]
    const arr = Array.isArray(list) ? list : []
    return arr
      .map(parseAlerta)
      .filter((a): a is MagnataAlerta => a !== null)
  },
  staleTime: STALE_30S,
})

/* ===================== Projeção de caixa ===================== */

export interface ProjecaoPonto {
  data: string
  saldo_projetado: number
  banda_inferior: number
  banda_superior: number
}

export const projecaoQuery = (params: { dias?: number } = {}) =>
  queryOptions({
    queryKey: ['magnata', 'projecao', params.dias ?? 30] as const,
    queryFn: async (): Promise<ProjecaoPonto[]> => {
      const { data, error } = await supabase.rpc('magnata_projecao_caixa', {
        p_dias: params.dias ?? 30,
      })
      if (error) throw error
      const arr = (data ?? []) as ProjecaoPonto[]
      return arr.map((row) => ({
        data: row.data,
        saldo_projetado: pickNum(row.saldo_projetado),
        banda_inferior: pickNum(row.banda_inferior),
        banda_superior: pickNum(row.banda_superior),
      }))
    },
    staleTime: STALE_5M,
  })

/* ===================== Views ===================== */

export type FluxoMensalRow = Tables<'v_fluxo_mensal'>
export type FluxoDiarioRow = Tables<'v_fluxo_diario'>
export type SaldoPorEmpresaRow = Tables<'v_saldo_por_empresa'>
export type TopFornecedorRow = Tables<'v_top_fornecedores'>
export type ContaSaldoRow = Tables<'v_contas_saldo'>

export const fluxoMensalQuery = queryOptions({
  queryKey: ['magnata', 'fluxo_mensal'] as const,
  queryFn: async (): Promise<FluxoMensalRow[]> => {
    const { data, error } = await supabase
      .from('v_fluxo_mensal')
      .select('*')
      .order('periodo', { ascending: true })
    if (error) throw error
    return data ?? []
  },
  staleTime: STALE_30S,
})

export const fluxoDiarioQuery = queryOptions({
  queryKey: ['magnata', 'fluxo_diario'] as const,
  queryFn: async (): Promise<FluxoDiarioRow[]> => {
    const { data, error } = await supabase
      .from('v_fluxo_diario')
      .select('*')
      .order('data', { ascending: true })
    if (error) throw error
    return data ?? []
  },
  staleTime: STALE_30S,
})

export const saldoPorEmpresaQuery = queryOptions({
  queryKey: ['magnata', 'saldo_por_empresa'] as const,
  queryFn: async (): Promise<SaldoPorEmpresaRow[]> => {
    const { data, error } = await supabase
      .from('v_saldo_por_empresa')
      .select('*')
      .order('saldo_total', { ascending: false })
    if (error) throw error
    return data ?? []
  },
  staleTime: STALE_30S,
})

export const topFornecedoresQuery = queryOptions({
  queryKey: ['magnata', 'top_fornecedores'] as const,
  queryFn: async (): Promise<TopFornecedorRow[]> => {
    const { data, error } = await supabase
      .from('v_top_fornecedores')
      .select('*')
      .order('total_saidas', { ascending: false })
      .limit(10)
    if (error) throw error
    return data ?? []
  },
  staleTime: STALE_30S,
})

export const contasSaldoMagnataQuery = queryOptions({
  queryKey: ['magnata', 'contas_saldo'] as const,
  queryFn: async (): Promise<ContaSaldoRow[]> => {
    const { data, error } = await supabase
      .from('v_contas_saldo')
      .select('*')
      .order('apelido', { ascending: true })
    if (error) throw error
    return data ?? []
  },
  staleTime: STALE_30S,
})

/* ===================== KPIs Executivos ===================== */

/**
 * Indicadores estratégicos do grupo — CFO view.
 * Retornados pela RPC magnata_kpis_executivos.
 */
export interface MagnataKpisExecutivos {
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
  saldo_variacao_pct: number
  solicitacoes_pendentes_count: number
  solicitacoes_ausencia_pendentes_count: number
}

function parseKpisExecutivos(raw: unknown): MagnataKpisExecutivos {
  const r = (raw ?? {}) as Record<string, unknown>
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
    saldo_variacao_pct: pickNum(r.saldo_variacao_pct),
    solicitacoes_pendentes_count: pickNum(r.solicitacoes_pendentes_count),
    solicitacoes_ausencia_pendentes_count: pickNum(
      r.solicitacoes_ausencia_pendentes_count,
    ),
  }
}

export const kpisExecutivosQuery = queryOptions({
  queryKey: ['magnata', 'kpis-executivos'] as const,
  queryFn: async (): Promise<MagnataKpisExecutivos> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { data, error } = await sb.rpc('magnata_kpis_executivos')
    if (error) throw error
    return parseKpisExecutivos(data)
  },
  staleTime: STALE_30S,
})
