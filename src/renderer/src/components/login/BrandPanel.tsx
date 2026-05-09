import * as React from 'react'
import { Landmark, TrendingUp, ShieldCheck, Wallet } from 'lucide-react'

interface BrandPanelProps {
  title: string
}

export function BrandPanel({ title }: BrandPanelProps): React.ReactElement {
  return (
    <div className="relative hidden flex-1 overflow-hidden bg-sidebar text-sidebar-foreground md:flex md:flex-col md:justify-between md:p-12">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--sidebar-accent))_0%,transparent_55%),radial-gradient(circle_at_bottom_left,hsl(var(--primary))_0%,transparent_45%)] opacity-60"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,hsl(var(--sidebar))_85%)]"
      />

      <div className="relative z-10 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar-accent ring-1 ring-sidebar-border">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-semibold">Rodopav Central</p>
          <p className="text-xs text-sidebar-foreground/60">
            Sistema Financeiro
          </p>
        </div>
      </div>

      <div className="relative z-10 max-w-md space-y-8">
        <div className="space-y-3">
          <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight">
            {title}
          </h2>
          <p className="text-base text-sidebar-foreground/70">
            Centralize a tesouraria de todas as empresas do grupo, com
            conferência diária e auditoria de cada lançamento.
          </p>
        </div>

        <div className="grid gap-3">
          <FeatureItem
            icon={<Landmark className="h-4 w-4" />}
            title="Saldo geral consolidado"
            description="28 contas e 8 empresas em uma única visão."
          />
          <FeatureItem
            icon={<TrendingUp className="h-4 w-4" />}
            title="Conferência em tempo real"
            description="Status OK ou Divergente por conta."
          />
          <FeatureItem
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Auditoria completa"
            description="Histórico imutável de toda movimentação."
          />
        </div>
      </div>

      <p className="relative z-10 text-xs text-sidebar-foreground/50">
        © {new Date().getFullYear()} Rodopav Central · Sistema Financeiro v0.2.0
      </p>
    </div>
  )
}

interface FeatureItemProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureItem({
  icon,
  title,
  description,
}: FeatureItemProps): React.ReactElement {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-sidebar-border/40 bg-sidebar-accent/30 p-3 backdrop-blur-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
        {icon}
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-sidebar-foreground">{title}</p>
        <p className="text-xs text-sidebar-foreground/60">{description}</p>
      </div>
    </div>
  )
}
