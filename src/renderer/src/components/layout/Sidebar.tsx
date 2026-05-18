import * as React from 'react'
import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
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
  const subtitle = appMode === 'admin' ? 'IAM' : 'Tesouraria'

  return (
    <div className="flex h-full flex-col">
      {/* Brand block — assinatura RODOPAV: ROD●PAV com bolinha amber glow */}
      <div className="relative flex h-[68px] shrink-0 items-center justify-between border-b border-sidebar-border/60 px-4">
        <div className="flex flex-col gap-0.5 leading-tight">
          <span className="flex items-center font-mono text-[15px] font-extrabold tracking-[1px] text-sidebar-foreground">
            ROD
            <span
              aria-hidden
              className="mx-[1px] inline-flex h-2 w-2 rounded-full bg-amb-400 align-middle shadow-[0_0_8px_rgba(245,158,11,0.7)]"
            />
            PAV
          </span>
          <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[2px] text-sidebar-foreground/40">
            <span aria-hidden className="h-px w-5 bg-amb-400" />
            {subtitle}
          </span>
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

      {/* Tarja diagonal — assinatura visual RODOPAV */}
      <div aria-hidden className="tarja-rodopav h-1 shrink-0" />

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <SidebarSection
            key={section.label}
            label={section.label}
            items={section.items}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Tarja diagonal antes do footer */}
      <div aria-hidden className="tarja-rodopav h-1 shrink-0" />

      <div className="shrink-0 border-t border-sidebar-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
          />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            {appTitle} · v{version || '0.2.0'}
          </p>
        </div>
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
      {/* Cabeçalho de grupo: tracinho amarelo + caption uppercase */}
      <div className="mb-1.5 flex items-center gap-2 px-3">
        <span aria-hidden className="h-px w-3 bg-amb-400" />
        <span className="text-[9px] font-bold uppercase tracking-[2.5px] text-sidebar-foreground/40">
          {label}
        </span>
      </div>
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
      // Active state RODOPAV: barra amarela 3px à esquerda + glow vazando.
      // Lembra sinalização contínua de pista (linha amarela na rodovia).
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-all duration-150',
          isActive
            ? 'bg-sidebar-accent/15 text-sidebar-foreground shadow-[inset_3px_0_0_0_hsl(var(--amb-400)),inset_10px_0_18px_-10px_rgba(245,158,11,0.55)]'
            : 'text-sidebar-foreground/60 hover:pl-4 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'h-[18px] w-[18px] shrink-0 transition-colors',
              isActive
                ? 'text-amb-400'
                : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground',
            )}
          />
          <span className="flex-1 truncate">{item.label}</span>
          {showBadge ? (
            <span
              aria-label={`${item.badgeCount} pendentes`}
              className={cn(
                'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 font-mono text-[10px] font-semibold tabular-nums',
                'bg-amb-400/20 text-amb-400 ring-1 ring-amb-400/30',
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
