import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
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
  type CentroCusto,
  type ContaBancaria,
  type TipoOperacao,
} from '../lib/queries'
import { contasSaldoQuery } from '../lib/contas-saldo-queries'
import {
  fornecedoresQuery,
  lancamentoByIdQuery,
  checkPeriodoFechado,
  type FornecedorCliente,
  type LancamentoRow,
} from '../lib/lancamentos-queries'
import { useAuthStore } from '../lib/auth-store'
import { mapError } from '../lib/error-mapper'

/**
 * Wrapper que carrega TODAS as queries (catalogs + detalhe quando editando)
 * antes de renderizar o form. Assim que tudo está pronto, monta o
 * `LancamentoFormBody` passando os dados já resolvidos. Isso elimina a race
 * condition em que o form mountava com defaultValues vazios e o reset
 * assíncrono podia perder os <Controller> dos Radix Selects.
 *
 * O `key` no body força um remount limpo quando o id do lançamento muda
 * (ex.- usuário clica em outro "Editar" sem voltar pra lista) — caso contrário
 * o RHF reutilizaria o form state do anterior.
 */
export function LancamentoFormPage(): React.ReactElement {
  const params = useParams<{ id?: string }>()
  const isEditing = Boolean(params.id)

  const tiposQ = useQuery(tiposOperacaoQuery)
  const contasQ = useQuery(contasQuery)
  // ContaSelectors usa contasSaldoQuery (v_contas_saldo) internamente.
  // Sem este wait, a lista de contas chegava vazia no primeiro render
  // e o Select de origem ficava em "Selecionar conta…" mesmo em edição.
  const contasSaldoQ = useQuery(contasSaldoQuery)
  const centrosQ = useQuery(centrosCustoQuery)
  const fornecedoresQ = useQuery(fornecedoresQuery)
  const lancamentoQ = useQuery(lancamentoByIdQuery(params.id))

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

  // Edição sem dado é estado inválido (id na URL, mas /lancamentos/:id não
  // achou nada). Mostra skeleton e o usuário pode voltar via header.
  if (isEditing && !lancamentoQ.data) {
    return <FormSkeleton />
  }

  return (
    <LancamentoFormBody
      // key força remount quando navegamos entre editar X → editar Y →
      // novo. Sem isso, RHF mantém o form state anterior e ficamos com
      // valores do lançamento errado misturados.
      key={params.id ?? 'new'}
      isEditing={isEditing}
      lancamento={lancamentoQ.data ?? null}
      tiposOperacao={tiposQ.data ?? []}
      contas={contasQ.data ?? []}
      centrosCusto={centrosQ.data ?? []}
      fornecedores={fornecedoresQ.data ?? []}
    />
  )
}

interface LancamentoFormBodyProps {
  isEditing: boolean
  lancamento: LancamentoRow | null
  tiposOperacao: TipoOperacao[]
  contas: ContaBancaria[]
  centrosCusto: CentroCusto[]
  fornecedores: FornecedorCliente[]
}

function LancamentoFormBody({
  isEditing,
  lancamento,
  tiposOperacao,
  contas,
  centrosCusto,
  fornecedores,
}: LancamentoFormBodyProps): React.ReactElement {
  const params = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const isAdmin = useAuthStore((s) => s.isAdmin)

  const [periodoFechado, setPeriodoFechado] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [fornecedorDialogOpen, setFornecedorDialogOpen] = React.useState(false)

  // Esta linha é a fix definitivo do bug "form abre vazio em edição":
  // defaultValues recebe os valores reais do lançamento, e como o
  // componente só monta DEPOIS de todos catalogs + detalhe carregarem
  // (gate na page acima), o RHF não passa por nenhum estado intermediário
  // com IDs vazios. Os Radix Selects veem o value já alinhado com as
  // SelectItems desde o primeiro render.
  const initialValues = React.useMemo<LancamentoFormValues>(
    () =>
      isEditing && lancamento ? rowToFormValues(lancamento) : defaultFormValues(),
    [isEditing, lancamento],
  )

  const form = useForm<LancamentoFormValues>({
    resolver: zodResolver(lancamentoBaseSchema),
    defaultValues: initialValues,
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
                tiposOperacao={tiposOperacao}
                contas={contas}
                centrosCusto={centrosCusto}
                fornecedores={fornecedores}
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
              contas={contas}
              tiposOperacao={tiposOperacao}
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

// Mantém o default-export pra não quebrar imports.
export default LancamentoFormPage
