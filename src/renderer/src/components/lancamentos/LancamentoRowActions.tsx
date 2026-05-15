import * as React from 'react'
import {
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Eye,
  CheckCircle2,
  Undo2,
} from 'lucide-react'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import type { LancamentoRow } from '../../lib/lancamentos-queries'

export interface LancamentoActionHandlers {
  onEdit: (row: LancamentoRow) => void
  onEstornar: (row: LancamentoRow) => void
  onView: (row: LancamentoRow) => void
  onConciliar?: (row: LancamentoRow) => void
  onDesfazerConciliacao?: (row: LancamentoRow) => void
  isAdmin?: boolean
}

interface LancamentoRowActionsProps {
  row: LancamentoRow
  handlers: LancamentoActionHandlers
}

export function LancamentoRowActions({
  row,
  handlers,
}: LancamentoRowActionsProps): React.ReactElement {
  const isEstorno = Boolean(row.estorno_de_id)
  const isEstornado = Boolean(row.estorno)
  const isConciliado = Boolean(row.conciliado_em)
  // Conciliar/Desfazer: qualquer usuário com permissão nas contas pode
  // (RLS no banco que controla). Só esconde se não passou handler.
  const canConciliar = Boolean(handlers.onConciliar)
  const canDesfazer = Boolean(
    handlers.onDesfazerConciliacao && isConciliado,
  )

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Ações"
            className="h-8 w-8"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => handlers.onView(row)}>
            <Eye />
            Ver detalhes
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => handlers.onEdit(row)}
            disabled={isEstorno}
          >
            <Pencil />
            Editar
          </DropdownMenuItem>
          {canConciliar && !isConciliado ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => handlers.onConciliar?.(row)}
                disabled={isEstorno}
              >
                <CheckCircle2 />
                Conciliar
              </DropdownMenuItem>
            </>
          ) : null}
          {canDesfazer ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => handlers.onDesfazerConciliacao?.(row)}
              >
                <Undo2 />
                Desfazer conciliação
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => handlers.onEstornar(row)}
            disabled={isEstorno || isEstornado}
            destructive
          >
            <RotateCcw />
            Estornar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
