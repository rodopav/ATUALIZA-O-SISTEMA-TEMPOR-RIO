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
  tem_limite: z.boolean(),
  valor_limite: z.string(),
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
  tem_limite: false,
  valor_limite: '',
}

function rowToForm(row: ContaWithEmpresa): ContaForm {
  const extra = row as ContaWithEmpresa & {
    is_caixa_fisico?: boolean
    tem_limite?: boolean
    limite?: { valor_limite: number; ativo: boolean } | null
  }
  return {
    empresa_id: row.empresa_id,
    banco: row.banco,
    agencia: row.agencia ?? '',
    numero: row.numero ?? '',
    apelido: row.apelido,
    tipo: row.tipo,
    ativo: row.ativo,
    is_caixa_fisico: extra.is_caixa_fisico ?? row.tipo === 'CAIXA_FISICO',
    tem_limite: extra.tem_limite ?? false,
    valor_limite: extra.limite?.valor_limite
      ? String(extra.limite.valor_limite)
      : '',
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
  const isCaixa = values.is_caixa_fisico || values.tipo === 'CAIXA_FISICO'
  const temLimite = values.tem_limite
  const valorLimiteNum = Number.parseFloat(
    (values.valor_limite || '0').replace(',', '.'),
  )
  const valorLimite = Number.isFinite(valorLimiteNum) ? valorLimiteNum : 0

  if (temLimite && valorLimite <= 0) {
    throw new Error(
      'Quando "Limite de conta" estiver ligado, o valor do limite precisa ser maior que zero.',
    )
  }

  const payload = {
    empresa_id: values.empresa_id,
    banco: values.banco.trim(),
    agencia: values.agencia?.trim() || null,
    numero: values.numero?.trim() || null,
    apelido: values.apelido.trim(),
    tipo: values.tipo,
    ativo: values.ativo,
    is_caixa_fisico: isCaixa,
    tem_limite: temLimite,
  }

  let contaId: string
  if (editing) {
    const { error } = await supabase
      .from('contas_bancarias')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(payload as any)
      .eq('id', editing.id)
    if (error) throw error
    contaId = editing.id
  } else {
    const { data, error } = await supabase
      .from('contas_bancarias')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(payload as any)
      .select('id')
      .single()
    if (error) throw error
    contaId = data.id
  }

  // limites_conta: upsert quando tem_limite=true; deactivate quando false
  // (tabela limites_conta ainda não está nos database.types — cast pra any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  if (temLimite) {
    const limitePayload = {
      conta_id: contaId,
      valor_limite: valorLimite,
      ativo: true,
      atualizado_em: new Date().toISOString(),
    }
    const { error: limErr } = await sb
      .from('limites_conta')
      .upsert(limitePayload, { onConflict: 'conta_id' })
    if (limErr) throw limErr
  } else {
    // Desativa qualquer limite existente — não delete (preserva histórico)
    const { error: limErr } = await sb
      .from('limites_conta')
      .update({ ativo: false })
      .eq('conta_id', contaId)
    if (limErr) {
      // ignora se row não existe; reporta outros erros
      if (limErr.code !== 'PGRST116') throw limErr
    }
  }
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
