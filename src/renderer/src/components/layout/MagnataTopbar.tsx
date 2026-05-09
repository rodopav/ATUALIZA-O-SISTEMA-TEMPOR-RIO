import * as React from 'react'
import { LogOut, Menu, ChevronDown, UserCircle2, Crown } from 'lucide-react'
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

interface MagnataTopbarProps {
  profile: Profile | null
  loading: boolean
  onLogout: () => void
  onOpenMobileMenu: () => void
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'M'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return 'M'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase() || 'M'
}

export function MagnataTopbar({
  profile,
  loading,
  onLogout,
  onOpenMobileMenu,
}: MagnataTopbarProps): React.ReactElement {
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

      <div className="hidden md:block">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amb-400 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-asf-950 shadow-sm">
          <Crown className="h-3 w-3" />
          Magnata
        </span>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex items-center gap-2.5 rounded-md border border-transparent p-1.5 pr-2 text-left transition-colors',
                'hover:border-border hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
            >
              <Avatar initials={initials} />
              <div className="hidden min-w-0 leading-tight md:block">
                <p className="truncate text-sm font-medium text-foreground">
                  {profile?.nome_completo ?? 'Usuário'}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  Magnata
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
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amb-300 to-amb-500 text-[11px] font-semibold text-asf-950 ring-2 ring-background">
      {initials}
    </div>
  )
}
