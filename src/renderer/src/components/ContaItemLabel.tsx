import * as React from 'react'
import { formatBRL } from '../lib/format'
import { cn } from '../lib/cn'
import type { ContaSaldo } from '../lib/contas-saldo-queries'

interface ContaItemLabelProps {
  conta: ContaSaldo
}

/**
 * Conteúdo padrão renderizado dentro de `<SelectItem>` para contas com saldo.
 * Mostra o apelido à esquerda e o saldo formatado à direita, com cor
 * destacada quando o saldo é ≤ 0. Como o `SelectItem` envolve o conteúdo em
 * `SelectPrimitive.ItemText`, o mesmo nó também aparece no trigger ao
 * selecionar — por isso mantemos o layout enxuto, sem subtítulos.
 */
export function ContaItemLabel({
  conta,
}: ContaItemLabelProps): React.ReactElement {
  const negativo = conta.saldo_atual <= 0
  return (
    <span className="flex w-full items-center justify-between gap-3">
      <span className="truncate font-medium">{conta.apelido}</span>
      <span
        className={cn(
          'shrink-0 tabular-nums text-xs font-semibold',
          negativo ? 'text-destructive' : 'text-foreground',
        )}
      >
        {formatBRL(conta.saldo_atual)}
      </span>
    </span>
  )
}
