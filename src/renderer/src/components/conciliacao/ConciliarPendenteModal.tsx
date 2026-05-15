import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { useAuthStore } from '../../lib/auth-store'
import { mapError } from '../../lib/error-mapper'
import { formatBRL, formatDate } from '../../lib/format'
import { conciliarLancamento } from '../../lib/conciliacao-queries'
import { toast } from '../ui/use-toast'
import type { PendenteConciliacaoRow } from '../../lib/conciliacao-queries'

interface ConciliarPendenteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: PendenteConciliacaoRow | null
}

export function ConciliarPendenteModal({
  open,
  onOpenChange,
  target,
}: ConciliarPendenteModalProps): React.ReactElement {
  const profile = useAuthStore((s) => s.profile)
  const qc = useQueryClient()
  const [observacao, setObservacao] = React.useState('')
  const [dataCompensacao, setDataCompensacao] = React.useState('')
  const [usarCompensacao, setUsarCompensacao] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setObservacao('')
      setDataCompensacao('')
      setUsarCompensacao(false)
      setError(null)
    } else if (target?.data) {
      // Pre-fill com a data atual do lançamento como ponto de partida
      setDataCompensacao(target.data)
    }
  }, [open, target?.data])

  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!target?.id) throw new Error('Lançamento não informado.')
      if (!profile) throw new Error('Sessão expirada.')
      await conciliarLancamento({
        id: target.id,
        observacao: observacao.trim() || null,
        profileId: profile.id,
        dataCompensacao: usarCompensacao && dataCompensacao
          ? dataCompensacao
          : null,
      })
    },
    onSuccess: () => {
      // refetchType: 'active' garante refetch imediato de queries
      // montadas (não só marcação como stale).
      void qc.invalidateQueries({
        queryKey: ['conciliacao'],
        refetchType: 'active',
      })
      void qc.invalidateQueries({
        queryKey: ['lancamentos'],
        refetchType: 'active',
      })
      toast({
        title: 'Lançamento conciliado',
        variant: 'success',
      })
      onOpenChange(false)
    },
    onError: (err) => {
      setError(mapError(err).description)
    },
  })

  if (!target) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conciliação indisponível</DialogTitle>
            <DialogDescription>
              Selecione um lançamento para conciliar.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conciliar lançamento</DialogTitle>
          <DialogDescription>
            Marque este lançamento como conferido com o extrato bancário.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p className="font-medium">{target.descricao ?? '—'}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {target.data ? <span>{formatDate(target.data)}</span> : null}
            <span>{formatBRL(Number(target.valor ?? 0))}</span>
            {target.conta_apelido ? (
              <span>{target.conta_apelido}</span>
            ) : null}
            <span>
              {target.natureza === 'ENTRADA' ? 'Entrada' : 'Saída'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Erro ao conciliar</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="conciliacao_observacao">Observação (opcional)</Label>
            <Textarea
              id="conciliacao_observacao"
              rows={3}
              maxLength={500}
              placeholder="Ex: ID extrato 12345, conferido em 08/05/2026."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>

          <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/20 p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary"
                checked={usarCompensacao}
                onChange={(e) => setUsarCompensacao(e.target.checked)}
              />
              Lançar com data de compensação (retroativa ou futura)
            </label>
            {usarCompensacao ? (
              <div className="space-y-1.5 pl-6">
                <Label htmlFor="data_compensacao" className="text-xs">
                  Data efetiva do lançamento
                </Label>
                <input
                  id="data_compensacao"
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={dataCompensacao}
                  onChange={(e) => setDataCompensacao(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  A data do lançamento será REESCRITA pra essa, afetando saldos
                  e conferência. Use quando a baixa bancária confirmar uma data
                  diferente da registrada.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              setError(null)
              mutation.mutate()
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Spinner /> : null}
            Confirmar conciliação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
