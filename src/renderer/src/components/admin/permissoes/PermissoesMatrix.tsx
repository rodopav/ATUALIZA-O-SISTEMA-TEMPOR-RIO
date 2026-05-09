import * as React from 'react'
import { ShieldCheck } from 'lucide-react'
import { Skeleton } from '../../ui/skeleton'
import { EmptyState } from '../../ui/empty-state'
import {
  PermissoesMatrixRow,
  type PermissaoState,
} from './PermissoesMatrixRow'
import type { ContaWithEmpresa } from '../../../lib/admin-queries'

interface PermissoesMatrixProps {
  contas: ContaWithEmpresa[]
  /** Mapa conta_id → estado atual. */
  permissoes: Map<string, PermissaoState>
  /** Set de conta_ids cuja mutation está pendente (para feedback visual). */
  pending: Set<string>
  loading?: boolean
  onChange: (contaId: string, next: PermissaoState) => void
}

const HEADER_TOOLTIP_VER =
  'Permite que o usuário enxergue a conta e os lançamentos vinculados.'
const HEADER_TOOLTIP_LANCAR =
  'Permite que o usuário registre lançamentos nesta conta. Implica também em "ver".'

export function PermissoesMatrix({
  contas,
  permissoes,
  pending,
  loading,
  onChange,
}: PermissoesMatrixProps): React.ReactElement {
  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (contas.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck />}
        title="Nenhuma conta ativa cadastrada."
        description="Cadastre contas bancárias em Administração antes de configurar permissões."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10 bg-muted/60 text-xs font-medium uppercase tracking-wider text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/50">
          <tr>
            <th
              scope="col"
              className="border-b px-4 py-3 pl-6 text-left font-medium"
            >
              Conta
            </th>
            <th scope="col" className="border-b px-4 py-3 text-left font-medium">
              Empresa
            </th>
            <th scope="col" className="border-b px-4 py-3 text-left font-medium">
              Tipo
            </th>
            <th
              scope="col"
              title={HEADER_TOOLTIP_VER}
              className="border-b px-4 py-3 text-center font-medium"
            >
              Ver
            </th>
            <th
              scope="col"
              title={HEADER_TOOLTIP_LANCAR}
              className="border-b px-4 py-3 pr-6 text-center font-medium"
            >
              Lançar
            </th>
          </tr>
        </thead>
        <tbody>
          {contas.map((conta) => {
            const state =
              permissoes.get(conta.id) ??
              ({ pode_ver: false, pode_lancar: false } satisfies PermissaoState)
            return (
              <PermissoesMatrixRow
                key={conta.id}
                conta={conta}
                state={state}
                pending={pending.has(conta.id)}
                onChange={(next) => onChange(conta.id, next)}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
