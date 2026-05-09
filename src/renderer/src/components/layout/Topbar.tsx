import * as React from 'react'
import { LogOut, Menu, Bell, ChevronDown, UserCircle2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { cn } from '../../lib/cn'
import type { Profile } from '../../types/profile'

interface TopbarProps {
  profile: Profile | null
  roleLabel: string
  loading: boolean
  onLogout: () => void
  onOpenMobileMenu: () => void
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return 'U'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase() || 'U'
}

export function Topbar({
  profile,
  roleLabel,
  loading,
  onLogout,
  onOpenMobileMenu,
}: TopbarProps): React.ReactElement {
  const initials = getInitials(profile?.nome_completo)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Abrir menu"
        onClick={onOpenMobileMenu}
      >
        <Menu className="h-4 w-4" />
      </Button>

      <div className="flex flex-1 items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notificações"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex items-center gap-2.5 rounded-md border border-transparent p-1.5 pr-2 text-left transition-colors',
                'hover:border-border hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <Avatar initials={initials} />
              <div className="hidden min-w-0 leading-tight md:block">
                <p className="truncate text-sm font-medium text-foreground">
                  {profile?.nome_completo ?? 'Usuário'}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {roleLabel}
                </p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="normal-case">
              <div className="flex items-center gap-3">
                <Avatar initials={initials} />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-medium text-foreground">
                    {profile?.nome_completo ?? 'Usuário'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {profile?.email ?? ''}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserCircle2 className="mr-2 h-4 w-4" />
              Meu perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onLogout()}
              destructive
              disabled={loading}
            >
              {loading ? (
                <Spinner className="mr-2" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

function Avatar({ initials }: { initials: string }): React.ReactElement {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground ring-2 ring-background">
      {initials}
    </div>
  )
}
