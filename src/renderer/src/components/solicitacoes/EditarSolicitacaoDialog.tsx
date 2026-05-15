import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { useAuthStore } from '../../lib/auth-store'
import { mapError } from '../../lib/error-mapper'
import { toast } from '../ui/use-toast'
import {
  contasSaldoQuery,
  type ContaSaldo,
} from '../../lib/contas-saldo-queries'
import { centrosCustoQuery } from '../../lib/queries'
import { permissoesByUserQuery } from '../../lib/permissoes-queries'
import {
  editarSolicitacao,
  solicitacoesKeys,
  type SolicitacaoSaldoRow,
} from '../../lib/solicitacoes-queries'
import {
  NovaSolicitacaoFields,
  type NovaSolicitacaoFormValues,
} from './NovaSolicitacaoFields'

const schema = z.object({
  valor: z
    .number({ invalid_type_error: 'Valor deve ser numérico.' })
    .positive('Valor deve ser maior que zero.'),
  conta_destino_id: z.string().uuid('Selecione uma conta de destino.'),
  descricao: z
    .string()
    .trim()
    .min(5, 'Descrição deve ter ao menos 5 caracteres.'),
  conta_origem_sugerida_id: z.string().uuid().nullable(),
  centro_custo_id: z.string().uuid().nullable(),
}) satisfies z.ZodType<NovaSolicitacaoFormValues>

interface EditarSolicitacaoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  solicitacao: SolicitacaoSaldoRow | null
}

export function EditarSolicitacaoDialog({
  open,
  onOpenChange,
  solicitacao,
}: EditarSolicitacaoDialogProps): React.ReactElement {
  const profile = useAuthStore((s) => s.profile)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const qc = useQueryClient()
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const form = useForm<NovaSolicitacaoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      valor: 0,
      conta_destino_id: '',
      descricao: '',
      conta_origem_sugerida_id: null,
      centro_custo_id: null,
    },
  })

  const contasQ = useQuery(contasSaldoQuery)
  const centrosQ = useQuery(centrosCustoQuery)
  const permissoesQ = useQuery(permissoesByUserQuery(profile?.id ?? null))

  const todasContas = contasQ.data ?? []
  const centrosCusto = centrosQ.data ?? []
  const permissoes = permissoesQ.data ?? []

  const contasDestino = React.useMemo<ContaSaldo[]>(() => {
    if (isAdmin) return todasContas
    const allowed = new Set(
      permissoes.filter((p) => p.pode_lancar).map((p) => p.conta_id),
    )
    return todasContas.filter((c) => allowed.has(c.conta_id))
  }, [isAdmin, todasContas, permissoes])

  const contasOrigemSugerida = todasContas

  // Reset com valores da solicitação ao abrir
  React.useEffect(() => {
    if (open && solicitacao) {
      form.reset({
        valor: Number(solicitacao.valor),
        conta_destino_id: solicitacao.conta_destino_id,
        descricao: solicitacao.descricao,
        conta_origem_sugerida_id: solicitacao.conta_origem_sugerida_id,
        centro_custo_id: solicitacao.centro_custo_id,
      })
      setSubmitError(null)
    }
    if (!open) {
      setSubmitError(null)
    }
  }, [open, solicitacao, form])

  const mutation = useMutation({
    mutationFn: async (values: NovaSolicitacaoFormValues): Promise<void> => {
      if (!solicitacao) throw new Error('Solicitação não informada.')
      await editarSolicitacao({
        id: solicitacao.id,
        valor: values.valor,
        conta_destino_id: values.conta_destino_id,
        descricao: values.descricao,
        conta_origem_sugerida_id: values.conta_origem_sugerida_id,
        centro_custo_id: values.centro_custo_id,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: solicitacoesKeys.all,
        refetchType: 'active',
      })
      toast({
        title: 'Solicitação atualizada',
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

  const isLoadingCatalogs =
    contasQ.isLoading ||
    centrosQ.isLoading ||
    (!isAdmin && permissoesQ.isLoading)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar solicitação</DialogTitle>
          <DialogDescription>
            Disponível só enquanto a solicitação está PENDENTE. Após aprovação
            ou rejeição, o pedido fica travado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível editar</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <NovaSolicitacaoFields
            form={form}
            contasDestino={contasDestino}
            contasOrigemSugerida={contasOrigemSugerida}
            centrosCusto={centrosCusto}
            loading={isLoadingCatalogs}
            isAdmin={isAdmin}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner /> : null}
              Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
