import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../lib/auth-store'
import { mapError } from '../../lib/error-mapper'
import { formatBRL, formatDate } from '../../lib/format'
import { toast } from '../ui/use-toast'
import type { LancamentoRow } from '../../lib/lancamentos-queries'

const motivoSchema = z.object({
  motivo_estorno: z
    .string()
    .trim()
    .min(10, 'Motivo do estorno deve ter ao menos 10 caracteres.'),
})

type MotivoForm = z.infer<typeof motivoSchema>

interface EstornoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  original: LancamentoRow | null
}

function invertNatureza(n: 'ENTRADA' | 'SAIDA'): 'ENTRADA' | 'SAIDA' {
  return n === 'ENTRADA' ? 'SAIDA' : 'ENTRADA'
}

export function EstornoModal({
  open,
  onOpenChange,
  original,
}: EstornoModalProps): React.ReactElement {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()
  const [error, setError] = React.useState<string | null>(null)

  const form = useForm<MotivoForm>({
    resolver: zodResolver(motivoSchema),
    defaultValues: { motivo_estorno: '' },
  })

  React.useEffect(() => {
    if (!open) {
      form.reset({ motivo_estorno: '' })
      setError(null)
    }
  }, [open, form])

  const mutation = useMutation({
    mutationFn: async (input: MotivoForm): Promise<void> => {
      if (!original) throw new Error('Lançamento original não informado.')
      if (!session) throw new Error('Sessão expirada.')

      const { error: insertErr } = await supabase.from('lancamentos').insert({
        data: original.data,
        descricao: `[ESTORNO] ${original.descricao}`,
        valor: original.valor,
        natureza: invertNatureza(original.natureza),
        tipo_operacao_id: original.tipo_operacao_id,
        centro_custo_id: original.centro_custo_id,
        // Swap accounts so debits become credits and vice-versa.
        conta_origem_id: original.conta_destino_id,
        conta_destino_id: original.conta_origem_id,
        fornecedor_cliente_id: original.fornecedor_cliente_id,
        ri: original.ri,
        observacoes: original.observacoes,
        responsavel_id: session.user.id,
        estorno_de_id: original.id,
        motivo_estorno: input.motivo_estorno.trim(),
      })
      if (insertErr) throw insertErr
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lancamentos'] })
      void qc.invalidateQueries({ queryKey: ['contas-saldo'] })
      toast({
        title: 'Estorno registrado',
        description: 'O lançamento de estorno foi criado com sucesso.',
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

  if (!original) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estorno indisponível</DialogTitle>
            <DialogDescription>
              Selecione um lançamento para estornar.
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
          <DialogTitle>Estornar lançamento</DialogTitle>
          <DialogDescription>
            Será criado um lançamento inverso vinculado ao original. Esta ação
            não exclui nenhum registro.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p className="font-medium">{original.descricao}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDate(original.data)}</span>
            <span>{formatBRL(original.valor)}</span>
            <span>
              {original.natureza === 'ENTRADA' ? 'Entrada' : 'Saída'}
              {' → '}
              {invertNatureza(original.natureza) === 'ENTRADA' ? 'Entrada' : 'Saída'}
            </span>
          </div>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Erro ao estornar</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="motivo_estorno">Motivo do estorno *</Label>
            <Textarea
              id="motivo_estorno"
              rows={4}
              placeholder="Descreva por que o lançamento está sendo estornado (mín. 10 caracteres)."
              {...form.register('motivo_estorno')}
            />
            {form.formState.errors.motivo_estorno ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.motivo_estorno.message}
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
              Confirmar estorno
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
