// Lookup público (id → apelido + is_caixa_fisico) de TODAS as contas
// bancárias ativas. Resolve o caso em que o embed PostgREST devolve
// NULL pro nome da conta por RLS — usuário não tem `pode_ver_conta`,
// mas o NOME em si é só uma label e ele já consegue ver o lançamento
// via outra ponta.
//
// View v_contas_lookup é security_invoker=off (bypassa RLS) e expõe
// APENAS (id, apelido, is_caixa_fisico). Saldo, movimentos e dados
// sensíveis seguem protegidos por RLS em outras tabelas/views.

import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'

export interface ContaLookupInfo {
  apelido: string
  is_caixa_fisico: boolean
  is_investimento: boolean
}

interface ContaLookupRow {
  id: string
  apelido: string
  is_caixa_fisico: boolean | null
  is_investimento: boolean | null
}

export const contasLookupQuery = queryOptions({
  queryKey: ['contas', 'lookup'] as const,
  queryFn: async (): Promise<Map<string, ContaLookupInfo>> => {
    const { data, error } = await supabase
      .from('v_contas_lookup')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select('id, apelido, is_caixa_fisico, is_investimento' as any)
    if (error) throw error
    const map = new Map<string, ContaLookupInfo>()
    for (const row of (data ?? []) as unknown as ContaLookupRow[]) {
      if (row.id && row.apelido) {
        map.set(row.id, {
          apelido: row.apelido,
          is_caixa_fisico: Boolean(row.is_caixa_fisico),
          is_investimento: Boolean(row.is_investimento),
        })
      }
    }
    return map
  },
  staleTime: 10 * 60_000,
})
