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
  saldo_atual: number
}

function normalize(row: ContaSaldoRow): ContaSaldo | null {
  // A view sempre traz valores; o tipo gerado é defensivo (`| null`).
  if (!row.conta_id || !row.apelido) return null
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
