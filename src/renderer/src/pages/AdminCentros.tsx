import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'
import { Controller } from 'react-hook-form'
import type { LoaderFunctionArgs } from 'react-router-dom'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Badge } from '../components/ui/badge'
import { CrudPage, type CrudHandlers } from '../components/admin/CrudPage'
import { RowActionsMenu } from '../components/admin/RowActionsMenu'
import { useAuthStore } from '../lib/auth-store'
import { supabase } from '../lib/supabase'
import {
  adminKeys,
  fetchCentros,
  type CentroCusto,
} from '../lib/admin-queries'

const centroSchema = z.object({
  codigo: z
    .string()
    .min(1, 'Código é obrigatório.')
    .regex(/^[A-Z0-9_-]+$/, 'Use apenas letras maiúsculas, números, "_" ou "-".'),
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.'),
  ativo: z.boolean(),
})

type CentroForm = z.infer<typeof centroSchema>

const defaultValues: CentroForm = {
  codigo: '',
  nome: '',
  ativo: true,
}

function rowToForm(row: CentroCusto): CentroForm {
  return {
    codigo: row.codigo,
    nome: row.nome,
    ativo: row.ativo,
  }
}

function buildColumns(
  h: CrudHandlers<CentroCusto>,
): ColumnDef<CentroCusto, unknown>[] {
  return [
    {
      accessorKey: 'codigo',
      header: 'Código',
      cell: (ctx) => (
        <span className="font-mono text-xs uppercase">{ctx.getValue<string>()}</span>
      ),
    },
    { accessorKey: 'nome', header: 'Nome' },
    {
      accessorKey: 'ativo',
      header: 'Situação',
      cell: (ctx) => (
        <Badge variant={ctx.getValue<boolean>() ? 'success' : 'destructive'}>
          {ctx.getValue<boolean>() ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      id: 'acoes',
      header: () => <span className="sr-only">Ações</span>,
      cell: (ctx) => (
        <RowActionsMenu
          onEdit={() => h.openEdit(ctx.row.original)}
          onDelete={
            ctx.row.original.ativo ? () => h.openDelete(ctx.row.original) : undefined
          }
        />
      ),
      size: 60,
    },
  ]
}

interface FormFieldsProps {
  form: import('react-hook-form').UseFormReturn<CentroForm>
}

function FormFields({ form }: FormFieldsProps): React.ReactElement {
  const { register, control, formState } = form
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="codigo">Código *</Label>
        <Controller
          name="codigo"
          control={control}
          render={({ field }) => (
            <Input
              id="codigo"
              autoFocus
              maxLength={32}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
              onBlur={field.onBlur}
            />
          )}
        />
        {formState.errors.codigo ? (
          <p className="text-xs text-destructive">{formState.errors.codigo.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Apenas letras maiúsculas, números, "_" e "-".
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" {...register('nome')} />
        {formState.errors.nome ? (
          <p className="text-xs text-destructive">{formState.errors.nome.message}</p>
        ) : null}
      </div>

      <Controller
        name="ativo"
        control={control}
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="ativo-switch">Ativo</Label>
              <p className="text-xs text-muted-foreground">
                Centros de custo inativos não aparecem em seletores.
              </p>
            </div>
            <Switch
              id="ativo-switch"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </div>
        )}
      />
    </div>
  )
}

async function saveCentro(values: CentroForm, editing: CentroCusto | null): Promise<void> {
  const payload = {
    codigo: values.codigo.trim().toUpperCase(),
    nome: values.nome.trim(),
    ativo: values.ativo,
  }
  if (editing) {
    const { error } = await supabase
      .from('centros_de_custo')
      .update(payload)
      .eq('id', editing.id)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('centros_de_custo').insert(payload)
  if (error) throw error
}

async function deactivateCentro(row: CentroCusto): Promise<void> {
  const { error } = await supabase
    .from('centros_de_custo')
    .update({ ativo: false })
    .eq('id', row.id)
  if (error) throw error
}

export function AdminCentrosPage(): React.ReactElement {
  const isAdmin = useAuthStore((s) => s.isAdmin)
  return (
    <CrudPage<CentroCusto, typeof centroSchema>
      title="Centros de Custo"
      description="Gestão dos centros de custo."
      buildColumns={buildColumns}
      queryKey={adminKeys.centros}
      queryFn={fetchCentros}
      formSchema={centroSchema}
      defaultValues={defaultValues}
      formFields={(form) => <FormFields form={form} />}
      rowToForm={rowToForm}
      onSave={saveCentro}
      onDelete={isAdmin ? deactivateCentro : undefined}
      deleteTitle="Desativar centro de custo"
      deleteDescription={(row) => (
        <span>
          O centro <strong>{row.nome}</strong> será marcado como inativo.
        </span>
      )}
      formTitle={{ create: 'Novo centro de custo', edit: 'Editar centro de custo' }}
      createLabel="+ Novo centro"
      emptyMessage="Nenhum centro de custo cadastrado."
    />
  )
}

export default AdminCentrosPage

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  return null
}
