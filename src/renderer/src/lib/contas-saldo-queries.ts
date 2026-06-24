import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Tables } from '../../../shared/database.types'

/**
 * Linha da view `v_contas_saldo` — versão leve de contas_bancarias com
 * o saldo atual já agregado pela função SQL `saldo_atual_conta`.
 *
 * A própria view aplica as RLS de `contas_bancarias`, então usuários comuns
 * só recebem aqui as contas que podem ver.
 */
export type ContaSaldoRow = Tables<'v_contas_saldo'>

/**
 * Versão "view-aware" do registro com campos saneados (não-nulos quando
 * conhecidos). Usar para renderizar selectors e tabelas onde ID e apelido
 * são sempre presentes.
 */
export interface ContaSaldo {
  conta_id: string
  apelido: string
  tipo: ContaSaldoRow['tipo']
  banco: string | null
  numero: string | null
  empresa_id: string | null
  empresa: string | null
  ativo: boolean
  /** null quando o usuário não pode ver saldo (sugestão de origem). */
  saldo_atual: number | null
  /** Conta de dinheiro em espécie (cofre/gaveta). */
  is_caixa_fisico: boolean
  /** Conta de aplicação financeira (renda fixa, fundos). */
  is_investimento: boolean
}

/**
 * Lista TODAS as contas ativas pra USAR como "sugestão de origem" em
 * solicitação de saldo. Usa o lookup público (v_contas_lookup, bypass
 * RLS apenas pra apelido + flags), porque o usuário comum precisa
 * sugerir uma conta mesmo sem ter permissão de ver saldo dela.
 *
 * O saldo é `null` propositalmente — não é mostrado no selector.
 */
export const contasParaSugestaoQuery = queryOptions({
  queryKey: ['catalog', 'contas-sugestao'] as const,
  queryFn: async (): Promise<ContaSaldo[]> => {
    const { data, error } = await supabase
      .from('v_contas_lookup')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select('id, apelido, is_caixa_fisico, is_investimento' as any)
    if (error) throw error
    const rows = (data ?? []) as unknown as Array<{
      id: string
      apelido: string
      is_caixa_fisico: boolean | null
      is_investimento: boolean | null
    }>
    return rows
      .filter((r) => r.id && r.apelido)
      .map<ContaSaldo>((r) => ({
        conta_id: r.id,
        apelido: r.apelido,
        tipo: 'CORRENTE',
        banco: null,
        numero: null,
        empresa_id: null,
        empresa: null,
        ativo: true,
        saldo_atual: null,
        is_caixa_fisico: Boolean(r.is_caixa_fisico),
        is_investimento: Boolean(r.is_investimento),
      }))
  },
  staleTime: 1000 * 60 * 5,
})

function normalize(row: ContaSaldoRow): ContaSaldo | null {
  // A view sempre traz valores; o tipo gerado é defensivo (`| null`).
  if (!row.conta_id || !row.apelido) return null
  // is_caixa_fisico / is_investimento são colunas novas da view — ainda não
  // estão no database.types gerado, então leio via cast.
  const r = row as ContaSaldoRow & {
    is_caixa_fisico?: boolean | null
    is_investimento?: boolean | null
  }
  return {
    conta_id: row.conta_id,
    apelido: row.apelido,
    tipo: row.tipo,
    banco: row.banco,
    numero: row.numero,
    empresa_id: row.empresa_id,
    empresa: row.empresa,
    ativo: row.ativo ?? true,
    saldo_atual: Number(row.saldo_atual ?? 0),
    is_caixa_fisico: Boolean(r.is_caixa_fisico),
    is_investimento: Boolean(r.is_investimento),
  }
}

export const contasSaldoKeys = {
  all: ['contas-saldo', 'all'] as const,
}

const FIVE_MIN = 1000 * 60 * 5

export const contasSaldoQuery = queryOptions({
  queryKey: contasSaldoKeys.all,
  queryFn: async (): Promise<ContaSaldo[]> => {
    const { data, error } = await supabase
      .from('v_contas_saldo')
      .select('*')
      .eq('ativo', true)
      .order('apelido', { ascending: true })
    if (error) throw error
    return (data ?? [])
      .map(normalize)
      .filter((c): c is ContaSaldo => c !== null)
  },
  // Saldo muda a cada lançamento; encurte a janela para refletir rapidamente.
  staleTime: 1000 * 30,
  gcTime: FIVE_MIN,
})
