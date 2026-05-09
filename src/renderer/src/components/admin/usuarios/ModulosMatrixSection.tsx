import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckSquare,
  Info,
  Loader2,
  Square,
  Save,
  ListChecks,
} from 'lucide-react'
import { Button } from '../../ui/button'
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert'
import { Label } from '../../ui/label'
import { useToast } from '../../ui/use-toast'
import { cn } from '../../../lib/cn'
import {
  adminUsersApi,
  adminUsersKeys,
  type IamUser,
} from '../../../lib/admin-users-api'

const MODULO_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  saldo_geral: 'Saldo Geral',
  centros_de_custo: 'Centros de Custo',
  conferencia: 'Conferência',
  conciliacao: 'Conciliação',
  lancamentos: 'Lançamentos',
  fornecedores: 'Fornecedores',
  solicitacoes: 'Solicitações de Saldo',
  solicitacoes_aprovar: 'Aprovar Solicitações',
  auditoria: 'Auditoria',
  periodos: 'Períodos',
  saldos_iniciais: 'Saldos Iniciais',
  permissoes: 'Permissões por Conta',
  empresas: 'Empresas',
  contas: 'Contas Bancárias',
  centros_admin: 'Centros (admin)',
  tipos_operacao: 'Tipos de Operação',
}

const MODULOS = Object.keys(MODULO_LABELS)

interface ModulosMatrixSectionProps {
  user: IamUser
}

/**
 * Matriz de módulos por usuário. Indisponível para `admin_financeiro` —
 * admins têm acesso automático a todos os módulos. Para `usuario_financeiro`,
 * permite marcar/desmarcar individualmente quais módulos o usuário enxerga
 * na sidebar e nas rotas.
 */
export function ModulosMatrixSection({
  user,
}: ModulosMatrixSectionProps): React.ReactElement {
  const qc = useQueryClient()
  const { toast } = useToast()
  const isAdmin = user.profile?.role === 'admin_financeiro'

  const modulosQ = useQuery({
    queryKey: adminUsersKeys.modules(user.id),
    queryFn: () => adminUsersApi.getModules(user.id),
    staleTime: 30_000,
    enabled: !isAdmin,
  })

  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [dirty, setDirty] = React.useState(false)

  // Sincroniza `selected` quando a query carrega (apenas se ainda não houver
  // edição local — não derrubamos input do admin).
  React.useEffect(() => {
    if (!modulosQ.data || dirty) return
    setSelected(new Set(modulosQ.data))
  }, [modulosQ.data, dirty])

  const toggle = (modulo: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(modulo)) next.delete(modulo)
      else next.add(modulo)
      return next
    })
    setDirty(true)
  }

  const markAll = (): void => {
    setSelected(new Set(MODULOS))
    setDirty(true)
  }

  const clearAll = (): void => {
    setSelected(new Set())
    setDirty(true)
  }

  const mutation = useMutation({
    mutationFn: () =>
      adminUsersApi.setModules({
        id: user.id,
        modules: Array.from(selected),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: adminUsersKeys.modules(user.id),
      })
      void qc.invalidateQueries({ queryKey: ['modulos', 'meus'] })
      setDirty(false)
      toast({
        title: 'Módulos atualizados',
        description: `Definidos ${selected.size} módulo(s) para ${user.profile?.nome_completo ?? user.email}.`,
        variant: 'success',
      })
    },
    onError: (err: Error) => {
      toast({
        title: 'Falha ao salvar módulos',
        description: err.message,
        variant: 'destructive',
      })
    },
  })

  if (isAdmin) {
    return (
      <Alert variant="info">
        <Info className="h-4 w-4" />
        <AlertTitle>Admin Financeiro tem acesso total</AlertTitle>
        <AlertDescription>
          Usuários com perfil <strong>Admin Financeiro</strong> recebem acesso
          automático a todos os módulos do sistema. A matriz de módulos só
          se aplica a usuários comuns.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <Label className="font-semibold">Módulos visíveis</Label>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
            {selected.size}/{MODULOS.length}
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={markAll}
            disabled={mutation.isPending}
          >
            Marcar todos
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={mutation.isPending}
          >
            Desmarcar todos
          </Button>
        </div>
      </div>

      {modulosQ.isLoading ? (
        <div className="flex items-center justify-center rounded-md border bg-muted/40 p-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando módulos...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5 rounded-md border bg-card p-3 sm:grid-cols-2">
          {MODULOS.map((modulo) => {
            const checked = selected.has(modulo)
            return (
              <button
                key={modulo}
                type="button"
                onClick={() => toggle(modulo)}
                disabled={mutation.isPending}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors',
                  'hover:bg-accent disabled:opacity-50',
                  checked
                    ? 'border-primary/40 bg-primary/5 text-foreground'
                    : 'border-transparent text-muted-foreground',
                )}
              >
                {checked ? (
                  <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Square className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{MODULO_LABELS[modulo]}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Salvar substitui todos os módulos do usuário pela seleção atual.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !dirty}
        >
          {mutation.isPending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1 h-4 w-4" />
          )}
          Salvar módulos
        </Button>
      </div>
    </div>
  )
}
