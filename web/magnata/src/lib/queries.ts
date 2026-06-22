import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'

const STALE_30S = 30_000
const STALE_5M = 5 * 60_000

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

/* ===================== Contas negativas ===================== */

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

/* ===================== Saldo por empresa ===================== */

export interface SaldoPorEmpresa {
  empresa_id: string
  empresa: string
  saldo_total: number
  qtd_contas: number
}

export const saldoPorEmpresaQuery = queryOptions({
  queryKey: ['magnata', 'saldo-por-empresa'] as const,
  queryFn: async (): Promise<SaldoPorEmpresa[]> => {
    const { data, error } = await supabase
      .from('v_saldo_por_empresa')
      .select('*')
      .order('saldo_total', { ascending: false })
    if (error) throw error
    return ((data ?? []) as any[]).map((r) => ({
      empresa_id: r.empresa_id,
      empresa: r.empresa ?? r.razao_social ?? '—',
      saldo_total: pickNum(r.saldo_total),
      qtd_contas: pickNum(r.qtd_contas),
    }))
  },
  staleTime: STALE_30S,
})

/* ===================== Contas saldo lista ===================== */

export interface ContaSaldo {
  conta_id: string
  apelido: string
  banco: string | null
  saldo_atual: number
  is_caixa_fisico: boolean
  tem_limite: boolean
}

export const contasSaldoQuery = queryOptions({
  queryKey: ['magnata', 'contas-saldo'] as const,
  queryFn: async (): Promise<ContaSaldo[]> => {
    const { data, error } = await supabase
      .from('v_contas_saldo')
      .select('*')
      .order('saldo_atual', { ascending: false })
    if (error) throw error
    return ((data ?? []) as any[]).map((r) => ({
      conta_id: r.conta_id ?? r.id,
      apelido: r.apelido,
      banco: r.banco ?? null,
      saldo_atual: pickNum(r.saldo_atual),
      is_caixa_fisico: Boolean(r.is_caixa_fisico),
      tem_limite: Boolean(r.tem_limite),
    }))
  },
  staleTime: STALE_30S,
})

/* ===================== Fluxo mensal ===================== */

export interface FluxoMensal {
  periodo: string
  entradas: number
  saidas: number
  liquido: number
  qtd_lancamentos: number
}

export const fluxoMensalQuery = queryOptions({
  queryKey: ['magnata', 'fluxo-mensal'] as const,
  queryFn: async (): Promise<FluxoMensal[]> => {
    const { data, error } = await supabase
      .from('v_fluxo_mensal')
      .select('*')
      .order('periodo', { ascending: true })
    if (error) throw error
    return ((data ?? []) as any[]).map((r) => ({
      periodo: r.periodo,
      entradas: pickNum(r.entradas),
      saidas: pickNum(r.saidas),
      liquido: pickNum(r.liquido),
      qtd_lancamentos: pickNum(r.qtd_lancamentos),
    }))
  },
  staleTime: STALE_30S,
})

/* ===================== Centros de custo (saídas mês) ===================== */

export interface CentroCustoSaida {
  centro_custo_id: string
  codigo: string
  nome: string
  total_saidas: number
  qtd_lancamentos: number
}

