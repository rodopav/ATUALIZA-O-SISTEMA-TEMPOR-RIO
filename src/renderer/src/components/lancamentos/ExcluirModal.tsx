import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
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
import { mapError } from '../../lib/error-mapper'
import { formatBRL, formatDate } from '../../lib/format'
import { toast } from '../ui/use-toast'
import {
  excluirLancamento,
  type LancamentoRow,
} from '../../lib/lancamentos-queries'

const motivoSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(10, 'Justificativa deve ter ao menos 10 caracteres.'),
})

type MotivoForm = z.infer<typeof motivoSchema>

interface ExcluirModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: LancamentoRow | null
}

export function ExcluirModal({
  open,
  onOpenChange,
  target,
}: ExcluirModalProps): React.ReactElement {
  const qc = useQueryClient()
  const [error, setError] = React.useState<string | null>(null)

  const form = useForm<MotivoForm>({
    resolver: zodResolver(motivoSchema),
    defaultValues: { motivo: '' },
  })

  React.useEffect(() => {
    if (!open) {
      form.reset({ motivo: '' })
      setError(null)
    }
  }, [open, form])

  const mutation = useMutation({
    mutationFn: async (input: MotivoForm): Promise<void> => {
      if (!target) throw new Error('Lançamento não informado.')
      await excluirLancamento(target.id, input.motivo.trim())
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lancamentos'] })
      void qc.invalidateQueries({ queryKey: ['contas-saldo'] })
      void qc.invalidateQueries({ queryKey: ['conciliacao'] })
      toast({
        title: 'Lançamento excluído',
        description: 'A exclusão foi registrada na auditoria com sua justificativa.',
        variant: 'success',
      })
      onOpenChange(false)
    },
    onError: (err) => {
      setError(mapError(err).description)
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    setError(null)
    mutation.mutate(values)
  })

  if (!target) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exclusão indisponível</DialogTitle>
            <DialogDescription>
              Selecione um lançamento para excluir.
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
          <DialogTitle>Excluir lançamento</DialogTitle>
          <DialogDescription>
            O lançamento será apagado <strong>definitivamente</strong> do banco
            de dados e o saldo da conta será recalculado.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p className="font-medium">{target.descricao}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDate(target.data)}</span>
            <span>{formatBRL(target.valor)}</span>
            <span>{target.natureza === 'ENTRADA' ? 'Entrada' : 'Saída'}</span>
          </div>
        </div>

        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ação irreversível</AlertTitle>
          <AlertDescription>
            A exclusão fica registrada na auditoria com seu usuário, data/hora,
            a justificativa e uma cópia completa do lançamento.
          </AlertDescription>
        </Alert>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Erro ao excluir</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="motivo_exclusao">Justificativa *</Label>
            <Textarea
              id="motivo_exclusao"
              rows={4}
              placeholder="Por que este lançamento está sendo excluído? (mín. 10 caracteres)"
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
              {mutation.isPending ? <Spinner /> : null}
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
