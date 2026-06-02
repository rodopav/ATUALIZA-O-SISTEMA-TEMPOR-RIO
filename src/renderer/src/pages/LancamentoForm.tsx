import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Lock, Save, AlertTriangle } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Spinner } from '../components/ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { toast } from '../components/ui/use-toast'
import { LancamentoFormFields } from '../components/lancamentos/LancamentoFormFields'
import { LivePreview } from '../components/lancamentos/LivePreview'
import { NewFornecedorDialog } from '../components/lancamentos/NewFornecedorDialog'
import { FormSkeleton } from '../components/lancamentos/FormSkeleton'
import {
  defaultFormValues,
  type LancamentoFormValues,
} from '../components/lancamentos/form-types'
import {
  rowToFormValues,
  useSaveLancamento,
} from '../components/lancamentos/use-save-lancamento'
import { lancamentoBaseSchema } from '../../../shared/domain'
import {
  contasQuery,
  centrosCustoQuery,
  tiposOperacaoQuery,
} from '../lib/queries'
import { contasSaldoQuery } from '../lib/contas-saldo-queries'
import {
  fornecedoresQuery,
  lancamentoByIdQuery,
  checkPeriodoFechado,
  type FornecedorCliente,
} from '../lib/lancamentos-queries'
import { useAuthStore } from '../lib/auth-store'
import { mapError } from '../lib/error-mapper'

export function LancamentoFormPage(): React.ReactElement {
  const params = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(params.id)
  const session = useAuthStore((s) => s.session)
  const isAdmin = useAuthStore((s) => s.isAdmin)

  const tiposQ = useQuery(tiposOperacaoQuery)
  const contasQ = useQuery(contasQuery)
  // ContaSelectors usa contasSaldoQuery internamente (v_contas_saldo). Sem
  // gatear isso, o form rendereriza com lista vazia e o Select da Conta de
  // origem não acha o item pra mostrar — abria edição com campo em branco.
  const contasSaldoQ = useQuery(contasSaldoQuery)
  const centrosQ = useQuery(centrosCustoQuery)
  const fornecedoresQ = useQuery(fornecedoresQuery)
  const lancamentoQ = useQuery(lancamentoByIdQuery(params.id))

  const [periodoFechado, setPeriodoFechado] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [fornecedorDialogOpen, setFornecedorDialogOpen] = React.useState(false)

  const lancamento = lancamentoQ.data

  // Usamos `values` (RHF v7.36+) em vez de `defaultValues + useEffect(reset)`:
  // o reset assíncrono dependia de re-render do <Controller> com timing
  // delicado pro Radix Select pegar o value depois das options carregadas.
  // Com `values`, RHF mantém o form em sync com o lancamento carregado.
  // `keepDirtyValues` preserva edições do usuário caso a query refetch.
  const editingValues = React.useMemo<LancamentoFormValues | undefined>(
    () => (isEditing && lancamento ? rowToFormValues(lancamento) : undefined),
    [isEditing, lancamento],
  )

  const form = useForm<LancamentoFormValues>({
    resolver: zodResolver(lancamentoBaseSchema),
    defaultValues: defaultFormValues(),
    values: editingValues,
    resetOptions: { keepDirtyValues: true },
    mode: 'onBlur',
  })

  const dataValue = form.watch('data')
  React.useEffect(() => {
    if (!dataValue) {
      setPeriodoFechado(false)
      return
    }
    let cancelled = false
    void checkPeriodoFechado(dataValue)
      .then((res) => {
        if (!cancelled) setPeriodoFechado(res)
      })
      .catch(() => {
        if (!cancelled) setPeriodoFechado(false)
      })
    return () => {
      cancelled = true
    }
  }, [dataValue])

  const lockedReadOnly = periodoFechado && !isAdmin

  const mutation = useSaveLancamento({
    session,
    editingId: params.id,
    onSuccess: () => {
      toast({
        title: isEditing ? 'Lançamento atualizado' : 'Lançamento criado',
        description: 'Operação concluída com sucesso.',
        variant: 'success',
      })
      navigate('/lancamentos')
    },
    onError: (err) => setSubmitError(mapError(err).description),
  })

  const onSubmit = form.handleSubmit((values) => {
    setSubmitError(null)
    mutation.mutate(values)
  })

  const handleCreatedFornecedor = (forn: FornecedorCliente): void => {
    form.setValue('fornecedor_cliente_id', forn.id, { shouldDirty: true })
  }

  const isLoadingCatalogs =
    tiposQ.isLoading ||
    contasQ.isLoading ||
    contasSaldoQ.isLoading ||
    centrosQ.isLoading ||
    fornecedoresQ.isLoading
  const isLoadingDetail = isEditing && lancamentoQ.isLoading

  if (isLoadingCatalogs || isLoadingDetail) {
    return <FormSkeleton />
  }

  const liveValues = form.watch()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lançamentos"
        title={isEditing ? 'Editar lançamento' : 'Novo lançamento'}
        description={
          isEditing
            ? 'Atualize os dados do lançamento existente.'
            : 'Registre uma nova movimentação financeira.'
        }
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/lancamentos')}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      {lockedReadOnly ? (
        <Alert variant="warning">
          <Lock className="h-4 w-4" />
          <AlertTitle>Período fechado</AlertTitle>
          <AlertDescription>
            Esta data está em um período fechado. Apenas administradores
            financeiros podem editar lançamentos neste período.
          </AlertDescription>
        </Alert>
      ) : null}

      {submitError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao salvar</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <Card>
            <CardContent className="p-6 md:p-8">
              <LancamentoFormFields
                form={form}
                tiposOperacao={tiposQ.data ?? []}
                contas={contasQ.data ?? []}
                centrosCusto={centrosQ.data ?? []}
                fornecedores={fornecedoresQ.data ?? []}
                onCreateFornecedor={() => setFornecedorDialogOpen(true)}
                disabled={lockedReadOnly}
                editing={
                  isEditing && lancamento
                    ? {
                        valor: Number(lancamento.valor),
                        contaOrigemId: lancamento.conta_origem_id,
                      }
                    : null
                }
              />

              <div className="sticky bottom-0 -mx-6 mt-8 flex flex-col-reverse gap-2 border-t bg-background/95 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-end md:-mx-8 md:px-8">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/lancamentos')}
                  disabled={mutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending || lockedReadOnly}
                >
                  {mutation.isPending ? (
                    <>
                      <Spinner className="text-primary-foreground" />
                      Salvando…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {isEditing ? 'Salvar alterações' : 'Criar lançamento'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div>
            <LivePreview
              values={liveValues}
              contas={contasQ.data ?? []}
              tiposOperacao={tiposQ.data ?? []}
            />
          </div>
        </div>
      </form>

      <NewFornecedorDialog
        open={fornecedorDialogOpen}
        onOpenChange={setFornecedorDialogOpen}
        onCreated={handleCreatedFornecedor}
      />
    </div>
  )
}
