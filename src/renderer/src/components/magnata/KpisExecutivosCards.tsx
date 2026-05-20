import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingDown,
  TrendingUp,
  CreditCard,
  Receipt,
  AlertTriangle,
  Wallet,
  Clock,
  ShieldAlert,
  HelpCircle,
  ArrowDown,
} from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@radix-ui/react-tooltip'
import { kpisExecutivosQuery } from '../../lib/magnata-queries'
import { formatBRL } from '../../lib/format'
import { cn } from '../../lib/cn'

type Tom = 'default' | 'success' | 'warning' | 'destructive'

interface KpiHumanoProps {
  label: string
  /** Microcopy explicando o termo. Mostra em hover do ?. */
  explica?: string
  valor: React.ReactNode
  icone: React.ReactNode
  hint?: React.ReactNode
  tom?: Tom
  loading?: boolean
}

const STRIP: Record<Tom, string> = {
  default: 'bg-zinc-400 dark:bg-zinc-500',
  success: 'bg-emerald-500',
  destructive: 'bg-red-500',
  warning: 'bg-amb-400',
}

const TINTA: Record<Tom, string> = {
  default: 'bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400',
  success:
    'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  destructive: 'bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  warning: 'bg-amb-400/15 text-amb-600 dark:bg-amb-400/15 dark:text-amb-400',
}

/**
 * KPI card com label humano + tooltip explicativo (icone ?). Estende
 * o padrão do design system RODOPAV (strip + tinta + mono extrabold).
 */
function KpiHumano({
  label,
  explica,
  valor,
  icone,
  hint,
  tom = 'default',
  loading,
}: KpiHumanoProps): React.ReactElement {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-amb-400/40',
        'hover:shadow-[0_8px_24px_-12px_rgba(245,158,11,0.25)]',
      )}
    >
      <div aria-hidden className={cn('absolute inset-x-0 top-0 h-[3px]', STRIP[tom])} />
      <CardContent className="p-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
              {label}
            </p>
            {explica ? (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground/60 transition-colors hover:text-foreground"
                      aria-label={`Sobre: ${label}`}
                    >
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={4}
                    className="z-50 max-w-xs rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
                  >
                    {explica}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4',
              TINTA[tom],
            )}
          >
            {icone}
          </div>
        </div>
        <div className="mt-2 min-h-[36px]">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <p className="font-mono text-[26px] font-extrabold leading-none tabular-nums tracking-tight text-foreground">
              {valor}
            </p>
          )}
        </div>
        {hint ? (
          <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

/**
 * Dashboard executivo enxuto — só os 6 KPIs que importam pra decisão
 * rápida do CFO. Antes eram 9 + 6 legacy = 15. Cortei pela metade.
 */
export function KpisExecutivosCards(): React.ReactElement {
  const q = useQuery(kpisExecutivosQuery)
  const k = q.data
  const loading = q.isLoading
  const variacao = k?.saldo_variacao_pct ?? 0

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {/* PULSO DO MÊS */}
      <KpiHumano
        label="Cresceu/Caiu no mês"
        explica="Variação % do saldo geral em relação ao início do mês corrente."
        loading={loading}
        icone={variacao >= 0 ? <TrendingUp /> : <TrendingDown />}
        tom={variacao >= 0 ? 'success' : 'destructive'}
        valor={
          <span className="inline-flex items-center gap-1">
            {variacao >= 0 ? '+' : ''}
            {variacao.toFixed(1)}%
            {variacao < 0 ? <ArrowDown className="h-5 w-5 text-destructive" /> : null}
          </span>
        }
        hint={variacao >= 0 ? 'Caixa subiu no mês' : 'Caixa caiu no mês'}
      />

      <KpiHumano
        label="Fôlego do caixa"
        explica="Quantos meses o caixa atual aguenta no ritmo atual de gastos (saldo geral ÷ média de saídas dos últimos 3 meses)."
        loading={loading}
        icone={<Clock />}
        tom={
          k?.runway_meses == null
            ? 'default'
            : k.runway_meses < 3
              ? 'destructive'
              : k.runway_meses < 6
                ? 'warning'
                : 'success'
        }
        valor={
          k?.runway_meses != null ? `${k.runway_meses.toFixed(1)} m` : '∞'
        }
        hint="Meses no ritmo atual"
      />

      <KpiHumano
        label="Custo bancário do mês"
        explica="Soma de todos os lançamentos marcados como TARIFA neste mês. Inclui taxas, IOF, juros bancários."
        loading={loading}
        icone={<Receipt />}
        tom={(k?.tarifas_mes_count ?? 0) > 0 ? 'warning' : 'default'}
        valor={formatBRL(k?.tarifas_mes_valor ?? 0)}
        hint={`${k?.tarifas_mes_count ?? 0} tarifa(s) registrada(s)`}
      />

      {/* RISCO / EXPOSIÇÃO */}
      <KpiHumano
        label="Limite em uso"
        explica="Quanto do cheque especial total do grupo já foi consumido. Acima de 80% é sinal amarelo de risco de tesouraria."
        loading={loading}
        icone={<CreditCard />}
        tom={
          (k?.pct_limite_consumido ?? 0) > 80
            ? 'destructive'
            : (k?.pct_limite_consumido ?? 0) > 50
              ? 'warning'
              : 'default'
        }
        valor={`${(k?.pct_limite_consumido ?? 0).toFixed(1)}%`}
        hint={`${formatBRL(k?.limite_consumido ?? 0)} de ${formatBRL(k?.limite_total_configurado ?? 0)}`}
      />

      <KpiHumano
        label="Contas no vermelho"
        explica="Quantidade de contas bancárias do grupo com saldo atual negativo (usando cheque especial)."
        loading={loading}
        icone={<TrendingDown />}
        tom={(k?.contas_negativas_count ?? 0) > 0 ? 'destructive' : 'success'}
        valor={String(k?.contas_negativas_count ?? 0)}
        hint={
          (k?.contas_negativas_count ?? 0) > 0
            ? 'Veja "Contas com cheque especial" abaixo'
            : 'Todas no positivo'
        }
      />

      {/* ATENÇÃO NECESSÁRIA */}
      <KpiHumano
        label="Aprovadas sem você"
        explica="Solicitações que usuários liberaram em sua ausência. Esperam você confirmar ou reprovar — reprovar apaga o lançamento."
        loading={loading}
        icone={<ShieldAlert />}
        tom={
          (k?.solicitacoes_ausencia_pendentes_count ?? 0) > 0
            ? 'destructive'
            : 'default'
        }
        valor={String(k?.solicitacoes_ausencia_pendentes_count ?? 0)}
        hint={
          (k?.solicitacoes_ausencia_pendentes_count ?? 0) > 0
            ? 'Aguardam revisão urgente'
            : 'Nada pendente'
        }
      />
    </div>
  )
}

// Mantém export pra outros lugares que talvez usem (sinaliza visualmente
// que esse componente continua existindo se alguém importar)
export { AlertTriangle, Wallet }
