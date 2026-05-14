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
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setObservacao('')
      setError(null)
    }
  }, [open])

  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!target?.id) throw new Error('Lançamento não informado.')
      if (!profile) throw new Error('Sessão expirada.')
      await conciliarLancamento({
        id: target.id,
        observacao: observacao.trim() || null,
        profileId: profile.id,
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
