import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  contasAdminQuery,
  profilesAdminQuery,
  type ContaWithEmpresa,
  type Profile,
} from '../../../lib/admin-queries'
import {
  permissoesByUserQuery,
  permissoesKeys,
  upsertPermissao,
  bulkSetPermissoes,
  type ContaPermissaoRow,
} from '../../../lib/permissoes-queries'
import { mapError } from '../../../lib/error-mapper'
import { toast } from '../../ui/use-toast'
import type { PermissaoState } from './PermissoesMatrixRow'

function permissoesToMap(
  rows: ContaPermissaoRow[],
): Map<string, PermissaoState> {
  const m = new Map<string, PermissaoState>()
  for (const row of rows) {
    m.set(row.conta_id, {
      pode_ver: row.pode_ver,
      pode_lancar: row.pode_lancar,
    })
  }
  return m
}

export interface UsePermissoesStateResult {
  profiles: Profile[]
  profilesLoading: boolean
  contasAtivas: ContaWithEmpresa[]
  contasLoading: boolean
  permissoesMap: Map<string, PermissaoState>
  permissoesLoading: boolean
  pending: Set<string>
  errorMsg: string | null
  upsert: (contaId: string, next: PermissaoState) => void
  bulkApply: (contaIds: string[], pode_ver: boolean, pode_lancar: boolean) => void
  bulkPending: boolean
  invalidate: () => void
}

export function usePermissoesState(
  userId: string | null,
): UsePermissoesStateResult {
  const qc = useQueryClient()
  const [pending, setPending] = React.useState<Set<string>>(new Set())

  const profilesQ = useQuery(profilesAdminQuery)
  const contasQ = useQuery(contasAdminQuery)
  const permissoesQ = useQuery(permissoesByUserQuery(userId))

  const contasAtivas = React.useMemo<ContaWithEmpresa[]>(
    () => (contasQ.data ?? []).filter((c) => c.ativo),
    [contasQ.data],
  )

  const permissoesMap = React.useMemo(
    () => permissoesToMap(permissoesQ.data ?? []),
    [permissoesQ.data],
  )

  const upsertMut = useMutation({
    mutationFn: async (vars: {
      conta_id: string
      next: PermissaoState
    }): Promise<void> => {
      if (!userId) throw new Error('Usuário não selecionado.')
      await upsertPermissao({
        user_id: userId,
        conta_id: vars.conta_id,
        pode_ver: vars.next.pode_ver,
        pode_lancar: vars.next.pode_lancar,
      })
    },
    onMutate: (vars) => {
      setPending((s) => {
        const n = new Set(s)
        n.add(vars.conta_id)
        return n
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: permissoesKeys.byUser(userId) })
    },
    onError: (err) => {
      toast({
        title: 'Falha ao salvar',
        description: mapError(err).description,
        variant: 'destructive',
      })
    },
    onSettled: (_d, _e, vars) => {
      setPending((s) => {
        const n = new Set(s)
        n.delete(vars.conta_id)
        return n
      })
    },
  })

  const bulkMut = useMutation({
    mutationFn: async (vars: {
      contaIds: string[]
      opts: { pode_ver: boolean; pode_lancar: boolean }
    }): Promise<void> => {
      if (!userId) throw new Error('Usuário não selecionado.')
      await bulkSetPermissoes(userId, vars.contaIds, vars.opts)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: permissoesKeys.byUser(userId) })
      toast({ title: 'Permissões atualizadas', variant: 'success' })
    },
    onError: (err) => {
      toast({
        title: 'Falha ao aplicar em massa',
        description: mapError(err).description,
        variant: 'destructive',
      })
    },
  })

  const errorMsg = React.useMemo(() => {
    if (profilesQ.error) return mapError(profilesQ.error).description
    if (contasQ.error) return mapError(contasQ.error).description
    if (permissoesQ.error) return mapError(permissoesQ.error).description
    return null
  }, [profilesQ.error, contasQ.error, permissoesQ.error])

  const upsert = React.useCallback(
    (contaId: string, next: PermissaoState): void => {
      upsertMut.mutate({ conta_id: contaId, next })
    },
    [upsertMut],
  )

  const bulkApply = React.useCallback(
    (contaIds: string[], pode_ver: boolean, pode_lancar: boolean): void => {
      bulkMut.mutate({ contaIds, opts: { pode_ver, pode_lancar } })
    },
    [bulkMut],
  )

  const invalidate = React.useCallback((): void => {
    void qc.invalidateQueries({ queryKey: permissoesKeys.byUser(userId) })
  }, [qc, userId])

  return {
    profiles: profilesQ.data ?? [],
    profilesLoading: profilesQ.isLoading,
    contasAtivas,
    contasLoading: contasQ.isLoading,
    permissoesMap,
    permissoesLoading: permissoesQ.isLoading,
    pending,
    errorMsg,
    upsert,
    bulkApply,
    bulkPending: bulkMut.isPending,
    invalidate,
  }
}
