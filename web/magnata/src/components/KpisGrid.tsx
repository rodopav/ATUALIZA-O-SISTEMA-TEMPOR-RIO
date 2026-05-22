import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingDown,
  TrendingUp,
  CreditCard,
  Receipt,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import { kpisExecutivosQuery } from '../lib/queries'
import { formatBRL } from '../lib/format'
import { KpiCard } from './KpiCard'

/**
 * 6 KPIs estratégicos do CFO — mesma seleção do desktop, layout responsivo.
 * Mobile: 1 coluna. Tablet: 2 colunas. Desktop: 3 colunas.
 */
export function KpisGrid(): React.ReactElement {
  const q = useQuery(kpisExecutivosQuery)
  const k = q.data
  const loading = q.isLoading
  const variacao = k?.saldo_variacao_pct ?? 0

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        label="Cresceu/Caiu no mês"
        icone={variacao >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        tom={variacao >= 0 ? 'success' : 'destructive'}
        loading={loading}
        valor={`${variacao >= 0 ? '+' : ''}${variacao.toFixed(1)}%`}
        hint={variacao >= 0 ? 'Caixa subiu no mês' : 'Caixa caiu no mês'}
      />

      <KpiCard
        label="Fôlego do caixa"
        icone={<Clock className="h-4 w-4" />}
        tom={
          (k?.runway_dias_historico ?? 0) < 14
            ? 'default'
            : k?.runway_meses == null
              ? 'default'
              : k.runway_meses < 3
                ? 'destructive'
                : k.runway_meses < 6
                  ? 'warning'
                  : 'success'
        }
        loading={loading}
        valor={
          (k?.runway_dias_historico ?? 0) < 14
            ? '—'
            : k?.runway_meses != null
              ? `${k.runway_meses.toFixed(1)} m`
              : '∞'
        }
        hint={
          (k?.runway_dias_historico ?? 0) < 14
            ? `Só ${k?.runway_dias_historico ?? 0} dia(s) de histórico`
            : 'Meses no ritmo atual'
        }
      />

      <KpiCard
        label="Custo bancário do mês"
        icone={<Receipt className="h-4 w-4" />}
        tom={(k?.tarifas_mes_count ?? 0) > 0 ? 'warning' : 'default'}
        loading={loading}
        valor={formatBRL(k?.tarifas_mes_valor ?? 0)}
        hint={`${k?.tarifas_mes_count ?? 0} tarifa(s) registrada(s)`}
      />

      <KpiCard
        label="Limite em uso"
        icone={<CreditCard className="h-4 w-4" />}
        tom={
          (k?.pct_limite_consumido ?? 0) > 80
            ? 'destructive'
            : (k?.pct_limite_consumido ?? 0) > 50
              ? 'warning'
              : 'default'
        }
        loading={loading}
        valor={`${(k?.pct_limite_consumido ?? 0).toFixed(1)}%`}
        hint={`${formatBRL(k?.limite_consumido ?? 0)} de ${formatBRL(k?.limite_total_configurado ?? 0)}`}
      />

      <KpiCard
        label="Contas no vermelho"
        icone={<TrendingDown className="h-4 w-4" />}
        tom={(k?.contas_negativas_count ?? 0) > 0 ? 'destructive' : 'success'}
        loading={loading}
        valor={String(k?.contas_negativas_count ?? 0)}
        hint={(k?.contas_negativas_count ?? 0) > 0 ? 'Veja abaixo' : 'Todas no positivo'}
      />

      <KpiCard
        label="Aprovadas sem você"
        icone={<ShieldAlert className="h-4 w-4" />}
        tom={(k?.solicitacoes_ausencia_pendentes_count ?? 0) > 0 ? 'destructive' : 'default'}
        loading={loading}
        valor={String(k?.solicitacoes_ausencia_pendentes_count ?? 0)}
        hint={
          (k?.solicitacoes_ausencia_pendentes_count ?? 0) > 0
            ? 'Aguardam revisão'
            : 'Nada pendente'
        }
      />
    </div>
  )
}
