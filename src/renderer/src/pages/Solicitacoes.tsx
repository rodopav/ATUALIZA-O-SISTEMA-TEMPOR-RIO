import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Send, AlertTriangle } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { DataTable } from '../components/ui/data-table'
import { toast } from '../components/ui/use-toast'
import { NovaSolicitacaoDialog } from '../components/solicitacoes/NovaSolicitacaoDialog'
import { EditarSolicitacaoDialog } from '../components/solicitacoes/EditarSolicitacaoDialog'
import { StatusFilter } from '../components/solicitacoes/StatusFilter'
import { buildMinhasColumns } from '../components/solicitacoes/minhas-columns'
import {
  cancelarSolicitacao,
  minhasSolicitacoesQuery,
  solicitacoesKeys,
  type SolicitacaoSaldoRow,
  type SolicitacaoStatus,
} from '../lib/solicitacoes-queries'
import { mapError } from '../lib/error-mapper'
import { useAuthStore } from '../lib/auth-store'

export function SolicitacoesPage(): React.ReactElement {
  const qc = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editarTarget, setEditarTarget] =
    React.useState<SolicitacaoSaldoRow | null>(null)
  const [editarOpen, setEditarOpen] = React.useState(false)
  const [statusFilter, setStatusFilter] =
    React.useState<SolicitacaoStatus | null>(null)

  const minhasQ = useQuery(
    minhasSolicitacoesQuery(profile?.id ?? null, statusFilter),
  )

  const cancelarMut = useMutation({
    mutationFn: (id: string) => cancelarSolicitacao(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: solicitacoesKeys.all })
      toast({
        title: 'Solicitação cancelada',
        description: 'O pedido foi marcado como cancelado.',
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Não foi possível cancelar',
        description: mapError(err).description,
        variant: 'destructive',
      })
    },
  })

  const handleCancelar = React.useCallback(
    (row: SolicitacaoSaldoRow): void => {
      cancelarMut.mutate(row.id)
    },
    [cancelarMut],
  )

  const handleEditar = React.useCallback(
    (row: SolicitacaoSaldoRow): void => {
      setEditarTarget(row)
      setEditarOpen(true)
    },
    [],
  )

  const columns = React.useMemo(
    () =>
      buildMinhasColumns({
        onCancelar: handleCancelar,
        onEditar: handleEditar,
        cancelandoId: cancelarMut.isPending ? cancelarMut.variables ?? null : null,
      }),
    [handleCancelar, handleEditar, cancelarMut.isPending, cancelarMut.variables],
  )

  const data = minhasQ.data ?? []
  const errorMsg = minhasQ.error ? mapError(minhasQ.error).description : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação"
        title="Solicitações de saldo"
        description="Solicite saldo a um administrador para movimentar uma conta."
        actions={
          <Button type="button" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova solicitação
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-3">
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </CardContent>
      </Card>

      {errorMsg ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar solicitações</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <DataTable<SolicitacaoSaldoRow>
            columns={columns}
            data={data}
            isLoading={minhasQ.isLoading}
            emptyIcon={<Send />}
            emptyTitle="Nenhuma solicitação ainda"
            emptyMessage="Clique em 'Nova solicitação' para criar a primeira."
            emptyAction={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Nova solicitação
              </Button>
            }
          />
        </CardContent>
      </Card>

      <NovaSolicitacaoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <EditarSolicitacaoDialog
        open={editarOpen}
        onOpenChange={setEditarOpen}
        solicitacao={editarTarget}
      />
    </div>
  )
}

export default SolicitacoesPage
