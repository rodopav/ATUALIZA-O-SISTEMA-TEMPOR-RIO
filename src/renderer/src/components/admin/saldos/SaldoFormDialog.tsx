import * as React from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert'
import { Button } from '../../ui/button'
import { Spinner } from '../../ui/spinner'
import { toast } from '../../ui/use-toast'
import { ConfirmDialog } from '../ConfirmDialog'
import { supabase } from '../../../lib/supabase'
import { mapError } from '../../../lib/error-mapper'
import { useAuthStore } from '../../../lib/auth-store'
import type { SaldoInicialWithJoins } from '../../../lib/admin-queries'
import {
  SaldoFormBody,
  type SaldoContaOption,
} from './SaldoFormBody'

export type { SaldoContaOption } from './SaldoFormBody'
export {
  periodoToInputValue,
  inputValueToPeriodo,
} from './SaldoFormBody'

export const saldoSchema = z.object({
  conta_id: z.string().min(1, 'Selecione a conta.'),
  periodo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Período inválido.')
    .refine((v) => v.endsWith('-01'), 'O período deve ser o primeiro dia do mês.'),
  valor: z.number(),
})

export type SaldoForm = z.infer<typeof saldoSchema>

const DEFAULTS: SaldoForm = { conta_id: '', periodo: '', valor: 0 }

interface SaldoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: SaldoInicialWithJoins | null
  contas: SaldoContaOption[]
}

export function SaldoFormDialog({
  open,
  onOpenChange,
  initial,
  contas,
}: SaldoFormDialogProps): React.ReactElement {
  const qc = useQueryClient()
  const session = useAuthStore((s) => s.session)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [confirmReplaceOpen, setConfirmReplaceOpen] = React.useState(false)
  const [pendingValues, setPendingValues] = React.useState<SaldoForm | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<SaldoForm>({
    resolver: zodResolver(saldoSchema),
    defaultValues: DEFAULTS,
    mode: 'onBlur',
  })

  React.useEffect(() => {
    if (!open) return
    if (initial) {
      form.reset({
        conta_id: initial.conta_id,
        periodo: initial.periodo,
        valor: Number(initial.valor),
      })
    } else {
      form.reset(DEFAULTS)
    }
    setSubmitError(null)
  }, [open, initial, form])

  const persist = async (values: SaldoForm): Promise<void> => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      if (initial) {
        const { error } = await supabase
          .from('saldos_iniciais')
          .update({
            conta_id: values.conta_id,
            periodo: values.periodo,
            valor: values.valor,
          })
          .eq('id', initial.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('saldos_iniciais')
          .upsert(
            {
              conta_id: values.conta_id,
              periodo: values.periodo,
              valor: values.valor,
              created_by: session?.user.id ?? null,
            },
            { onConflict: 'conta_id,periodo' },
          )
        if (error) throw error
      }
      void qc.invalidateQueries({ queryKey: ['admin', 'saldos_iniciais'] })
      toast({
        title: initial ? 'Saldo atualizado' : 'Saldo registrado',
        description: 'Operação concluída com sucesso.',
        variant: 'success',
      })
      onOpenChange(false)
    } catch (err) {
      setSubmitError(mapError(err).description)
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!initial) {
      const { data, error } = await supabase
        .from('saldos_iniciais')
        .select('id')
        .eq('conta_id', values.conta_id)
        .eq('periodo', values.periodo)
        .maybeSingle()
      if (error) {
        setSubmitError(mapError(error).description)
        return
      }
      if (data) {
        setPendingValues(values)
        setConfirmReplaceOpen(true)
        return
      }
    }
    await persist(values)
  })

  const handleConfirmReplace = async (): Promise<void> => {
    if (!pendingValues) return
    setConfirmReplaceOpen(false)
    await persist(pendingValues)
    setPendingValues(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {initial ? 'Editar saldo inicial' : 'Novo saldo inicial'}
            </DialogTitle>
            <DialogDescription>
              Informe a conta, o período (mês/ano) e o valor de abertura.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            {submitError ? (
              <Alert variant="destructive">
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}

            <SaldoFormBody form={form} contas={contas} />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner /> : null}
                {initial ? 'Salvar alterações' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmReplaceOpen}
        onOpenChange={(o) => {
          setConfirmReplaceOpen(o)
          if (!o) setPendingValues(null)
        }}
        title="Substituir saldo existente?"
        description="Já existe um saldo inicial para esta conta neste período. Deseja substituí-lo pelo novo valor?"
        confirmLabel="Substituir"
        destructive
        onConfirm={handleConfirmReplace}
        isPending={isSubmitting}
      />
    </>
  )
}
