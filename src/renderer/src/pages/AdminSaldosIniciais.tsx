import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import type { LoaderFunctionArgs } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'
import { DataTable } from '../components/ui/data-table'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { toast } from '../components/ui/use-toast'
import { ConfirmDialog } from '../components/admin/ConfirmDialog'
import {
  SaldoFormDialog,
  periodoToInputValue,
  inputValueToPeriodo,
  type SaldoContaOption,
} from '../components/admin/saldos/SaldoFormDialog'
import { buildSaldoColumns } from '../components/admin/saldos/saldo-columns'
import { supabase } from '../lib/supabase'
import { mapError } from '../lib/error-mapper'
import {
  adminKeys,
  contasAdminQuery,
  fetchSaldosIniciais,
  type SaldoInicialWithJoins,
} from '../lib/admin-queries'
import { formatPeriodo } from '../lib/format'

export function AdminSaldosIniciaisPage(): React.ReactElement {
  const qc = useQueryClient()
  const [filterPeriodo, setFilterPeriodo] = React.useState<string | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SaldoInicialWithJoins | null>(null)
  const [deleting, setDeleting] = React.useState<SaldoInicialWithJoins | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const listQ = useQuery({
    queryKey: adminKeys.saldosIniciais(filterPeriodo),
    queryFn: () => fetchSaldosIniciais(filterPeriodo),
    staleTime: 1000 * 60,
  })
  const contasQ = useQuery(contasAdminQuery)

  const contas = React.useMemo<SaldoContaOption[]>(
    () =>
      (contasQ.data ?? [])
        .filter((c) => c.ativo)
        .map((c) => ({
          id: c.id,
          apelido: c.apelido,
          empresa: c.empresa?.razao_social ?? null,
        })),
    [contasQ.data],
  )

  const openNew = (): void => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (row: SaldoInicialWithJoins): void => {
    setEditing(row)
    setFormOpen(true)
  }

  const openDelete = (row: SaldoInicialWithJoins): void => {
    setDeleting(row)
    setDeleteOpen(true)
  }

  const handleDelete = async (): Promise<void> => {
    if (!deleting) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('saldos_iniciais')
        .delete()
        .eq('id', deleting.id)
      if (error) throw error
      void qc.invalidateQueries({ queryKey: ['admin', 'saldos_iniciais'] })
      toast({
        title: 'Saldo excluído',
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

  const columns = React.useMemo(
    () => buildSaldoColumns(openEdit, openDelete),
    [],
  )

  const errorMsg = listQ.error ? mapError(listQ.error).description : null
  const data = listQ.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saldos Iniciais"
        description="Cadastro dos saldos de abertura por conta e período."
        actions={
          <Button type="button" onClick={openNew}>
            <Plus className="h-4 w-4" />
            Novo saldo
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="filter-periodo">Filtrar por período</Label>
            <div className="flex items-center gap-2">
              <Input
                id="filter-periodo"
                type="month"
                value={filterPeriodo ? periodoToInputValue(filterPeriodo) : ''}
                onChange={(e) => {
                  const next = inputValueToPeriodo(e.target.value)
                  setFilterPeriodo(next || null)
                }}
              />
              {filterPeriodo ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilterPeriodo(null)}
                  aria-label="Limpar filtro"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {errorMsg ? (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar saldos</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <DataTable<SaldoInicialWithJoins>
            columns={columns}
            data={data}
            isLoading={listQ.isLoading}
            emptyMessage="Nenhum saldo inicial cadastrado para este filtro."
          />
        </CardContent>
      </Card>

      <SaldoFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o) setEditing(null)
        }}
        initial={editing}
        contas={contas}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o)
          if (!o) setDeleting(null)
        }}
        title="Excluir saldo inicial"
        description={
          deleting ? (
            <span>
              O saldo de <strong>{deleting.conta?.apelido ?? 'conta'}</strong>{' '}
              referente a <strong>{formatPeriodo(deleting.periodo)}</strong>{' '}
              será removido permanentemente.
            </span>
          ) : null
        }
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </div>
  )
}

export default AdminSaldosIniciaisPage

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  return null
}