export const centrosCustoSaidasQuery = queryOptions({
  queryKey: ['magnata', 'centros-custo-saidas'] as const,
  queryFn: async (): Promise<CentroCustoSaida[]> => {
    // Agrupa manualmente lançamentos do mês — não depende de view.
    const inicio = new Date()
    const inicioStr = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-01`
    const { data, error } = await supabase
      .from('lancamentos')
      .select(
        `valor, centro_custo_id,
         centro:centros_de_custo!inner(id, codigo, nome),
         tipo:tipos_operacao(is_transferencia)`,
      )
      .gte('data', inicioStr)
      .eq('natureza', 'SAIDA')
      .is('estorno_de_id', null)
    if (error) throw error
    const map = new Map<string, CentroCustoSaida>()
    for (const r of (data ?? []) as any[]) {
      if (r.tipo?.is_transferencia) continue
      const ccId = r.centro_custo_id
      if (!ccId || !r.centro) continue
      const cur = map.get(ccId) ?? {
        centro_custo_id: ccId,
        codigo: r.centro.codigo,
        nome: r.centro.nome,
        total_saidas: 0,
        qtd_lancamentos: 0,
      }
      cur.total_saidas += pickNum(r.valor)
      cur.qtd_lancamentos += 1
      map.set(ccId, cur)
    }
    return [...map.values()].sort((a, b) => b.total_saidas - a.total_saidas).slice(0, 20)
  },
  staleTime: STALE_5M,
})

/* ===================== Lançamentos lista ===================== */

export interface MagnataLancamento {
  id: string
  data: string
  descricao: string
  valor: number
  natureza: 'ENTRADA' | 'SAIDA'
  is_transferencia: boolean
  is_estorno: boolean
  estornado: boolean
  conta_origem_apelido: string | null
  conta_destino_apelido: string | null
  empresa_nome: string | null
  responsavel_nome: string | null
}

export function lancamentosListQuery(filters: {
  inicio: string
  fim: string
  natureza: 'all' | 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
}) {
  return queryOptions({
    queryKey: ['magnata', 'lancamentos', filters] as const,
    queryFn: async (): Promise<MagnataLancamento[]> => {
      let q = supabase
        .from('lancamentos')
        .select(
          `id, data, descricao, valor, natureza, motivo_estorno, estorno_de_id,
           tipo:tipos_operacao(is_transferencia),
           origem:contas_bancarias!lancamentos_conta_origem_id_fkey(apelido, empresa:empresas(razao_social, nome_fantasia)),
           destino:contas_bancarias!lancamentos_conta_destino_id_fkey(apelido),
           responsavel:profiles!lancamentos_responsavel_id_profiles_fkey(nome_completo)`,
        )
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1000)
      if (filters.inicio) q = q.gte('data', filters.inicio)
      if (filters.fim) q = q.lte('data', filters.fim)
      // CRÍTICO: natureza no BANCO antes do .limit() — senão o limite corta os
      // lançamentos mais recentes ANTES do filtro client-side e os totais saem
      // truncados (filtro restrito mostrava MAIS que "todas"). `natureza` é
      // coluna real; transferência é sempre natureza='SAIDA'.
      if (filters.natureza === 'ENTRADA') {
        q = q.eq('natureza', 'ENTRADA')
      } else if (
        filters.natureza === 'SAIDA' ||
        filters.natureza === 'TRANSFERENCIA'
      ) {
        q = q.eq('natureza', 'SAIDA')
      }
      const { data, error } = await q
      if (error) throw error
      const rows = ((data ?? []) as any[]).map((r): MagnataLancamento => {
        const empresa = r.origem?.empresa
          ? (r.origem.empresa.nome_fantasia ?? r.origem.empresa.razao_social)
          : null
        return {
          id: r.id,
          data: r.data,
          descricao: r.descricao ?? '',
          valor: pickNum(r.valor),
          natureza: r.natureza,
          is_transferencia: Boolean(r.tipo?.is_transferencia),
          is_estorno: r.estorno_de_id != null,
          estornado: r.motivo_estorno != null,
          conta_origem_apelido: r.origem?.apelido ?? null,
          conta_destino_apelido: r.destino?.apelido ?? null,
          empresa_nome: empresa,
          responsavel_nome: r.responsavel?.nome_completo ?? null,
        }
      })
      if (filters.natureza === 'TRANSFERENCIA') return rows.filter((r) => r.is_transferencia)
      if (filters.natureza === 'ENTRADA') return rows.filter((r) => r.natureza === 'ENTRADA' && !r.is_transferencia)
      if (filters.natureza === 'SAIDA') return rows.filter((r) => r.natureza === 'SAIDA' && !r.is_transferencia)
      return rows
    },
    staleTime: STALE_30S,
  })
}
