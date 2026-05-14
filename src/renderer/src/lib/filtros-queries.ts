// Queries de catálogos para popular dropdowns dos filtros de Lançamentos.
// Importante: as listas devem respeitar a permissão do usuário —
// usuário comum só vê suas contas e a si mesmo no filtro de responsável.

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
 * Lista responsáveis pra popular o filtro:
 * - Admin/superadmin: todos os usuários ativos (via RPC chat_listar_contatos
 *   + o próprio user, que é excluído pela RPC).
 * - Usuário comum: SÓ ele mesmo (não deve ver os outros).
 */
export const responsaveisQuery = queryOptions({
  queryKey: ['catalog', 'responsaveis'] as const,
  queryFn: async (): Promise<ResponsavelOption[]> => {
    const auth = useAuthStore.getState()
    const me = auth.profile
    if (!me) return []
    const isAdminLike = auth.isAdmin || auth.isSuperadmin

    // Usuário comum só se vê
    if (!isAdminLike) {
      return [{ id: me.id, nome: me.nome_completo + ' (você)' }]
    }

    const { data, error } = await supabase.rpc('chat_listar_contatos')
    if (error) throw error
    const list = (data ?? []) as Array<{ id: string; nome_completo: string }>
    const out = list.map((r) => ({ id: r.id, nome: r.nome_completo }))
    out.push({ id: me.id, nome: me.nome_completo + ' (você)' })
    return out.sort((a, b) => a.nome.localeCompare(b.nome))
  },
  staleTime: 1000 * 60 * 5,
})

export interface ContaFiltroOption {
  id: string
  apelido: string
}

/**
 * Lista contas bancárias visíveis ao usuário pra popular o filtro de
 * banco. Diferente de `contasLookupQuery` (que é só pra resolver nomes
 * em embed null), este aqui RESPEITA a RLS de contas_bancarias —
 * usuário comum só vê o que tem `pode_ver_conta`. Admin vê tudo.
 */
export const contasFiltroQuery = queryOptions({
  queryKey: ['catalog', 'contas-filtro'] as const,
  queryFn: async (): Promise<ContaFiltroOption[]> => {
    const { data, error } = await supabase
      .from('contas_bancarias')
      .select('id, apelido')
      .eq('ativo', true)
      .order('apelido', { ascending: true })
    if (error) throw error
    return (data ?? []) as ContaFiltroOption[]
  },
  staleTime: 1000 * 60 * 5,
})
