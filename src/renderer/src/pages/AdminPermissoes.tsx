import * as React from 'react'
import { ShieldCheck, Users } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Card, CardContent } from '../components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Combobox, type ComboboxOption } from '../components/ui/combobox'
import { Label } from '../components/ui/label'
import { EmptyState } from '../components/ui/empty-state'
import { PermissoesMatrix } from '../components/admin/permissoes/PermissoesMatrix'
import { PermissoesToolbar } from '../components/admin/permissoes/PermissoesToolbar'
import { ReplicarPermissoesDialog } from '../components/admin/permissoes/ReplicarPermissoesDialog'
import { usePermissoesState } from '../components/admin/permissoes/use-permissoes-state'
import type { Profile } from '../lib/admin-queries'

function buildOptionsFor(profiles: Profile[]): ComboboxOption[] {
  return profiles
    .filter((p) => p.ativo && p.role === 'usuario_financeiro')
    .map((p) => ({
      value: p.id,
      label: p.nome_completo,
      hint: p.email,
    }))
}

function buildReplicarCandidates(
  profiles: Profile[],
  excludeUserId: string | null,
): ComboboxOption[] {
  return profiles
    .filter(
      (p) =>
        p.ativo &&
        p.role === 'usuario_financeiro' &&
        p.id !== excludeUserId,
    )
    .map((p) => ({ value: p.id, label: p.nome_completo, hint: p.email }))
}

export function AdminPermissoesPage(): React.ReactElement {
  const [userId, setUserId] = React.useState<string | null>(null)
  const [replicarOpen, setReplicarOpen] = React.useState(false)

  const state = usePermissoesState(userId)
  const userOptions = React.useMemo(
    () => buildOptionsFor(state.profiles),
    [state.profiles],
  )
  const selectedUser = React.useMemo<Profile | null>(() => {
    if (!userId) return null
    return state.profiles.find((p) => p.id === userId) ?? null
  }, [state.profiles, userId])

  const replicarCandidates = React.useMemo(
    () => buildReplicarCandidates(state.profiles, userId),
    [state.profiles, userId],
  )

  const handleMarcarTodasVer = React.useCallback((): void => {
    if (!userId) return
    state.bulkApply(state.contasAtivas.map((c) => c.id), true, false)
  }, [state, userId])

  const handleLimparTodas = React.useCallback((): void => {
    if (!userId) return
    state.bulkApply(state.contasAtivas.map((c) => c.id), false, false)
  }, [state, userId])

  const isLoadingMatrix = state.contasLoading || state.permissoesLoading

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Permissões por conta"
        description="Defina quais bancos cada usuário pode visualizar e movimentar."
      />

      {state.errorMsg ? (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{state.errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="user-select" className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Usuário
            </Label>
            <Combobox
              id="user-select"
              value={userId}
              onChange={setUserId}
              options={userOptions}
              placeholder="Selecione o usuário..."
              searchPlaceholder="Buscar por nome ou e-mail..."
              emptyMessage={
                state.profilesLoading
                  ? 'Carregando usuários...'
                  : 'Nenhum usuário comum cadastrado.'
              }
            />
            <p className="text-xs text-muted-foreground">
              Apenas usuários comuns aparecem aqui — administradores enxergam
              todas as contas.
            </p>
          </div>

          {userId ? (
            <PermissoesToolbar
              disabled={state.bulkPending}
              hasReplicarCandidates={replicarCandidates.length > 0}
              onMarcarTodasVer={handleMarcarTodasVer}
              onLimparTodas={handleLimparTodas}
              onAbrirReplicar={() => setReplicarOpen(true)}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {!userId ? (
            <EmptyState
              icon={<ShieldCheck />}
              title="Selecione um usuário"
              description="Escolha um usuário acima para gerenciar as permissões dele."
            />
          ) : (
            <PermissoesMatrix
              contas={state.contasAtivas}
              permissoes={state.permissoesMap}
              pending={state.pending}
              loading={isLoadingMatrix}
              onChange={state.upsert}
            />
          )}
        </CardContent>
      </Card>

      {userId && selectedUser ? (
        <ReplicarPermissoesDialog
          open={replicarOpen}
          onOpenChange={setReplicarOpen}
          targetUserId={userId}
          targetUserName={selectedUser.nome_completo}
          candidates={replicarCandidates}
          onSuccess={state.invalidate}
        />
      ) : null}
    </div>
  )
}

export default AdminPermissoesPage
