import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  kpisExecutivosQuery,
  type MagnataKpisExecutivos,
} from '../../lib/magnata-queries'
import { formatBRL } from '../../lib/format'
import { cn } from '../../lib/cn'

type Tom = 'success' | 'warning' | 'danger' | 'loading'

interface Diagnostico {
  tom: Tom
  frase: string
}

/**
 * Decide o tom + frase do hero baseado nos KPIs executivos.
 * Ordem de severidade: vermelho ganha sempre, depois âmbar, depois verde.
 *
 * O CFO lê isso em 2 segundos: bolinha + frase + número grande.
 */
function diagnosticar(
  kpis: MagnataKpisExecutivos | undefined,
): Diagnostico {
  if (!kpis) return { tom: 'loading', frase: 'Calculando o pulso do grupo…' }

  const motivosVermelhos: string[] = []
  if (kpis.contas_negativas_count > 0) {
    motivosVermelhos.push(
      `${kpis.contas_negativas_count} conta(s) no vermelho`,
    )
  }
  if (kpis.solicitacoes_ausencia_pendentes_count > 0) {
    motivosVermelhos.push(
      `${kpis.solicitacoes_ausencia_pendentes_count} aprovação(ões) sem você esperando revisão`,
    )
  }

  if (motivosVermelhos.length > 0) {
    return {
      tom: 'danger',
      frase: `AÇÃO URGENTE — ${motivosVermelhos.join(' · ')}.`,
    }
  }

  const motivosAmbar: string[] = []
  if (kpis.pct_limite_consumido > 80) {
    motivosAmbar.push(
      `limite em ${kpis.pct_limite_consumido.toFixed(0)}% consumido`,
    )
  }
  if (kpis.saldo_variacao_pct < -10) {
    motivosAmbar.push(
      `caiu ${Math.abs(kpis.saldo_variacao_pct).toFixed(1)}% no mês`,
    )
  }
  if (kpis.runway_meses !== null && kpis.runway_meses < 6) {
    motivosAmbar.push(`fôlego de ${kpis.runway_meses.toFixed(1)} meses`)
  }
  if (kpis.solicitacoes_pendentes_count > 0) {
    motivosAmbar.push(
      `${kpis.solicitacoes_pendentes_count} solicitação(ões) esperando aprovação`,
    )
  }

  if (motivosAmbar.length > 0) {
    return {
      tom: 'warning',
      frase: `Atenção — ${motivosAmbar.slice(0, 2).join(' · ')}.`,
    }
  }

  // Verde
  const folego =
    kpis.runway_meses !== null
      ? `${kpis.runway_meses.toFixed(1)} meses de fôlego`
      : 'fôlego saudável'
  return {
    tom: 'success',
    frase: `Grupo saudável — ${folego}. Saldo crescendo ${kpis.saldo_variacao_pct >= 0 ? '+' : ''}${kpis.saldo_variacao_pct.toFixed(1)}% no mês.`,
  }
}

const TOM_STYLES: Record<Tom, { dot: string; ring: string; bg: string }> = {
  success: {
    dot: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]',
    ring: 'ring-emerald-500/30',
    bg: 'from-emerald-500/[0.04] to-transparent',
  },
  warning: {
    dot: 'bg-amb-400 shadow-[0_0_12px_rgba(245,158,11,0.7)]',
    ring: 'ring-amb-400/40',
    bg: 'from-amb-400/[0.06] to-transparent',
  },
  danger: {
    dot: 'bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.8)] animate-pulse',
    ring: 'ring-red-500/40',
    bg: 'from-red-500/[0.06] to-transparent',
  },
  loading: {
    dot: 'bg-zinc-400',
    ring: 'ring-zinc-400/30',
    bg: 'from-zinc-400/[0.04] to-transparent',
  },
}

export function HeroExecutivo(): React.ReactElement {
  const q = useQuery(kpisExecutivosQuery)
  const diag = diagnosticar(q.data)
  const style = TOM_STYLES[diag.tom]
  const hoje = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 ring-1 md:p-8',
        style.ring,
        style.bg,
      )}
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className={cn('mt-2 h-3 w-3 shrink-0 rounded-full', style.dot)}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">
            Como estamos hoje · {hoje}
          </p>
          <p className="text-lg font-medium leading-snug text-foreground md:text-xl">
            {diag.frase}
          </p>
          {q.data ? (
            <p className="pt-2 font-mono text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              {formatBRL(q.data.saldo_geral)}
            </p>
          ) : (
            <div className="h-10 w-48 animate-pulse rounded bg-muted" />
          )}
          {q.data ? (
            <p className="text-xs text-muted-foreground">
              Saldo geral do grupo · Dinheiro disponível agora:{' '}
              <span className="font-mono font-semibold text-foreground">
                {formatBRL(q.data.liquidez_imediata)}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
