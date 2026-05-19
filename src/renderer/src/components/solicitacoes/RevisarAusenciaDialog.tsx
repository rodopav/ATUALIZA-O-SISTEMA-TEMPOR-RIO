import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
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
import { Label } from '../ui/label'
import { Spinner } from '../ui/spinner'
import { Textarea } from '../ui/textarea'
import { toast } from '../ui/use-toast'
import {
  preverCascadeAusencia,
  revisarSolicitacaoAusencia,
  solicitacoesKeys,
  type AdminSolicitacaoSaldoRow,
} from '../../lib/solicitacoes-queries'
import { mapError } from '../../lib/error-mapper'
import { formatBRL, formatDate } from '../../lib/format'

interface RevisarAusenciaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  solicitacao: AdminSolicitacaoSaldoRow | null
}

/**
 * Admin revisa solicitação que o solicitante liberou na ausência.
 *  - CONFIRMAR: remove a flag, vira aprovação normal.
 *  - REPROVAR: cascade DELETE do lançamento gerado + lançamentos do
 *    solicitante saindo da conta beneficiada depois da liberação.
 *
 * Mostra preview de quantos lançamentos serão apagados antes da
 * confirmação da reprovação (RPC prever_cascade_ausencia).
 */
export function RevisarAusenciaDialog({
  open,
  onOpenChange,
  solicitacao,
}: RevisarAusenciaDialogProps): React.ReactElement {
  const qc = useQueryClient()
  const [motivo, setMotivo] = React.useState('')
  const [modo, setModo] = React.useState<'idle' | 'reprovar'>('idle')
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setMotivo('')
      setModo('idle')
      setSubmitError(null)
    }
  }, [open])

  const previewQ = useQuery({
    queryKey: ['solicitacoes', 'cascade-preview', solicitacao?.id ?? 'none'],
    queryFn: () => preverCascadeAusencia(solicitacao!.id),
    enabled: open && Boolean(solicitacao?.id),
    staleTime: 5000,
  })

  const mutation = useMutation({
    mutationFn: async (aprovar: boolean) => {
      if (!solicitacao) throw new Error('Solicitação não informada.')
      return revisarSolicitacaoAusencia(solicitacao.id, aprovar, motivo || null)
    },
    onSuccess: (result) => {
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
      if (result.acao === 'CONFIRMADA') {
        toast({
          title: 'Aprovação confirmada',
          description: 'A solicitação foi validada e segue como aprovada normal.',
          variant: 'success',
        })
      } else {
        toast({
          title: 'Solicitação reprovada',
          description: `${result.lancamentos_apagados} lançamento(s) foram apagados.`,
          variant: 'destructive',
        })
      }
      onOpenChange(false)
    },
    onError: (err) => {
      setSubmitError(mapError(err).description)
    },
  })

  if (!solicitacao) {
    return <Dialog open={open} onOpenChange={onOpenChange} />
  }

  const preview = previewQ.data
  const hasPreview = preview && preview.qtd > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amb-400" />
            Revisar liberação na ausência
          </DialogTitle>
          <DialogDescription>
            Solicitação aprovada pelo próprio solicitante sem admin presente.
            Confirme ou reprove.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-amb-400/40 bg-amb-400/[0.06] p-3 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amb-600 dark:text-amb-400">
              Solicitação
            </p>
            <p className="mt-1 truncate text-foreground">
              {solicitacao.descricao}
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                Valor:{' '}
                <span className="font-mono font-semibold text-foreground">
                  {formatBRL(solicitacao.valor)}
                </span>
              </span>
              <span>
                Solicitante:{' '}
                <span className="text-foreground">
                  {solicitacao.solicitante?.nome_completo ?? '—'}
                </span>
              </span>
              <span>
                Origem efetiva:{' '}
                <span className="text-foreground">
                  {solicitacao.origem_efetiva?.apelido ??
                    solicitacao.origem_sugerida?.apelido ??
                    '—'}
                </span>
              </span>
              <span>
                Destino:{' '}
                <span className="text-foreground">
                  {solicitacao.conta_destino?.apelido ?? '—'}
                </span>
              </span>
              {solicitacao.liberada_em_ausencia_em ? (
                <span className="col-span-2">
                  Liberado em:{' '}
                  <span className="font-mono text-foreground">
                    {formatDate(solicitacao.liberada_em_ausencia_em)}
                  </span>
                </span>
              ) : null}
            </div>
          </div>

          {modo === 'idle' ? (
            <>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Confirmar aprovação</AlertTitle>
                <AlertDescription>
                  Mantém o lançamento. A marca "aprovada na ausência" sai
                  e a solicitação vira uma aprovação normal.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Reprovar (cascade)</AlertTitle>
                <AlertDescription>
                  {previewQ.isLoading ? (
                    <span>Calculando impacto…</span>
                  ) : hasPreview ? (
                    <span>
                      Vai apagar{' '}
                      <strong>{preview!.qtd} lançamento(s)</strong> totalizando{' '}
                      <strong className="font-mono">
                        {formatBRL(preview!.total)}
                      </strong>
                      : o lançamento da liberação + saídas posteriores do
                      solicitante saindo da conta beneficiada.
                    </span>
                  ) : (
                    <span>Vai apagar apenas o lançamento da liberação.</span>
                  )}
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="motivo-reprovacao">
                Motivo da reprovação (registrado em auditoria)
              </Label>
              <Textarea
                id="motivo-reprovacao"
                placeholder="Ex: Conta de origem incorreta, valor divergente, sem autorização do gestor…"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={500}
              />
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Confirme: ação destrutiva</AlertTitle>
                <AlertDescription>
                  Esses lançamentos serão APAGADOS:
                  <strong className="ml-1 font-mono">
                    {preview?.qtd ?? 0} item(ns) · {formatBRL(preview?.total ?? 0)}
                  </strong>
                  . A operação fica em auditoria mas o saldo é revertido.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          {modo === 'idle' ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Fechar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setModo('reprovar')}
                disabled={mutation.isPending}
              >
                <XCircle className="h-4 w-4" />
                Reprovar…
              </Button>
              <Button
                type="button"
                onClick={() => mutation.mutate(true)}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
                Confirmar aprovação
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModo('idle')}
                disabled={mutation.isPending}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => mutation.mutate(false)}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? <Spinner /> : <XCircle className="h-4 w-4" />}
                Reprovar e apagar {preview?.qtd ?? 0} lançamento(s)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
