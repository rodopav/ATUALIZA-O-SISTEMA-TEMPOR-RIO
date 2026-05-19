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
  contasParaSugestaoQuery,
  type ContaSaldo,
} from '../../lib/contas-saldo-queries'
import { centrosCustoQuery } from '../../lib/queries'
import { permissoesByUserQuery } from '../../lib/permissoes-queries'
import {
  criarSolicitacao,
  solicitacoesKeys,
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
  data_compensacao_sugerida: z.string(),
}) satisfies z.ZodType<NovaSolicitacaoFormValues>

interface NovaSolicitacaoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DEFAULTS: NovaSolicitacaoFormValues = {
  valor: 0,
  conta_destino_id: '',
  descricao: '',
  conta_origem_sugerida_id: null,
  centro_custo_id: null,
  data_compensacao_sugerida: '',
}

export function NovaSolicitacaoDialog({
  open,
  onOpenChange,
}: NovaSolicitacaoDialogProps): React.ReactElement {
  const profile = useAuthStore((s) => s.profile)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const qc = useQueryClient()
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const form = useForm<NovaSolicitacaoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })

  const contasQ = useQuery(contasSaldoQuery)
  const contasSugestaoQ = useQuery(contasParaSugestaoQuery)
  const centrosQ = useQuery(centrosCustoQuery)
  const permissoesQ = useQuery(permissoesByUserQuery(profile?.id ?? null))

  const todasContas = contasQ.data ?? []
  const centrosCusto = centrosQ.data ?? []
  const permissoes = permissoesQ.data ?? []

  // Admins enxergam tudo. Para usuários comuns, filtramos pelas contas
  // marcadas com `pode_lancar=true` em `user_contas_permitidas` — assim a
  // solicitação fica em uma conta que ele realmente vai operar depois.
  const contasDestino = React.useMemo<ContaSaldo[]>(() => {
    if (isAdmin) return todasContas
    const allowed = new Set(
      permissoes.filter((p) => p.pode_lancar).map((p) => p.conta_id),
    )
    return todasContas.filter((c) => allowed.has(c.conta_id))
  }, [isAdmin, todasContas, permissoes])

  // Origem sugerida: o usuário precisa indicar de qual conta o admin
  // (ou ele próprio em liberação na ausência) deve tirar o saldo —
  // mesmo que ele não tenha permissão de VER aquela conta. Usamos o
  // lookup público (apelido apenas, sem saldo).
  const contasOrigemSugerida = contasSugestaoQ.data ?? todasContas

  React.useEffect(() => {
    if (!open) {
      form.reset(DEFAULTS)
      setSubmitError(null)
    }
  }, [open, form])

  const mutation = useMutation({
    mutationFn: async (values: NovaSolicitacaoFormValues): Promise<string> => {
      if (!profile) throw new Error('Sessão expirada.')
      return criarSolicitacao({
        solicitante_id: profile.id,
        conta_destino_id: values.conta_destino_id,
        conta_origem_sugerida_id: values.conta_origem_sugerida_id,
        valor: values.valor,
        descricao: values.descricao,
        centro_custo_id: values.centro_custo_id,
        data_compensacao_sugerida: values.data_compensacao_sugerida || null,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: solicitacoesKeys.all })
      toast({
        title: 'Solicitação enviada',
        description: 'Aguarde a aprovação de um administrador.',
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
          <DialogTitle>Nova solicitação de saldo</DialogTitle>
          <DialogDescription>
            Solicite a transferência de saldo a um administrador. A operação só
            será efetivada após aprovação.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível solicitar</AlertTitle>
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
              Enviar solicitação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
