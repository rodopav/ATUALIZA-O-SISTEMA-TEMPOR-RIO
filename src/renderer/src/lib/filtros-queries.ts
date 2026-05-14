// Queries de catálogos para popular dropdowns dos filtros de Lançamentos.
// - tiposOperacaoQuery: lista os tipos de operação ativos
// - responsaveisQuery: lista usuários ativos via RPC chat_listar_contatos
//   + o próprio user (já que essa RPC exclui auth.uid()).

import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuthStore } from './auth-store'

export interface TipoOperacaoOption {
  id: string
  codigo: string
  nome: string
  is_transferencia: boolean
}

export const tiposOperacaoQuery = queryOptions({
  queryKey: ['catalog', 'tipos-operacao'] as const,
  queryFn: async (): Promise<TipoOperacaoOption[]> => {
    const { data, error } = await supabase
      .from('tipos_operacao')
      .select('id, codigo, nome, is_transferencia')
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (error) throw error
    return (data ?? []) as TipoOperacaoOption[]
  },
  staleTime: 1000 * 60 * 10,
})

export interface ResponsavelOption {
  id: string
  nome: string
}

/**
 * Lista usuários ativos pra popular o filtro de responsável.
 * Usa a RPC chat_listar_contatos (SECURITY DEFINER, contorna RLS
 * de profiles) e adiciona o próprio usuário no final.
 */
export const responsaveisQuery = queryOptions({
  queryKey: ['catalog', 'responsaveis'] as const,
  queryFn: async (): Promise<ResponsavelOption[]> => {
    const { data, error } = await supabase.rpc('chat_listar_contatos')
    if (error) throw error
    const list = (data ?? []) as Array<{ id: string; nome_completo: string }>
    const out = list.map((r) => ({ id: r.id, nome: r.nome_completo }))
    // Adiciona o próprio user (excluído pela RPC)
    const me = useAuthStore.getState().profile
    if (me) {
      out.push({ id: me.id, nome: me.nome_completo + ' (você)' })
    }
    return out.sort((a, b) => a.nome.localeCompare(b.nome))
  },
  staleTime: 1000 * 60 * 5,
})
