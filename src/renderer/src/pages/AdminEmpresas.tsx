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
  fetchEmpresas,
  type Empresa,
} from '../lib/admin-queries'
import { formatCNPJ, validateCNPJ } from '../lib/cnpj'

const empresaSchema = z.object({
  razao_social: z.string().min(3, 'Razão social deve ter ao menos 3 caracteres.'),
  nome_fantasia: z.string().nullable().optional(),
  cnpj: z
    .string()
    .nullable()
    .optional()
    .refine(
      (v) => !v || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v),
      { message: 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX.' },
    )
    .refine((v) => !v || validateCNPJ(v), {
      message: 'CNPJ inválido (dígitos verificadores incorretos).',
    }),
  ativo: z.boolean(),
})

type EmpresaForm = z.infer<typeof empresaSchema>

const defaultValues: EmpresaForm = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  ativo: true,
}

function rowToForm(row: Empresa): EmpresaForm {
  return {
    razao_social: row.razao_social,
    nome_fantasia: row.nome_fantasia ?? '',
    cnpj: row.cnpj ?? '',
    ativo: row.ativo,
  }
}

function buildColumns(h: CrudHandlers<Empresa>): ColumnDef<Empresa, unknown>[] {
  return [
    { accessorKey: 'razao_social', header: 'Razão Social' },
    {
      accessorKey: 'nome_fantasia',
      header: 'Nome Fantasia',
      cell: (ctx) => ctx.getValue<string | null>() ?? '—',
    },
    {
      accessorKey: 'cnpj',
      header: 'CNPJ',
      cell: (ctx) => (
        <span className="tabular-nums">{ctx.getValue<string | null>() ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'ativo',
      header: 'Situação',
      cell: (ctx) => (
        <Badge variant={ctx.getValue<boolean>() ? 'success' : 'destructive'}>
          {ctx.getValue<boolean>() ? 'Ativa' : 'Inativa'}
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

function FormFields({
  form,
}: {
  form: import('react-hook-form').UseFormReturn<EmpresaForm>
}): React.ReactElement {
  const { register, control, formState } = form
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="razao-social">Razão social *</Label>
        <Input id="razao-social" autoFocus {...register('razao_social')} />
        {formState.errors.razao_social ? (
          <p className="text-xs text-destructive">
            {formState.errors.razao_social.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome-fantasia">Nome fantasia</Label>
        <Input id="nome-fantasia" {...register('nome_fantasia')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cnpj">CNPJ</Label>
        <Controller
          name="cnpj"
          control={control}
          render={({ field }) => (
            <Input
              id="cnpj"
              placeholder="00.000.000/0000-00"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
              onBlur={field.onBlur}
              maxLength={18}
            />
          )}
        />
        {formState.errors.cnpj ? (
          <p className="text-xs text-destructive">{formState.errors.cnpj.message}</p>
        ) : null}
      </div>

      <Controller
        name="ativo"
        control={control}
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="ativo-switch">Ativa</Label>
              <p className="text-xs text-muted-foreground">
                Empresas inativas não aparecem em seletores de novos lançamentos.
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

async function saveEmpresa(values: EmpresaForm, editing: Empresa | null): Promise<void> {
  const payload = {
    razao_social: values.razao_social.trim(),
    nome_fantasia: values.nome_fantasia?.trim() || null,
    cnpj: values.cnpj?.trim() || null,
    ativo: values.ativo,
  }
  if (editing) {
    const { error } = await supabase.from('empresas').update(payload).eq('id', editing.id)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('empresas').insert(payload)
  if (error) throw error
}

async function deactivateEmpresa(row: Empresa): Promise<void> {
  const { error } = await supabase
    .from('empresas')
    .update({ ativo: false })
    .eq('id', row.id)
  if (error) throw error
}

export function AdminEmpresasPage(): React.ReactElement {
  const isAdmin = useAuthStore((s) => s.isAdmin)

  return (
    <CrudPage<Empresa, typeof empresaSchema>
      title="Empresas"
      description="Gestão das empresas (admin financeiro)."
      buildColumns={buildColumns}
      queryKey={adminKeys.empresas}
      queryFn={fetchEmpresas}
      formSchema={empresaSchema}
      defaultValues={defaultValues}
      formFields={(form) => <FormFields form={form} />}
      rowToForm={rowToForm}
      onSave={saveEmpresa}
      onDelete={isAdmin ? deactivateEmpresa : undefined}
      deleteTitle="Desativar empresa"
      deleteDescription={(row) => (
        <span>
          A empresa <strong>{row.razao_social}</strong> será marcada como
          inativa. Seus dados permanecerão no histórico, mas ela deixará de
          aparecer nos seletores de novos lançamentos.
        </span>
      )}
      formTitle={{ create: 'Nova empresa', edit: 'Editar empresa' }}
      createLabel="+ Nova empresa"
      emptyMessage="Nenhuma empresa cadastrada."
    />
  )
}

export default AdminEmpresasPage

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  return null
}
