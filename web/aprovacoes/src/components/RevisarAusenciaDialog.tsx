import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, X, AlertCircle } from 'lucide-react'
import { queryOptions } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from './ui/Dialog'
import { Button } from './ui/Button'
import { Textarea } from './ui/Select'
import {
  revisarAusencia,
  preverCascadeAusencia,
  type Solicitacao,
} from '../lib/solicitacoes-queries'
import { formatBRL } from '../lib/format'

interface RevisarAusenciaDialogProps {
  solic: Solicitacao | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RevisarAusenciaDialog({
  solic,
  open,
  onOpenChange,
}: RevisarAusenciaDialogProps): React.ReactElement | null {
  const qc = useQueryClient()
  const [step, setStep] = React.useState<'choice' | 'reject_motivo'>('choice')
  const [motivo, setMotivo] = React.useState('')
  const [erro, setErro] = React.useState<string | null>(null)

  const previewQ = useQuery(
    queryOptions({
      queryKey: ['ausencia-preview', solic?.id] as const,
      queryFn: async () => {
        if (!solic) return { qtd: 0, total: 0 }
        return preverCascadeAusencia(solic.id)
      },
      enabled: open && !!solic,
      staleTime: 0,
    }),
  )

  React.useEffect(() => {
    if (open) {
      setStep('choice')
      setMotivo('')
      setErro(null)
    }
  }, [open])

  const mut = useMutation({
    mutationFn: async (aprovar: boolean) => {
      if (!solic) throw new Error('Solicitação inválida')
      if (!aprovar && !motivo.trim()) throw new Error('Motivo é obrigatório pra reprovar')
      await revisarAusencia(solic.id, aprovar, aprovar ? null : motivo.trim())
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['solicitacoes'] })
      onOpenChange(false)
    },
    onError: (err) => {
      setErro(err instanceof Error ? err.message : 'Falha na revisão')
    },
  })

  if (!solic) return null

  const cascade = previewQ.data ?? { qtd: 0, total: 0 }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Revisar liberação em ausência</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="rounded-md border border-red-500/30 bg-red-500/[0.05] p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div className="text-xs text-zinc-300">
                <p className="font-bold text-red-200">
                  {solic.solicitante?.nome_completo} liberou em sua ausência
                </p>
                <p className="mt-1 text-zinc-400">
                  Pode <strong className="text-zinc-200">confirmar</strong> (vira aprovação normal)
                  ou <strong className="text-zinc-200">reprovar</strong> — neste caso o lançamento
                  é APAGADO junto com saídas posteriores do mesmo solicitante na conta destino.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-zinc-800/60 bg-zinc-900/40 p-3">
            <p className="num-mono text-lg font-extrabold text-zinc-50">{formatBRL(solic.valor)}</p>
            <p className="mt-1 text-xs text-zinc-400">{solic.descricao}</p>
            <p className="mt-1.5 text-[11px] text-zinc-500">
              {solic.conta_origem_sugerida?.apelido} → {solic.conta_destino?.apelido}
            </p>
          </div>

          {step === 'choice' ? (
            <>
              {cascade.qtd > 0 ? (
                <div className="rounded-md border border-amb-400/40 bg-amb-400/10 p-3 text-xs text-amb-200">
                  <p className="font-bold">⚠ Reprovar agora vai apagar:</p>
                  <p className="mt-1 text-amb-100">
                    {cascade.qtd} lançamento(s) · total {formatBRL(cascade.total)}
                  </p>
                </div>
              ) : null}
              {erro ? (
                <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{erro}</span>
                </div>
              ) : null}
            </>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Motivo da reprovação
              </label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Visível pro solicitante. Explique o motivo da reprovação."
                autoFocus
              />
              {erro ? (
                <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{erro}</span>
                </div>
              ) : null}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          {step === 'choice' ? (
            <>
              <Button variant="destructive" onClick={() => setStep('reject_motivo')} disabled={mut.isPending}>
                <X className="h-4 w-4" />
                Reprovar
              </Button>
              <Button variant="primary" onClick={() => mut.mutate(true)} loading={mut.isPending}>
                <Check className="h-4 w-4" />
                Confirmar liberação
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('choice')} disabled={mut.isPending}>
                Voltar
              </Button>
              <Button variant="destructive" onClick={() => mut.mutate(false)} loading={mut.isPending}>
                Confirmar reprovação
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
