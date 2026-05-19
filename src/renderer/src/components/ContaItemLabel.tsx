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
 * destacada quando o saldo é ≤ 0.
 *
 * Quando `conta.saldo_atual` é null/undefined (caso da sugestão de origem,
 * onde o usuário não tem permissão de ver o saldo), só mostra o apelido.
 */
export function ContaItemLabel({
  conta,
}: ContaItemLabelProps): React.ReactElement {
  const saldoVisivel = conta.saldo_atual !== null && conta.saldo_atual !== undefined
  const negativo = saldoVisivel && (conta.saldo_atual as number) <= 0
  return (
    <span className="flex w-full items-center justify-between gap-3">
      <span className="truncate font-medium">{conta.apelido}</span>
      {saldoVisivel ? (
        <span
          className={cn(
            'shrink-0 tabular-nums text-xs font-semibold',
            negativo ? 'text-destructive' : 'text-foreground',
          )}
        >
          {formatBRL(conta.saldo_atual as number)}
        </span>
      ) : null}
    </span>
  )
}
