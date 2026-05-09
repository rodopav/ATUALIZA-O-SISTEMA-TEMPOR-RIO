import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import {
  rejeitarSolicitacao,
  solicitacoesKeys,
  type AdminSolicitacaoSaldoRow,
} from '../../lib/solicitacoes-queries'
import { mapError } from '../../lib/error-mapper'
import { formatBRL, formatDate } from '../../lib/format'
import { toast } from '../ui/use-toast'

const schema = z.object({
  motivo: z
    .string()
    .trim()
    .min(10, 'Motivo da rejeição deve ter ao menos 10 caracteres.'),
})

type FormValues = z.infer<typeof schema>

interface RejeitarSolicitacaoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  solicitacao: AdminSolicitacaoSaldoRow | null
}

export function RejeitarSolicitacaoDialog({
  open,
  onOpenChange,
  solicitacao,
}: RejeitarSolicitacaoDialogProps): React.ReactElement {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { motivo: '' },
  })

  React.useEffect(() => {
    if (!open) {
      form.reset({ motivo: '' })
      setSubmitError(null)
    }
  }, [open, form])

  const mutation = useMutation({
    mutationFn: async (values: FormValues): Promise<void> => {
      if (!solicitacao) throw new Error('Solicitação não informada.')
      await rejeitarSolicitacao({
        id: solicitacao.id,
        motivo: values.motivo.trim(),
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: solicitacoesKeys.all })
      toast({
        title: 'Solicitação rejeitada',
        description: 'O solicitante poderá revisar o motivo informado.',
        variant: 'success',
      })
      onOpenChange(false)
    },
    onError: (err) => {
      setSubmitError(mapError(err).description)
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    setSubmitError(null)
    mutation.mutate(values)
  })

  if (!solicitacao) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeição indisponível</DialogTitle>
            <DialogDescription>
              Selecione uma solicitação para rejeitar.
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
          <DialogTitle>Rejeitar solicitação</DialogTitle>
          <DialogDescription>
            Informe o motivo da rejeição. O solicitante poderá visualizar a
            justificativa.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p className="font-medium">{solicitacao.descricao}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDate(solicitacao.created_at)}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatBRL(solicitacao.valor)}
            </span>
            <span>{solicitacao.solicitante?.nome_completo ?? '—'}</span>
          </div>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>Erro ao rejeitar</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="rejeitar_motivo">Motivo da rejeição *</Label>
            <Textarea
              id="rejeitar_motivo"
              rows={4}
              maxLength={500}
              placeholder="Descreva por que a solicitação não pode ser aprovada (mín. 10 caracteres)."
              {...form.register('motivo')}
            />
            {form.formState.errors.motivo ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.motivo.message}
              </p>
            ) : null}
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
              type="submit"
              variant="destructive"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Spinner /> : <XCircle className="h-4 w-4" />}
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
