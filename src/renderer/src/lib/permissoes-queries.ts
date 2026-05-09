import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Tables } from '../../../shared/database.types'

export type UserContaPermitida = Tables<'user_contas_permitidas'>

export interface ContaPermissaoRow {
  conta_id: string
  user_id: string
  pode_ver: boolean
  pode_lancar: boolean
  granted_at: string
  granted_by: string | null
}

export const permissoesKeys = {
  all: ['permissoes'] as const,
  byUser: (userId: string | null) =>
    ['permissoes', 'user', userId ?? 'none'] as const,
}

export const permissoesByUserQuery = (userId: string | null) =>
  queryOptions({
    queryKey: permissoesKeys.byUser(userId),
    queryFn: async (): Promise<ContaPermissaoRow[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('user_contas_permitidas')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  })

export async function fetchPermissoesUsuario(
  userId: string,
): Promise<ContaPermissaoRow[]> {
  const { data, error } = await supabase
    .from('user_contas_permitidas')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data ?? []
}

export interface UpsertPermissaoInput {
  user_id: string
  conta_id: string
  pode_ver: boolean
  pode_lancar: boolean
}

export async function upsertPermissao(
  input: UpsertPermissaoInput,
): Promise<void> {
  // Regra: lançar implica ver. Se não pode ver e não pode lançar, deletamos a linha.
  if (!input.pode_ver && !input.pode_lancar) {
    await deletePermissao(input.user_id, input.conta_id)
    return
  }
  const podeVer = input.pode_lancar ? true : input.pode_ver
  const { error } = await supabase
    .from('user_contas_permitidas')
    .upsert(
      {
        user_id: input.user_id,
        conta_id: input.conta_id,
        pode_ver: podeVer,
        pode_lancar: input.pode_lancar,
      },
      { onConflict: 'user_id,conta_id' },
    )
  if (error) throw error
}

export async function deletePermissao(
  userId: string,
  contaId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_contas_permitidas')
    .delete()
    .eq('user_id', userId)
    .eq('conta_id', contaId)
  if (error) throw error
}

export interface BulkSetPermissoesOpts {
  pode_ver: boolean
  pode_lancar: boolean
}

/**
 * Aplica uma configuração em massa para uma lista de contas. Se ambos forem
 * `false`, todas as linhas são deletadas. Caso contrário, faz upsert.
 */
export async function bulkSetPermissoes(
  userId: string,
  contaIds: string[],
  opts: BulkSetPermissoesOpts,
): Promise<void> {
  if (contaIds.length === 0) return

  if (!opts.pode_ver && !opts.pode_lancar) {
    const { error } = await supabase
      .from('user_contas_permitidas')
      .delete()
      .eq('user_id', userId)
      .in('conta_id', contaIds)
    if (error) throw error
    return
  }

  const podeVer = opts.pode_lancar ? true : opts.pode_ver
  const rows = contaIds.map((conta_id) => ({
    user_id: userId,
    conta_id,
    pode_ver: podeVer,
    pode_lancar: opts.pode_lancar,
  }))
  const { error } = await supabase
    .from('user_contas_permitidas')
    .upsert(rows, { onConflict: 'user_id,conta_id' })
  if (error) throw error
}

/**
 * Replica todas as permissões de `sourceUserId` para `targetUserId`.
 * Sobrescreve linhas existentes (upsert). Não remove permissões que o alvo
 * já tinha mas que não constam na fonte — chamador pode limpar antes.
 */
export async function replicarPermissoes(
  sourceUserId: string,
  targetUserId: string,
): Promise<number> {
  const source = await fetchPermissoesUsuario(sourceUserId)
  if (source.length === 0) return 0
  const rows = source.map((p) => ({
    user_id: targetUserId,
    conta_id: p.conta_id,
    pode_ver: p.pode_ver,
    pode_lancar: p.pode_lancar,
  }))
  const { error } = await supabase
    .from('user_contas_permitidas')
    .upsert(rows, { onConflict: 'user_id,conta_id' })
  if (error) throw error
  return rows.length
}
