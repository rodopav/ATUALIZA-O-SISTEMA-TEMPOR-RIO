import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  MoreHorizontal,
  Pencil,
  Key,
  KeyRound,
  Trash2,
  ShieldCheck,
  Crown,
} from 'lucide-react'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'
import { UserAvatar } from './UserAvatar'
import { formatRelative } from '../../../lib/format'
import type { IamUser } from '../../../lib/admin-users-api'

function roleLabel(r: 'admin_financeiro' | 'usuario_financeiro'): string {
  return r === 'admin_financeiro' ? 'Admin Financeiro' : 'Usuário Financeiro'
}

interface RowMenuProps {
  user: IamUser
  selfId: string | undefined
  onEdit: (u: IamUser) => void
  onResetPassword: (u: IamUser) => void
  onSetPassword: (u: IamUser) => void
  onDelete: (u: IamUser) => void
}

function RowMenu({
  user,
  selfId,
  onEdit,
  onResetPassword,
  onSetPassword,
  onDelete,
}: RowMenuProps): React.ReactElement {
  const isSelf = selfId === user.id
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Ações"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onEdit(user)}>
          <Pencil className="mr-2 h-4 w-4" /> Editar perfil
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSetPassword(user)}>
          <KeyRound className="mr-2 h-4 w-4" /> Definir nova senha
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => onResetPassword(user)}
          disabled={!user.email}
        >
          <Key className="mr-2 h-4 w-4" /> Enviar link de redefinição (email)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => onDelete(user)}
          disabled={isSelf}
          destructive
        >
          <Trash2 className="mr-2 h-4 w-4" /> Excluir usuário
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export interface UsuariosColumnHandlers {
  selfId: string | undefined
  onEdit: (u: IamUser) => void
  onResetPassword: (u: IamUser) => void
  onSetPassword: (u: IamUser) => void
  onDelete: (u: IamUser) => void
}

export function buildUsuariosColumns(
  handlers: UsuariosColumnHandlers,
): ColumnDef<IamUser, unknown>[] {
  return [
    {
      accessorKey: 'profile.nome_completo',
      header: 'Usuário',
      cell: (ctx) => {
        const u = ctx.row.original
        return (
          <div className="flex items-center gap-3">
            <UserAvatar name={u.profile?.nome_completo} />
            <div className="min-w-0 leading-tight">
              <p className="truncate font-medium text-foreground">
                {u.profile?.nome_completo ?? '—'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {u.email ?? 'sem e-mail'}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'role',
      header: 'Perfil',
      cell: (ctx) => {
        const p = ctx.row.original.profile
        if (!p) return <Badge variant="secondary">Sem perfil</Badge>
        return (
          <Badge variant={p.role === 'admin_financeiro' ? 'info' : 'secondary'}>
            {roleLabel(p.role)}
          </Badge>
        )
      },
      size: 170,
    },
    {
      id: 'roles_especiais',
      header: 'Acessos',
      cell: (ctx) => {
        const p = ctx.row.original.profile
        if (!p) return <span className="text-xs text-muted-foreground">—</span>
        const flags: React.ReactNode[] = []
        if (p.is_superadmin) {
          flags.push(
            <Badge key="su" variant="purple" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> Super
            </Badge>,
          )
        }
        if (p.is_magnata) {
          flags.push(
            <Badge key="mg" variant="warning" className="gap-1">
              <Crown className="h-3 w-3" /> Magnata
            </Badge>,
          )
        }
        if (flags.length === 0) {
          return <span className="text-xs text-muted-foreground">—</span>
        }
        return <div className="flex flex-wrap gap-1">{flags}</div>
      },
      size: 180,
    },
    {
      id: 'situacao',
      header: 'Situação',
      cell: (ctx) => {
        const u = ctx.row.original
        if (!u.profile) return <Badge variant="warning">Sem perfil</Badge>
        if (!u.email_confirmed_at)
          return <Badge variant="warning">Pendente</Badge>
        if (!u.profile.ativo)
          return <Badge variant="destructive">Inativo</Badge>
        return <Badge variant="success">Ativo</Badge>
      },
      size: 130,
    },
    {
      accessorKey: 'last_sign_in_at',
      header: 'Último acesso',
      cell: (ctx) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatRelative(ctx.row.original.last_sign_in_at)}
        </span>
      ),
      size: 170,
    },
    {
      id: 'acoes',
      header: () => <span className="sr-only">Ações</span>,
      cell: (ctx) => (
        <RowMenu
          user={ctx.row.original}
          selfId={handlers.selfId}
          onEdit={handlers.onEdit}
          onResetPassword={handlers.onResetPassword}
          onSetPassword={handlers.onSetPassword}
          onDelete={handlers.onDelete}
        />
      ),
      size: 60,
    },
  ]
}
