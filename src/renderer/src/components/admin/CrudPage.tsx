import * as React from 'react'
import {
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import type { DefaultValues, UseFormReturn } from 'react-hook-form'
import type { z, ZodTypeAny } from 'zod'
import { toast } from '../ui/use-toast'
import { CrudList } from './CrudList'
import { CrudFormDialog } from './CrudFormDialog'
import { ConfirmDialog } from './ConfirmDialog'
import { mapError } from '../../lib/error-mapper'

type AnyValues<S extends ZodTypeAny> = z.infer<S>

export interface CrudHandlers<TRow> {
  openEdit: (row: TRow) => void
  openDelete: (row: TRow) => void
}

/**
 * Props for the generic admin CRUD scaffold. Pages compose their columns +
 * form definition and pass them in; the scaffold renders the list, the form
 * dialog (create/edit) and the delete confirmation.
 */
export interface CrudPageProps<TRow extends { id: string }, S extends ZodTypeAny> {
  title: string
  description?: string
  buildColumns: (handlers: CrudHandlers<TRow>) => ColumnDef<TRow, unknown>[]
  queryKey: QueryKey
  queryFn: () => Promise<TRow[]>
  staleTime?: number
  formSchema: S
  defaultValues: DefaultValues<AnyValues<S>>
  formFields: (form: UseFormReturn<AnyValues<S>>) => React.ReactNode
  rowToForm?: (row: TRow) => AnyValues<S>
  onSave: (values: AnyValues<S>, editing: TRow | null) => Promise<void>
  onDelete?: (row: TRow) => Promise<void>
  deleteTitle?: string
  deleteDescription?: (row: TRow) => React.ReactNode
  createLabel?: string
  hideCreate?: boolean
  banner?: React.ReactNode
  toolbar?: React.ReactNode
  emptyMessage?: string
  formTitle?: { create: string; edit: string }
}

export function CrudPage<TRow extends { id: string }, S extends ZodTypeAny>(
  props: CrudPageProps<TRow, S>,
): React.ReactElement {
  const {
    title,
    description,
    buildColumns,
    queryKey,
    queryFn,
    staleTime,
    formSchema,
    defaultValues,
    formFields,
    rowToForm,
    onSave,
    onDelete,
    deleteTitle = 'Confirmar desativação',
    deleteDescription,
    createLabel,
    hideCreate,
    banner,
    toolbar,
    emptyMessage,
    formTitle,
  } = props

  const qc = useQueryClient()
  const listQ = useQuery<TRow[]>({
    queryKey,
    queryFn,
    ...(staleTime !== undefined ? { staleTime } : {}),
  })

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<TRow | null>(null)
  const [deleting, setDeleting] = React.useState<TRow | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handlers = React.useMemo<CrudHandlers<TRow>>(
    () => ({
      openEdit: (row) => {
        setEditing(row)
        setSubmitError(null)
        setFormOpen(true)
      },
      openDelete: (row) => {
        setDeleting(row)
        setDeleteOpen(true)
      },
    }),
    [],
  )

  const columns = React.useMemo(
    () => buildColumns(handlers),
    [buildColumns, handlers],
  )

  const handleNew = (): void => {
    setEditing(null)
    setSubmitError(null)
    setFormOpen(true)
  }

  const initialValues = React.useMemo(() => {
    if (!editing) return null
    return rowToForm ? rowToForm(editing) : (editing as unknown as AnyValues<S>)
  }, [editing, rowToForm])

  const handleSubmit = async (values: AnyValues<S>): Promise<void> => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onSave(values, editing)
      void qc.invalidateQueries({ queryKey })
      toast({
        title: editing ? 'Registro atualizado' : 'Registro criado',
        description: 'Operação concluída com sucesso.',
        variant: 'success',
      })
      setFormOpen(false)
      setEditing(null)
    } catch (err) {
      setSubmitError(mapError(err).description)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!deleting || !onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(deleting)
      void qc.invalidateQueries({ queryKey })
      toast({
        title: 'Registro desativado',
        description: 'Operação concluída com sucesso.',
        variant: 'success',
      })
      setDeleteOpen(false)
      setDeleting(null)
    } catch (err) {
      const m = mapError(err)
      toast({ title: m.title, description: m.description, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <CrudList<TRow>
        title={title}
        description={description}
        columns={columns}
        data={listQ.data ?? []}
        isLoading={listQ.isLoading}
        errorMsg={listQ.error ? mapError(listQ.error).description : null}
        emptyMessage={emptyMessage}
        createLabel={createLabel}
        hideCreate={hideCreate}
        onCreate={handleNew}
        banner={banner}
        toolbar={toolbar}
      />

      <CrudFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o) {
            setEditing(null)
            setSubmitError(null)
          }
        }}
        title={
          editing
            ? formTitle?.edit ?? 'Editar registro'
            : formTitle?.create ?? 'Novo registro'
        }
        schema={formSchema}
        defaultValues={defaultValues}
        initialValues={initialValues}
        renderFields={formFields}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Salvar alterações' : 'Cadastrar'}
        errorMessage={submitError}
        isSubmitting={isSubmitting}
      />

      {onDelete ? (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={(o) => {
            setDeleteOpen(o)
            if (!o) setDeleting(null)
          }}
          title={deleteTitle}
          description={
            deleting
              ? deleteDescription?.(deleting) ??
                'Esta ação desativará o registro selecionado.'
              : null
          }
          confirmLabel="Desativar"
          destructive
          onConfirm={handleDelete}
          isPending={isDeleting}
        />
      ) : null}
    </>
  )
}
