import * as React from 'react'
import { NavLink } from 'react-router-dom'
import { Wallet, ShieldCheck, X } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/cn'

export interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
  /**
   * Quando informado e maior que zero, renderiza um Badge à direita do
   * label com a contagem (truncado a "99+").
   */
  badgeCount?: number
  /**
   * Identificador do módulo (`modulo_app`). Quando definido, o item só é
   * exibido se o usuário tiver acesso ao módulo correspondente.
   */
  modulo?: string
}

export interface NavSection {
  label: string
  items: NavItem[]
}

interface SidebarContentProps {
  appMode: 'user' | 'admin'
  appTitle: string
  sections: NavSection[]
  version: string
  onNavigate?: () => void
  onClose?: () => void
}

export function SidebarContent({
  appMode,
  appTitle,
  sections,
  version,
  onNavigate,
  onClose,
}: SidebarContentProps): React.ReactElement {
  const Crest = appMode === 'admin' ? ShieldCheck : Wallet
  const subtitle = appMode === 'admin' ? 'Admin · IAM' : 'Tesouraria'

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border">
            <Crest className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-sidebar-foreground">
              {appTitle}
            </p>
            <p className="text-[11px] text-sidebar-foreground/60">{subtitle}</p>
          </div>
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar menu"
            onClick={onClose}
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <SidebarSection
            key={section.label}
            label={section.label}
            items={section.items}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border px-5 py-4">
        <p className="text-[11px] text-sidebar-foreground/50">
          {appTitle} · v{version || '0.2.0'}
        </p>
      </div>
    </div>
  )
}

interface SidebarSectionProps {
  label: string
  items: NavItem[]
  onNavigate?: () => void
}

function SidebarSection({
  label,
  items,
  onNavigate,
}: SidebarSectionProps): React.ReactElement | null {
  if (items.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/40">
        {label}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <SidebarLink item={item} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </div>
  )
}

interface SidebarLinkProps {
  item: NavItem
  onNavigate?: () => void
}

function formatBadge(count: number): string {
  if (count > 99) return '99+'
  return String(count)
}

function SidebarLink({
  item,
  onNavigate,
}: SidebarLinkProps): React.ReactElement {
  const Icon = item.icon
  const showBadge =
    typeof item.badgeCount === 'number' && item.badgeCount > 0
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-primary-foreground"
            />
          ) : null}
          <Icon
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              isActive
                ? 'text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground',
            )}
          />
          <span className="flex-1 truncate">{item.label}</span>
          {showBadge ? (
            <span
              aria-label={`${item.badgeCount} pendentes`}
              className={cn(
                'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                'bg-warning/20 text-warning-foreground ring-1 ring-warning/30',
                'dark:bg-warning/30 dark:text-warning',
              )}
            >
              {formatBadge(item.badgeCount ?? 0)}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}
