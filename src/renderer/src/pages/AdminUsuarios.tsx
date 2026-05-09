import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  UserPlus,
  RotateCw,
  ShieldAlert,
  Users,
  UserCheck,
  Activity,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { DataTable } from '../components/ui/data-table'
import { useToast } from '../components/ui/use-toast'
import { UserCreateDialog } from '../components/admin/usuarios/UserCreateDialog'
import { UserEditDialog } from '../components/admin/usuarios/UserEditDialog'
import { UserDeleteDialog } from '../components/admin/usuarios/UserDeleteDialog'
import { buildUsuariosColumns } from '../components/admin/usuarios/usuarios-columns'
import { KpiCard } from '../components/dashboards/KpiCard'
import { useAuthStore } from '../lib/auth-store'
import {
  adminUsersApi,
  adminUsersKeys,
  type IamUser,
} from '../lib/admin-users-api'

function isLoggedInLast7Days(s: string | null): boolean {
  if (!s) return false
  const last = new Date(s).getTime()
  if (!Number.isFinite(last)) return false
  return Date.now() - last < 7 * 24 * 60 * 60 * 1000
}

export function AdminUsuariosPage(): React.ReactElement {
  const qc = useQueryClient()
  const { toast } = useToast()
  const profile = useAuthStore((s) => s.profile)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<IamUser | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<IamUser | null>(null)

  const query = useQuery({
    queryKey: adminUsersKeys.all,
    queryFn: () => adminUsersApi.list(),
    staleTime: 30_000,
  })

  const resetMut = useMutation({
    mutationFn: (email: string) => adminUsersApi.resetPassword(email),
    onSuccess: () => {
      toast({
        title: 'E-mail enviado',
        description: 'O usuário receberá um link para redefinir a senha.',
        variant: 'success',
      })
    },
    onError: (err: Error) => {
      toast({
        title: 'Falhou ao enviar redefinição',
        description: err.message,
        variant: 'destructive',
      })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminUsersApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminUsersKeys.all })
      toast({ title: 'Usuário excluído', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (err: Error) => {
      toast({
        title: 'Falhou ao excluir',
        description: err.message,
        variant: 'destructive',
      })
    },
  })

  const stats = React.useMemo(() => {
    const list = query.data ?? []
    const total = list.length
    const ativos = list.filter(
      (u) => u.profile?.ativo && u.email_confirmed_at,
    ).length
    const recentes = list.filter((u) => isLoggedInLast7Days(u.last_sign_in_at))
      .length
    return { total, ativos, recentes }
  }, [query.data])

  const columns = React.useMemo(
    () =>
      buildUsuariosColumns({
        selfId: profile?.id,
        onEdit: setEditTarget,
        onResetPassword: (u) => {
          if (u.email) resetMut.mutate(u.email)
        },
        onDelete: setDeleteTarget,
      }),
    [profile?.id, resetMut],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Usuários"
        description="Gerencie usuários, perfis de acesso e o IAM do sistema."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RotateCw
                className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`}
              />
              Atualizar
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Novo usuário
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total de usuários"
          icon={<Users />}
          loading={query.isLoading}
          value={String(stats.total).padStart(2, '0')}
        />
        <KpiCard
          label="Usuários ativos"
          icon={<UserCheck />}
          tone="success"
          loading={query.isLoading}
          value={String(stats.ativos).padStart(2, '0')}
          hint={`${stats.ativos} de ${stats.total} contas ativas.`}
        />
        <KpiCard
          label="Acesso nos últimos 7 dias"
          icon={<Activity />}
          loading={query.isLoading}
          value={String(stats.recentes).padStart(2, '0')}
          hint="Engajamento recente."
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable<IamUser>
            columns={columns}
            data={query.data ?? []}
            isLoading={query.isLoading}
            emptyIcon={<UserPlus />}
            emptyTitle="Nenhum usuário ainda"
            emptyMessage="Convide o primeiro usuário para acessar o sistema."
            emptyAction={
              <Button onClick={() => setCreateOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Novo usuário
              </Button>
            }
          />
        </CardContent>
      </Card>

      <UserCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UserEditDialog
        open={!!editTarget}
        user={editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
      />
      <UserDeleteDialog
        user={deleteTarget}
        isPending={deleteMut.isPending}
        onConfirm={() =>
          deleteTarget && deleteMut.mutate(deleteTarget.id)
        }
        onClose={() => setDeleteTarget(null)}
      />

      {query.error ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4" />
            {(query.error as Error).message}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export default AdminUsuariosPage
