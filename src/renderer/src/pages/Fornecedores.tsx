import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'
import type { LoaderFunctionArgs } from 'react-router-dom'
import { Badge } from '../components/ui/badge'
import { CrudPage, type CrudHandlers } from '../components/admin/CrudPage'
import { RowActionsMenu } from '../components/admin/RowActionsMenu'
import { FornecedorFormFields } from '../components/admin/fornecedores/FornecedorFormFields'
import { supabase } from '../lib/supabase'
import {
  adminKeys,
  fetchFornecedores,
  type FornecedorCliente,
} from '../lib/admin-queries'
import { validateCPF, digitsOnly as cpfDigits } from '../lib/cpf'
import { validateCNPJ, digitsOnly as cnpjDigits } from '../lib/cnpj'

const fornecedorSchema = z
  .object({
    tipo: z.enum(['PF', 'PJ']),
    documento: z.string().nullable().optional(),
    nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.'),
    ativo: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const doc = data.documento?.trim() ?? ''
    if (!doc) return // documento opcional
    const digits = data.tipo === 'PF' ? cpfDigits(doc) : cnpjDigits(doc)
    const expected = data.tipo === 'PF' ? 11 : 14
    if (digits.length !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documento'],
        message:
          data.tipo === 'PF'
            ? 'CPF deve conter 11 dígitos.'
            : 'CNPJ deve conter 14 dígitos.',
      })
      return
    }
    const valid = data.tipo === 'PF' ? validateCPF(digits) : validateCNPJ(digits)
    if (!valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documento'],
        message:
          data.tipo === 'PF'
            ? 'CPF inválido (dígitos verificadores incorretos).'
            : 'CNPJ inválido (dígitos verificadores incorretos).',
      })
    }
  })

type FornecedorForm = z.infer<typeof fornecedorSchema>

const defaultValues: FornecedorForm = {
  tipo: 'PJ',
  documento: '',
  nome: '',
  ativo: true,
}

function rowToForm(row: FornecedorCliente): FornecedorForm {
  return {
    tipo: row.tipo,
    documento: row.documento ?? '',
    nome: row.nome,
    ativo: row.ativo,
  }
}

function buildColumns(
  h: CrudHandlers<FornecedorCliente>,
): ColumnDef<FornecedorCliente, unknown>[] {
  return [
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: (ctx) => (
        <Badge variant="outline">
          {ctx.getValue<'PF' | 'PJ'>() === 'PF' ? 'PF' : 'PJ'}
        </Badge>
      ),
      size: 80,
    },
    {
      accessorKey: 'documento',
      header: 'Documento',
      cell: (ctx) => (
        <span className="tabular-nums">{ctx.getValue<string | null>() ?? '—'}</span>
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
      // Editar e excluir disponíveis pra TODOS os usuários.
      cell: (ctx) => (
        <RowActionsMenu
          onEdit={() => h.openEdit(ctx.row.original)}
          onDelete={() => h.openDelete(ctx.row.original)}
        />
      ),
      size: 60,
    },
  ]
}

async function saveFornecedor(
  values: FornecedorForm,
  editing: FornecedorCliente | null,
): Promise<void> {
  const payload = {
    tipo: values.tipo,
    documento: values.documento?.trim() || null,
    nome: values.nome.trim(),
    ativo: values.ativo,
  }
  if (editing) {
    const { error } = await supabase
      .from('fornecedores_clientes')
      .update(payload)
      .eq('id', editing.id)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('fornecedores_clientes').insert(payload)
  if (error) throw error
}

async function deleteFornecedor(row: FornecedorCliente): Promise<void> {
  const { error } = await supabase
    .from('fornecedores_clientes')
    .delete()
    .eq('id', row.id)
  if (error) {
    // FK violation: há lançamentos apontando pra este fornecedor. Não deixa
    // virar órfão — orienta a desativar (editar e marcar como inativo).
    if ((error as { code?: string }).code === '23503') {
      throw new Error(
        `Não é possível excluir "${row.nome}": há lançamentos vinculados a este cadastro. ` +
          'Para tirá-lo da lista, edite o cadastro e marque como inativo.',
      )
    }
    throw error
  }
}

export function FornecedoresPage(): React.ReactElement {
  const buildCols = React.useCallback(
    (h: CrudHandlers<FornecedorCliente>) => buildColumns(h),
    [],
  )

  return (
    <CrudPage<FornecedorCliente, typeof fornecedorSchema>
      title="Fornecedores e Clientes"
      description="Catálogo de fornecedores e clientes. Todos os usuários podem cadastrar, editar e excluir."
      buildColumns={buildCols}
      queryKey={adminKeys.fornecedores}
      queryFn={fetchFornecedores}
      formSchema={fornecedorSchema}
      defaultValues={defaultValues}
      formFields={(form) => <FornecedorFormFields form={form} />}
      rowToForm={rowToForm}
      onSave={saveFornecedor}
      onDelete={deleteFornecedor}
      deleteTitle="Excluir fornecedor / cliente"
      deleteConfirmLabel="Excluir"
      deleteSuccessTitle="Fornecedor excluído"
      deleteDescription={(row) => (
        <span>
          O cadastro <strong>{row.nome}</strong> será{' '}
          <strong>excluído definitivamente</strong>. Se houver lançamentos
          vinculados a ele, a exclusão é bloqueada — nesse caso, edite o
          cadastro e marque como inativo.
        </span>
      )}
      formTitle={{ create: 'Novo fornecedor / cliente', edit: 'Editar fornecedor / cliente' }}
      createLabel="+ Novo cadastro"
      emptyMessage="Nenhum fornecedor ou cliente cadastrado."
    />
  )
}

export default FornecedoresPage

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  return null
}
