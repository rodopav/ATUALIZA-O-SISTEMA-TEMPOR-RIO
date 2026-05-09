import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Inbox, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Card, CardContent } from '../components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { DataTable } from '../components/ui/data-table'
import { StatCard } from '../components/dashboards/StatCard'
import { StatusFilter } from '../components/solicitacoes/StatusFilter'
import { buildAdminColumns } from '../components/solicitacoes/admin-columns'
import { AprovarSolicitacaoDialog } from '../components/solicitacoes/AprovarSolicitacaoDialog'
import { RejeitarSolicitacaoDialog } from '../components/solicitacoes/RejeitarSolicitacaoDialog'
import {
  adminKpisQuery,
  adminSolicitacoesQuery,
  type AdminSolicitacaoSaldoRow,
  type SolicitacaoStatus,
} from '../lib/solicitacoes-queries'
import { mapError } from '../lib/error-mapper'

export function AdminSolicitacoesPage(): React.ReactElement {
  const [statusFilter, setStatusFilter] =
    React.useState<SolicitacaoStatus | null>('PENDENTE')
  const [aprovarTarget, setAprovarTarget] =
    React.useState<AdminSolicitacaoSaldoRow | null>(null)
  const [aprovarOpen, setAprovarOpen] = React.useState(false)
  const [rejeitarTarget, setRejeitarTarget] =
    React.useState<AdminSolicitacaoSaldoRow | null>(null)
  const [rejeitarOpen, setRejeitarOpen] = React.useState(false)

  const listQ = useQuery(adminSolicitacoesQuery(statusFilter))
  const kpisQ = useQuery(adminKpisQuery)

  const handleAprovar = React.useCallback(
    (row: AdminSolicitacaoSaldoRow): void => {
      setAprovarTarget(row)
      setAprovarOpen(true)
    },
    [],
  )
  const handleRejeitar = React.useCallback(
    (row: AdminSolicitacaoSaldoRow): void => {
      setRejeitarTarget(row)
      setRejeitarOpen(true)
    },
    [],
  )

  const columns = React.useMemo(
    () =>
      buildAdminColumns({
        onAprovar: handleAprovar,
        onRejeitar: handleRejeitar,
      }),
    [handleAprovar, handleRejeitar],
  )

  const data = listQ.data ?? []
  const kpis = kpisQ.data
  const errorMsg = listQ.error
    ? mapError(listQ.error).description
    : kpisQ.error
      ? mapError(kpisQ.error).description
      : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Solicitações pendentes"
        description="Aprovar ou rejeitar pedidos de transferência de saldo."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pendentes"
          value={String(kpis?.pendentes ?? 0).padStart(2, '0')}
          icon={<Clock className="h-5 w-5" />}
          accent="destructive"
          loading={kpisQ.isLoading}
          description="Aguardando aprovação."
        />
        <StatCard
          label="Aprovadas no mês"
          value={String(kpis?.aprovadasNoMes ?? 0).padStart(2, '0')}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="success"
          loading={kpisQ.isLoading}
          description="Liberadas neste mês."
        />
        <StatCard
          label="Rejeitadas no mês"
          value={String(kpis?.rejeitadasNoMes ?? 0).padStart(2, '0')}
          icon={<XCircle className="h-5 w-5" />}
          accent="default"
          loading={kpisQ.isLoading}
          description="Negadas neste mês."
        />
      </div>

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
          <DataTable<AdminSolicitacaoSaldoRow>
            columns={columns}
            data={data}
            isLoading={listQ.isLoading}
            emptyIcon={<Inbox />}
            emptyTitle={
              statusFilter === 'PENDENTE'
                ? 'Nenhuma solicitação pendente'
                : 'Nenhuma solicitação encontrada'
            }
            emptyMessage={
              statusFilter === 'PENDENTE'
                ? 'Tudo em dia. Quando um usuário solicitar saldo, o pedido aparece aqui.'
                : 'Ajuste o filtro para ver outros status.'
            }
          />
        </CardContent>
      </Card>

      <AprovarSolicitacaoDialog
        open={aprovarOpen}
        onOpenChange={setAprovarOpen}
        solicitacao={aprovarTarget}
      />
      <RejeitarSolicitacaoDialog
        open={rejeitarOpen}
        onOpenChange={setRejeitarOpen}
        solicitacao={rejeitarTarget}
      />
    </div>
  )
}

export default AdminSolicitacoesPage
