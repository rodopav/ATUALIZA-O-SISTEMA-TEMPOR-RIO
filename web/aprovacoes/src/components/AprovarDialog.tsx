import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from './ui/Dialog'
import { Button } from './ui/Button'
import { Select } from './ui/Select'
import {
  aprovarSolicitacao,
  contasParaOrigemQuery,
  type Solicitacao,
} from '../lib/solicitacoes-queries'
import { formatBRL } from '../lib/format'

interface AprovarDialogProps {
  solic: Solicitacao | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AprovarDialog({ solic, open, onOpenChange }: AprovarDialogProps): React.ReactElement | null {
  const qc = useQueryClient()
  const contasQ = useQuery(contasParaOrigemQuery)
  const [contaOrigemId, setContaOrigemId] = React.useState<string>('')
  const [erro, setErro] = React.useState<string | null>(null)

  // Quando abre, preenche com a origem sugerida da solicitação
  React.useEffect(() => {
    if (open && solic) {
      setContaOrigemId(solic.conta_origem_sugerida?.id ?? '')
      setErro(null)
    }
  }, [open, solic])

  const mut = useMutation({
    mutationFn: async () => {
      if (!solic) throw new Error('Solicitação inválida')
      if (!contaOrigemId) throw new Error('Escolha a conta de origem')
      await aprovarSolicitacao(solic.id, contaOrigemId)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['solicitacoes'] })
      onOpenChange(false)
    },
    onError: (err) => {
      setErro(err instanceof Error ? err.message : 'Falha ao aprovar')
    },
  })

  if (!solic) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Aprovar solicitação</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="rounded-md border border-zinc-800/60 bg-zinc-900/40 p-3">
            <p className="text-xs text-zinc-500">
              {solic.solicitante?.nome_completo ?? 'Solicitante'} pede
            </p>
            <p className="num-mono mt-0.5 text-xl font-extrabold text-zinc-50">
              {formatBRL(solic.valor)}
            </p>
            <p className="mt-1 text-xs text-zinc-400">{solic.descricao}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Conta de origem
            </label>
            <Select value={contaOrigemId} onChange={(e) => setContaOrigemId(e.target.value)}>
              <option value="">Selecione…</option>
              {(contasQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.apelido}
                </option>
              ))}
            </Select>
            {solic.conta_origem_sugerida ? (
              <p className="text-[11px] text-zinc-500">
                Sugerida pelo solicitante: <strong>{solic.conta_origem_sugerida.apelido}</strong>
              </p>
            ) : null}
          </div>

          <div className="rounded-md border border-zinc-800/60 bg-zinc-900/40 p-3 text-xs text-zinc-400">
            Destino: <strong className="text-zinc-200">{solic.conta_destino?.apelido ?? '—'}</strong>
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
          <Button onClick={() => mut.mutate()} loading={mut.isPending}>
            <Check className="h-4 w-4" />
            Aprovar transferência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
