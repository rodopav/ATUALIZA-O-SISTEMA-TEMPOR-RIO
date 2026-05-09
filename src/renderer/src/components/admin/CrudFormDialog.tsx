import * as React from 'react'
import { useForm, type DefaultValues, type UseFormReturn, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z, ZodTypeAny } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'

export interface CrudFormDialogProps<S extends ZodTypeAny> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  schema: S
  defaultValues: DefaultValues<z.infer<S>>
  /**
   * If provided, the dialog hydrates the form with these values when opened.
   * Useful for "edit" mode.
   */
  initialValues?: z.infer<S> | null
  renderFields: (form: UseFormReturn<z.infer<S>>) => React.ReactNode
  onSubmit: (values: z.infer<S>) => Promise<void> | void
  submitLabel?: string
  errorMessage?: string | null
  isSubmitting?: boolean
}

export function CrudFormDialog<S extends ZodTypeAny>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  initialValues,
  renderFields,
  onSubmit,
  submitLabel = 'Salvar',
  errorMessage,
  isSubmitting,
}: CrudFormDialogProps<S>): React.ReactElement {
  type Values = z.infer<S> & FieldValues

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
  })

  // Reset to defaults when opening for create, or hydrate for edit.
  React.useEffect(() => {
    if (!open) return
    if (initialValues) {
      form.reset(initialValues as Values)
    } else {
      form.reset(defaultValues as Values)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values as z.infer<S>)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {renderFields(form as unknown as UseFormReturn<z.infer<S>>)}

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
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
