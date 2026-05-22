import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCheck,
  Receipt,
  ShieldAlert,
  AlertCircle,
  CreditCard,
} from 'lucide-react'
import { PageTitle, Section } from './VisaoGeral'
import { KpiCard } from '../components/KpiCard'
import { kpisExecutivosQuery, alertasQuery } from '../lib/queries'
import { formatBRLAuto, useIsMobile } from '../lib/format'

export function Saude(): React.ReactElement {
  const k = useQuery(kpisExecutivosQuery)
  const a = useQuery(alertasQuery)
  const isMobile = useIsMobile()
  const kpi = k.data

  const alertas = a.data ?? []
  const criticas = alertas.filter((al) => al.severidade === 'CRITICA').length
  const avisos = alertas.filter((al) => al.severidade === 'AVISO').length

  return (
    <div className="space-y-5">
      <PageTitle eyebrow="Operacional" title="Saúde do sistema" />

      <Section label="Indicadores de risco">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            label="Alertas críticos"
            icone={<AlertCircle className="h-4 w-4" />}
            tom={criticas > 0 ? 'destructive' : 'success'}
            loading={a.isLoading}
            valor={String(criticas)}
            hint={criticas > 0 ? 'Veja na Visão geral' : 'Nada urgente'}
          />
          <KpiCard
            label="Avisos"
            icone={<AlertCircle className="h-4 w-4" />}
            tom={avisos > 0 ? 'warning' : 'default'}
            loading={a.isLoading}
            valor={String(avisos)}
            hint={avisos > 0 ? 'Merece atenção' : 'Sem avisos'}
          />
          <KpiCard
            label="Contas no vermelho"
            icone={<CreditCard className="h-4 w-4" />}
            tom={(kpi?.contas_negativas_count ?? 0) > 0 ? 'destructive' : 'success'}
            loading={k.isLoading}
            valor={String(kpi?.contas_negativas_count ?? 0)}
            hint={(kpi?.contas_negativas_count ?? 0) > 0 ? 'Saldo negativo' : 'Todas no positivo'}
          />
          <KpiCard
            label="Limite consumido"
            icone={<CreditCard className="h-4 w-4" />}
            tom={
              (kpi?.pct_limite_consumido ?? 0) > 80
                ? 'destructive'
                : (kpi?.pct_limite_consumido ?? 0) > 50
                  ? 'warning'
                  : 'default'
            }
            loading={k.isLoading}
            valor={`${(kpi?.pct_limite_consumido ?? 0).toFixed(1)}%`}
            hint={`${formatBRLAuto(kpi?.limite_consumido ?? 0, isMobile)} em uso`}
          />
          <KpiCard
            label="Tarifas no mês"
            icone={<Receipt className="h-4 w-4" />}
            tom={(kpi?.tarifas_mes_count ?? 0) > 0 ? 'warning' : 'default'}
            loading={k.isLoading}
            valor={String(kpi?.tarifas_mes_count ?? 0)}
            hint={formatBRLAuto(kpi?.tarifas_mes_valor ?? 0, isMobile)}
          />
          <KpiCard
            label="Solicitações pendentes"
            icone={<ShieldAlert className="h-4 w-4" />}
            tom={(kpi?.solicitacoes_pendentes_count ?? 0) > 0 ? 'warning' : 'success'}
            loading={k.isLoading}
            valor={String(kpi?.solicitacoes_pendentes_count ?? 0)}
            hint="Aguardam aprovação"
          />
          <KpiCard
            label="Aprovadas em ausência"
            icone={<ShieldAlert className="h-4 w-4" />}
            tom={(kpi?.solicitacoes_ausencia_pendentes_count ?? 0) > 0 ? 'destructive' : 'default'}
            loading={k.isLoading}
            valor={String(kpi?.solicitacoes_ausencia_pendentes_count ?? 0)}
            hint="Aguardam revisão"
          />
          <KpiCard
            label="Status geral"
            icone={<CheckCheck className="h-4 w-4" />}
            tom={criticas > 0 ? 'destructive' : avisos > 0 ? 'warning' : 'success'}
            loading={k.isLoading || a.isLoading}
            valor={criticas > 0 ? 'Atenção' : avisos > 0 ? 'OK c/ avisos' : 'OK'}
          />
        </div>
      </Section>
    </div>
  )
}
