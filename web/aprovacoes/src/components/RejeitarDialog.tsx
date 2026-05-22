import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, AlertCircle } from 'lucide-react'
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
import { rejeitarSolicitacao, type Solicitacao } from '../lib/solicitacoes-queries'
import { formatBRL } from '../lib/format'

interface RejeitarDialogProps {
  solic: Solicitacao | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RejeitarDialog({ solic, open, onOpenChange }: RejeitarDialogProps): React.ReactElement | null {
  const qc = useQueryClient()
  const [motivo, setMotivo] = React.useState('')
  const [erro, setErro] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setMotivo('')
      setErro(null)
    }
  }, [open])

  const mut = useMutation({
    mutationFn: async () => {
      if (!solic) throw new Error('Solicitação inválida')
      if (!motivo.trim()) throw new Error('Motivo é obrigatório')
      await rejeitarSolicitacao(solic.id, motivo.trim())
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['solicitacoes'] })
      onOpenChange(false)
    },
    onError: (err) => {
      setErro(err instanceof Error ? err.message : 'Falha ao rejeitar')
    },
  })

  if (!solic) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Rejeitar solicitação</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="rounded-md border border-zinc-800/60 bg-zinc-900/40 p-3">
            <p className="text-xs text-zinc-500">{solic.solicitante?.nome_completo}</p>
            <p className="num-mono text-lg font-extrabold text-zinc-50">{formatBRL(solic.valor)}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Motivo da rejeição
            </label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explique brevemente o motivo (visível pro solicitante)"
              autoFocus
            />
          </div>

          {erro ? (
            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{erro}</span>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mut.isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => mut.mutate()} loading={mut.isPending}>
            <X className="h-4 w-4" />
            Rejeitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
