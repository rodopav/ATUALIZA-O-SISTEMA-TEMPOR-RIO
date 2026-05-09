import * as React from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Spinner } from '../../ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert'
import { Textarea } from '../../ui/textarea'
import { Label } from '../../ui/label'
import { toast } from '../../ui/use-toast'
import { mapError } from '../../../lib/error-mapper'
import { formatPeriodo } from '../../../lib/format'
import { useReabrirMes } from './useFecharMes'

interface ReabrirMesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ID of the row in `periodos_fechados`. */
  fechamentoId: string | null
  periodo: string | null
}

const MIN_LEN = 30

export function ReabrirMesDialog({
  open,
  onOpenChange,
  fechamentoId,
  periodo,
}: ReabrirMesDialogProps): React.ReactElement {
  const [motivo, setMotivo] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const mutation = useReabrirMes()

  React.useEffect(() => {
    if (!open) {
      setMotivo('')
      setError(null)
    }
  }, [open])

  const tooShort = motivo.trim().length < MIN_LEN

  const handleConfirm = async (): Promise<void> => {
    if (!fechamentoId) return
    if (tooShort) {
      setError(`Justifique a reabertura com pelo menos ${MIN_LEN} caracteres.`)
      return
    }
    try {
      await mutation.mutateAsync({ id: fechamentoId, motivo: motivo.trim() })
      toast({
        title: 'Período reaberto',
        description: periodo
          ? `${formatPeriodo(periodo)} agora está disponível para edição.`
          : 'Operação concluída com sucesso.',
        variant: 'success',
      })
      onOpenChange(false)
    } catch (err) {
      const m = mapError(err)
      toast({ title: m.title, description: m.description, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Reabrir período {periodo ? formatPeriodo(periodo) : ''}
          </DialogTitle>
          <DialogDescription>
            Esta ação remove o bloqueio do período e permite novas edições nos
            lançamentos correspondentes.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            Reaberturas ficam registradas no histórico junto com a justificativa
            informada abaixo.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="motivo-textarea">Motivo da reabertura *</Label>
          <Textarea
            id="motivo-textarea"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value)
              if (error) setError(null)
            }}
            placeholder={`Descreva detalhadamente o motivo (mínimo ${MIN_LEN} caracteres).`}
            rows={4}
          />
          <p className="flex items-center justify-between text-xs">
            <span className={tooShort ? 'text-destructive' : 'text-muted-foreground'}>
              {motivo.trim().length}/{MIN_LEN} caracteres
            </span>
          </p>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
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
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={mutation.isPending || tooShort}
          >
            {mutation.isPending ? <Spinner /> : null}
            Confirmar reabertura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
