// Lookup público (id → apelido) de TODAS as contas bancárias ativas.
// Resolve o caso em que o embed PostgREST devolve NULL pro nome da
// conta por RLS — usuário não tem `pode_ver_conta`, mas o NOME em si
// é só uma label e ele já consegue ver o lançamento via outra ponta.
//
// View v_contas_lookup é security_invoker=off (bypassa RLS) e expõe
// APENAS (id, apelido). Saldo, movimentos e dados sensíveis seguem
// protegidos por RLS em outras tabelas/views.

import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'

export type ContaLookup = { id: string; apelido: string }

export const contasLookupQuery = queryOptions({
  queryKey: ['contas', 'lookup'] as const,
  queryFn: async (): Promise<Map<string, string>> => {
    const { data, error } = await supabase
      .from('v_contas_lookup')
      .select('id, apelido')
    if (error) throw error
    const map = new Map<string, string>()
    for (const row of (data ?? []) as ContaLookup[]) {
      if (row.id && row.apelido) map.set(row.id, row.apelido)
    }
    return map
  },
  staleTime: 10 * 60_000,
})
