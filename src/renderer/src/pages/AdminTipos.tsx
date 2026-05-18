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
  fetchTipos,
  type TipoOperacao,
} from '../lib/admin-queries'

const tipoSchema = z.object({
  codigo: z
    .string()
    .min(1, 'Código é obrigatório.')
    .regex(/^[A-Z0-9_-]+$/, 'Use apenas letras maiúsculas, números, "_" ou "-".'),
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.'),
  is_transferencia: z.boolean(),
  is_tarifa: z.boolean(),
  ativo: z.boolean(),
})

type TipoForm = z.infer<typeof tipoSchema>

const defaultValues: TipoForm = {
  codigo: '',
  nome: '',
  is_transferencia: false,
  is_tarifa: false,
  ativo: true,
}

function rowToForm(row: TipoOperacao): TipoForm {
  const extra = row as TipoOperacao & { is_tarifa?: boolean }
  return {
    codigo: row.codigo,
    nome: row.nome,
    is_transferencia: row.is_transferencia,
    is_tarifa: extra.is_tarifa ?? false,
    ativo: row.ativo,
  }
}

function buildColumns(
  h: CrudHandlers<TipoOperacao>,
): ColumnDef<TipoOperacao, unknown>[] {
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
      accessorKey: 'is_transferencia',
      header: 'Transferência',
      cell: (ctx) =>
        ctx.getValue<boolean>() ? (
          <Badge variant="secondary">Sim</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
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
  form: import('react-hook-form').UseFormReturn<TipoForm>
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
        name="is_transferencia"
        control={control}
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="transf-switch">Transferência</Label>
              <p className="text-xs text-muted-foreground">
                Operação que move saldo entre 2 contas.
              </p>
            </div>
            <Switch
              id="transf-switch"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </div>
        )}
      />

      <Controller
        name="is_tarifa"
        control={control}
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/[0.04] p-3">
            <div>
              <Label htmlFor="tarifa-switch">Tarifa (pode estourar saldo)</Label>
              <p className="text-xs text-muted-foreground">
                Lançamentos deste tipo passam mesmo sem saldo na conta — útil
                pra tarifas bancárias, juros, IOF. Ficam marcados como TARIFA
                na listagem.
              </p>
            </div>
            <Switch
              id="tarifa-switch"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </div>
        )}
      />

      <Controller
        name="ativo"
        control={control}
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="ativo-switch">Ativo</Label>
              <p className="text-xs text-muted-foreground">
                Tipos inativos não aparecem em seletores.
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

async function saveTipo(values: TipoForm, editing: TipoOperacao | null): Promise<void> {
  const payload = {
    codigo: values.codigo.trim().toUpperCase(),
    nome: values.nome.trim(),
    is_transferencia: values.is_transferencia,
    is_tarifa: values.is_tarifa,
    ativo: values.ativo,
  }
  if (editing) {
    const { error } = await supabase
      .from('tipos_operacao')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(payload as any)
      .eq('id', editing.id)
    if (error) throw error
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('tipos_operacao').insert(payload as any)
  if (error) throw error
}

async function deactivateTipo(row: TipoOperacao): Promise<void> {
  const { error } = await supabase
    .from('tipos_operacao')
    .update({ ativo: false })
    .eq('id', row.id)
  if (error) throw error
}

export function AdminTiposPage(): React.ReactElement {
  const isAdmin = useAuthStore((s) => s.isAdmin)
  return (
    <CrudPage<TipoOperacao, typeof tipoSchema>
      title="Tipos de Operação"
      description="Gestão dos tipos de operação utilizados nos lançamentos."
      buildColumns={buildColumns}
      queryKey={adminKeys.tipos}
      queryFn={fetchTipos}
      formSchema={tipoSchema}
      defaultValues={defaultValues}
      formFields={(form) => <FormFields form={form} />}
      rowToForm={rowToForm}
      onSave={saveTipo}
      onDelete={isAdmin ? deactivateTipo : undefined}
      deleteTitle="Desativar tipo"
      deleteDescription={(row) => (
        <span>
          O tipo <strong>{row.nome}</strong> será marcado como inativo.
        </span>
      )}
      formTitle={{ create: 'Novo tipo', edit: 'Editar tipo' }}
      createLabel="+ Novo tipo"
      emptyMessage="Nenhum tipo de operação cadastrado."
    />
  )
}

export default AdminTiposPage

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  return null
}
