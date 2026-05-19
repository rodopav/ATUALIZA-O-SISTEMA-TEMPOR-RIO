import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { toast } from '../ui/use-toast'
import {
  liberarSolicitacaoNaAusencia,
  solicitacoesKeys,
  type SolicitacaoSaldoRow,
} from '../../lib/solicitacoes-queries'
import { mapError } from '../../lib/error-mapper'
import { formatBRL } from '../../lib/format'

interface LiberarAusenciaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  solicitacao: SolicitacaoSaldoRow | null
}

/**
 * Quando admin está ausente, o próprio solicitante pode liberar a
 * transferência. Cria o lançamento na hora, marca como
 * "aprovada na ausência" e aguarda revisão posterior do admin.
 * Se admin reprovar depois: lançamento E saídas posteriores do
 * solicitante na conta beneficiada são APAGADOS.
 */
export function LiberarAusenciaDialog({
  open,
  onOpenChange,
  solicitacao,
}: LiberarAusenciaDialogProps): React.ReactElement {
  const qc = useQueryClient()
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) setSubmitError(null)
  }, [open])

  const mutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!solicitacao) throw new Error('Solicitação não informada.')
      return liberarSolicitacaoNaAusencia(solicitacao.id)
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: solicitacoesKeys.all,
        refetchType: 'active',
      })
      void qc.invalidateQueries({
        queryKey: ['lancamentos'],
        refetchType: 'active',
      })
      void qc.invalidateQueries({
        queryKey: ['dashboards'],
        refetchType: 'active',
      })
      toast({
        title: 'Saldo liberado na ausência',
        description:
          'O lançamento foi criado e aguarda revisão do admin financeiro.',
        variant: 'success',
      })
      onOpenChange(false)
    },
    onError: (err) => {
      setSubmitError(mapError(err).description)
    },
  })

  const hasOrigemSugerida = Boolean(solicitacao?.conta_origem_sugerida_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-amb-400" />
            Liberar na ausência do responsável
          </DialogTitle>
          <DialogDescription>
            Use só quando o admin financeiro estiver indisponível e a
            operação não pode esperar.
          </DialogDescription>
        </DialogHeader>

        {solicitacao ? (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Resumo da solicitação
              </p>
              <p className="mt-1.5 truncate text-foreground">
                {solicitacao.descricao}
              </p>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Valor:{' '}
                  <span className="font-mono font-semibold text-foreground">
                    {formatBRL(solicitacao.valor)}
                  </span>
                </span>
                <span>
                  Destino:{' '}
                  <span className="text-foreground">
                    {solicitacao.conta_destino?.apelido ?? '—'}
                  </span>
                </span>
                <span className="col-span-2">
                  Origem sugerida:{' '}
                  <span className="text-foreground">
                    {solicitacao.origem_sugerida?.apelido ?? '⚠️ não informada'}
                  </span>
                </span>
              </div>
            </div>

            {!hasOrigemSugerida ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Origem sugerida obrigatória</AlertTitle>
                <AlertDescription>
                  Liberação na ausência exige que você tenha indicado uma
                  conta de origem sugerida na solicitação. Edite a
                  solicitação e adicione a origem antes de liberar.
                </AlertDescription>
              </Alert>
            ) : null}

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção — operação rastreável</AlertTitle>
              <AlertDescription className="space-y-1.5">
                <p>
                  Vou criar o lançamento de transferência agora, marcado
                  como <strong>“aprovado na ausência”</strong>. Quando o
                  admin financeiro voltar, ele revisa.
                </p>
                <p>
                  Se o admin{' '}
                  <strong className="text-destructive">REPROVAR</strong>:
                  esse lançamento + todos os lançamentos seus saindo da
                  conta beneficiada (criados após esta liberação) serão{' '}
                  <strong>APAGADOS</strong>.
                </p>
              </AlertDescription>
            </Alert>

            {submitError ? (
              <Alert variant="destructive">
                <AlertTitle>Erro ao liberar</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

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
            variant="destructive"
            disabled={
              mutation.isPending || !solicitacao || !hasOrigemSugerida
            }
            onClick={() => {
              setSubmitError(null)
              mutation.mutate()
            }}
          >
            {mutation.isPending ? <Spinner /> : null}
            Confirmar liberação na ausência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
