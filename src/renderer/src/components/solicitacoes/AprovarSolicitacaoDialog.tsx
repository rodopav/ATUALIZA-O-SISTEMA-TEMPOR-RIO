import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { contasSaldoQuery } from '../../lib/contas-saldo-queries'
import {
  aprovarSolicitacao,
  solicitacoesKeys,
  type AdminSolicitacaoSaldoRow,
} from '../../lib/solicitacoes-queries'
import { mapError } from '../../lib/error-mapper'
import { formatBRL } from '../../lib/format'
import { toast } from '../ui/use-toast'
import { ContaItemLabel } from '../ContaItemLabel'
import { SolicitacaoSummary } from './SolicitacaoSummary'

interface AprovarSolicitacaoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  solicitacao: AdminSolicitacaoSaldoRow | null
}

export function AprovarSolicitacaoDialog({
  open,
  onOpenChange,
  solicitacao,
}: AprovarSolicitacaoDialogProps): React.ReactElement {
  const qc = useQueryClient()
  const contasQ = useQuery(contasSaldoQuery)
  const [contaOrigemId, setContaOrigemId] = React.useState<string>('')
  const [observacao, setObservacao] = React.useState<string>('')
  const [usarCompensacao, setUsarCompensacao] = React.useState(false)
  const [dataCompensacao, setDataCompensacao] = React.useState<string>('')
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open && solicitacao) {
      setContaOrigemId(solicitacao.conta_origem_sugerida_id ?? '')
      setObservacao('')
      // Se o solicitante sugeriu uma data, pre-marca o checkbox e usa essa data
      const sugerida = solicitacao.data_compensacao_sugerida
      if (sugerida) {
        setUsarCompensacao(true)
        setDataCompensacao(sugerida)
      } else {
        setUsarCompensacao(false)
        const today = new Date()
        setDataCompensacao(
          `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
        )
      }
      setSubmitError(null)
    }
    if (!open) {
      setContaOrigemId('')
      setObservacao('')
      setUsarCompensacao(false)
      setDataCompensacao('')
      setSubmitError(null)
    }
  }, [open, solicitacao])

  const mutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!solicitacao) throw new Error('Solicitação não informada.')
      if (!contaOrigemId) throw new Error('Selecione a conta de origem.')
      return aprovarSolicitacao({
        id: solicitacao.id,
        conta_origem_id: contaOrigemId,
        observacao: observacao.trim() || null,
        data_compensacao: usarCompensacao && dataCompensacao
          ? dataCompensacao
          : null,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: solicitacoesKeys.all })
      void qc.invalidateQueries({ queryKey: ['lancamentos'] })
      void qc.invalidateQueries({ queryKey: ['contas-saldo'] })
      void qc.invalidateQueries({ queryKey: ['saldo_geral'] })
      void qc.invalidateQueries({ queryKey: ['conciliacao'] })
      toast({
        title: 'Aprovada e transferência gerada',
        description:
          'O lançamento de transferência interna foi criado com sucesso.',
        variant: 'success',
      })
      onOpenChange(false)
    },
    onError: (err) => {
      setSubmitError(mapError(err).description)
    },
  })

  if (!solicitacao) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovação indisponível</DialogTitle>
            <DialogDescription>
              Selecione uma solicitação para aprovar.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  const todasContas = contasQ.data ?? []

  // Não permitimos que a origem seja a própria conta destino.
  const contasOrigem = todasContas.filter(
    (c) => c.conta_id !== solicitacao.conta_destino_id,
  )

  const contaOrigemSelecionada =
    contasOrigem.find((c) => c.conta_id === contaOrigemId) ?? null

  const saldoInsuficiente =
    !!contaOrigemSelecionada &&
    contaOrigemSelecionada.tipo !== 'CARTAO_CREDITO_CONTA' &&
    contaOrigemSelecionada.saldo_atual < solicitacao.valor

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aprovar solicitação</DialogTitle>
          <DialogDescription>
            Será gerado um lançamento de transferência interna entre a conta
            de origem escolhida e a conta de destino do pedido.
          </DialogDescription>
        </DialogHeader>

        <SolicitacaoSummary solicitacao={solicitacao} />

        <div className="space-y-4">
          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>Erro ao aprovar</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="aprovar_origem">Conta de origem *</Label>
            <Select
              value={contaOrigemId || undefined}
              onValueChange={setContaOrigemId}
              disabled={contasQ.isLoading}
            >
              <SelectTrigger id="aprovar_origem">
                <SelectValue placeholder="Selecionar conta…" />
              </SelectTrigger>
              <SelectContent>
                {contasOrigem.map((c) => (
                  <SelectItem
                    key={c.conta_id}
                    value={c.conta_id}
                    title={c.empresa ?? undefined}
                  >
                    <ContaItemLabel conta={c} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {solicitacao.origem_sugerida?.apelido ? (
              <p className="text-xs text-muted-foreground">
                Sugerida pelo solicitante:{' '}
                <span className="text-foreground">
                  {solicitacao.origem_sugerida.apelido}
                </span>
              </p>
            ) : null}
          </div>

          {saldoInsuficiente && contaOrigemSelecionada ? (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Saldo insuficiente nesta conta</AlertTitle>
              <AlertDescription>
                Saldo atual:{' '}
                <span className="font-semibold tabular-nums">
                  {formatBRL(contaOrigemSelecionada.saldo_atual)}
                </span>
                . O sistema bloqueará o lançamento ao tentar aprovar.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="aprovar_observacao">Observação (opcional)</Label>
            <Textarea
              id="aprovar_observacao"
              rows={3}
              maxLength={500}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Notas internas sobre a aprovação."
            />
          </div>

          <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/20 p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary"
                checked={usarCompensacao}
                onChange={(e) => setUsarCompensacao(e.target.checked)}
              />
              Lançar com data de compensação (retroativa ou futura)
            </label>
            {usarCompensacao ? (
              <div className="space-y-1.5 pl-6">
                <Label htmlFor="aprovar_data_compensacao" className="text-xs">
                  Data efetiva do lançamento gerado
                </Label>
                <input
                  id="aprovar_data_compensacao"
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={dataCompensacao}
                  onChange={(e) => setDataCompensacao(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Sem compensação, o lançamento nasce com a data de HOJE.
                  Use a data efetiva pra refletir a movimentação real.
                </p>
              </div>
            ) : null}
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
            variant="success"
            onClick={() => {
              setSubmitError(null)
              mutation.mutate()
            }}
            disabled={mutation.isPending || !contaOrigemId}
          >
            {mutation.isPending ? (
              <Spinner />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Aprovar e gerar transferência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
