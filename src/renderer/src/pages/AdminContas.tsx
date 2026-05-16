import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'
import type { LoaderFunctionArgs } from 'react-router-dom'
import { Badge } from '../components/ui/badge'
import { CrudPage, type CrudHandlers } from '../components/admin/CrudPage'
import { RowActionsMenu } from '../components/admin/RowActionsMenu'
import {
  ContaFormFields,
  tipoContaLabel,
  type ContaTipo,
} from '../components/admin/contas/ContaFormFields'
import { useAuthStore } from '../lib/auth-store'
import { supabase } from '../lib/supabase'
import {
  adminKeys,
  fetchContas,
  type ContaWithEmpresa,
} from '../lib/admin-queries'

const contaSchema = z.object({
  empresa_id: z.string().min(1, 'Selecione a empresa.'),
  banco: z.string().min(1, 'Banco é obrigatório.'),
  agencia: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  apelido: z.string().min(2, 'Apelido deve ter ao menos 2 caracteres.'),
  tipo: z.enum(['CORRENTE', 'POUPANCA', 'CAIXA_FISICO', 'CARTAO_CREDITO_CONTA']),
  ativo: z.boolean(),
  is_caixa_fisico: z.boolean(),
})

type ContaForm = z.infer<typeof contaSchema>

const defaultValues: ContaForm = {
  empresa_id: '',
  banco: '',
  agencia: '',
  numero: '',
  apelido: '',
  tipo: 'CORRENTE',
  ativo: true,
  is_caixa_fisico: false,
}

function rowToForm(row: ContaWithEmpresa): ContaForm {
  return {
    empresa_id: row.empresa_id,
    banco: row.banco,
    agencia: row.agencia ?? '',
    numero: row.numero ?? '',
    apelido: row.apelido,
    tipo: row.tipo,
    ativo: row.ativo,
    // Compat: contas antigas com tipo CAIXA_FISICO viram is_caixa_fisico
    // automaticamente, mesmo sem a flag na linha (a migration faz backfill,
    // mas isso garante o front até a query refresh).
    is_caixa_fisico:
      (row as ContaWithEmpresa & { is_caixa_fisico?: boolean })
        .is_caixa_fisico ?? row.tipo === 'CAIXA_FISICO',
  }
}

function buildColumns(
  h: CrudHandlers<ContaWithEmpresa>,
): ColumnDef<ContaWithEmpresa, unknown>[] {
  return [
    { accessorKey: 'apelido', header: 'Apelido' },
    { accessorKey: 'banco', header: 'Banco' },
    {
      accessorKey: 'numero',
      header: 'Número',
      cell: (ctx) => ctx.getValue<string | null>() ?? '—',
    },
    {
      id: 'empresa',
      header: 'Empresa',
      cell: (ctx) => ctx.row.original.empresa?.razao_social ?? '—',
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: (ctx) => <Badge variant="outline">{tipoContaLabel(ctx.getValue<ContaTipo>())}</Badge>,
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

async function saveConta(
  values: ContaForm,
  editing: ContaWithEmpresa | null,
): Promise<void> {
  // Sincroniza ambos os caminhos: se o tipo for CAIXA_FISICO, garantimos
  // a flag; e a flag dedicada também grava sempre o estado escolhido pelo
  // usuário. Isso evita inconsistência caso o admin escolha tipo CORRENTE
  // mas marque "Caixa físico" no switch (caso de uso valido — caixinha).
  const isCaixa = values.is_caixa_fisico || values.tipo === 'CAIXA_FISICO'
  const payload = {
    empresa_id: values.empresa_id,
    banco: values.banco.trim(),
    agencia: values.agencia?.trim() || null,
    numero: values.numero?.trim() || null,
    apelido: values.apelido.trim(),
    tipo: values.tipo,
    ativo: values.ativo,
    is_caixa_fisico: isCaixa,
  }
  if (editing) {
    const { error } = await supabase
      .from('contas_bancarias')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(payload as any)
      .eq('id', editing.id)
    if (error) throw error
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('contas_bancarias').insert(payload as any)
  if (error) throw error
}

async function deactivateConta(row: ContaWithEmpresa): Promise<void> {
  const { error } = await supabase
    .from('contas_bancarias')
    .update({ ativo: false })
    .eq('id', row.id)
  if (error) throw error
}

export function AdminContasPage(): React.ReactElement {
  const isAdmin = useAuthStore((s) => s.isAdmin)
  return (
    <CrudPage<ContaWithEmpresa, typeof contaSchema>
      title="Contas Bancárias"
      description="Gestão das contas bancárias por empresa."
      buildColumns={buildColumns}
      queryKey={adminKeys.contas}
      queryFn={fetchContas}
      formSchema={contaSchema}
      defaultValues={defaultValues}
      formFields={(form) => <ContaFormFields form={form} />}
      rowToForm={rowToForm}
      onSave={saveConta}
      onDelete={isAdmin ? deactivateConta : undefined}
      deleteTitle="Desativar conta"
      deleteDescription={(row) => (
        <span>
          A conta <strong>{row.apelido}</strong> será marcada como inativa.
          Você poderá reativá-la editando o cadastro.
        </span>
      )}
      formTitle={{ create: 'Nova conta', edit: 'Editar conta' }}
      createLabel="+ Nova conta"
      emptyMessage="Nenhuma conta cadastrada."
    />
  )
}

export default AdminContasPage

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  return null
}
