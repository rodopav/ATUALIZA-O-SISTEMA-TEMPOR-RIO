import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Building2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../../components/ui/alert'
import { Skeleton } from '../../components/ui/skeleton'
import { AlertasBanner } from '../../components/magnata/AlertasBanner'
import { HeroExecutivo } from '../../components/magnata/HeroExecutivo'
import { KpisExecutivosCards } from '../../components/magnata/KpisExecutivosCards'
import { EvolucaoSaldoChart } from '../../components/magnata/EvolucaoSaldoChart'
import { TipoContaPieChart } from '../../components/magnata/TipoContaPieChart'
import { SaldosConsolidadosCards } from '../../components/dashboards/SaldosConsolidadosCards'
import { ContasClassificadasSection } from '../../components/dashboards/ContasClassificadasSection'
import { LimitesPorContaSection } from '../../components/dashboards/LimitesPorContaSection'
import {
  alertasQuery,
  contasSaldoMagnataQuery,
  fluxoMensalQuery,
  kpisQuery,
} from '../../lib/magnata-queries'
import { kpisExecutivosQuery } from '../../lib/magnata-queries'
import { mapError } from '../../lib/error-mapper'

/**
 * Magnata Visão — cockpit executivo do CFO.
 *
 * Layout (de cima pra baixo, em ordem de prioridade):
 *   1. HERO: bolinha de status + frase + saldo geral
 *   2. ATENÇÃO NECESSÁRIA (só se houver alertas)
 *   3. CAIXA DO GRUPO: saldos consolidados (Contas/Caixa/Geral/Limite)
 *   4. PULSO DO MÊS: 6 KPIs humanos (variação, fôlego, custo bancário,
 *      limite em uso, contas no vermelho, aprovadas sem você)
 *   5. DETALHES: limites por banco, evolução 12m, distribuição por tipo
 *
 * Antes: 17 cards + 1 banner. Agora: 1 hero + banner condicional +
 * 4 cards de caixa + 6 KPIs + 3 detalhes. CFO escaneia em 3 segundos.
 */
export function MagnataVisaoPage(): React.ReactElement {
  const kpisQ = useQuery(kpisQuery)
  const kpisExecQ = useQuery(kpisExecutivosQuery)
  const alertasQ = useQuery(alertasQuery)
  const fluxoMensalQ = useQuery(fluxoMensalQuery)
  const contasQ = useQuery(contasSaldoMagnataQuery)

  const errorMsg =
    kpisExecQ.error ?? alertasQ.error ?? fluxoMensalQ.error ?? contasQ.error
  const errorDescription = errorMsg ? mapError(errorMsg).description : null

  const temAlertas = (alertasQ.data?.length ?? 0) > 0

  return (
    <div className="space-y-6">
      {/* 1. HERO — diagnostico em 3 segundos */}
      <HeroExecutivo />

      {errorDescription ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar dados</AlertTitle>
          <AlertDescription>{errorDescription}</AlertDescription>
        </Alert>
      ) : null}

      {/* 2. ATENÇÃO NECESSÁRIA — só renderiza se houver */}
      {temAlertas ? (
        <section className="space-y-2">
          <SectionHeader
            label="Atenção necessária"
            descricao="Itens que precisam da sua decisão hoje"
          />
          <AlertasBanner alertas={alertasQ.data ?? []} />
        </section>
      ) : null}

      {/* 3. CAIXA DO GRUPO — saldos consolidados */}
      <section className="space-y-3">
        <SectionHeader
          label="Caixa do grupo"
          descricao="Onde o dinheiro está agora"
        />
        <SaldosConsolidadosCards />
        <ContasClassificadasSection kind="caixa_fisico" />
        <ContasClassificadasSection kind="investimento" />
      </section>

      {/* 4. PULSO DO MÊS — 6 KPIs humanos com tooltip */}
      <section className="space-y-3">
        <SectionHeader
          label="Pulso do mês"
          descricao="Como o grupo está se comportando neste mês"
        />
        <KpisExecutivosCards />
      </section>

      {/* 5. DETALHES — drill-downs */}
      <section className="space-y-3">
        <SectionHeader
          label="Detalhes"
          descricao="Drill-down para análise mais profunda"
        />

        <LimitesPorContaSection />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Evolução do saldo (12 meses)</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Saldo cumulativo derivado do fluxo mensal líquido.
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amb-400/10 text-amb-500 dark:text-amb-300">
                <Building2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {fluxoMensalQ.isLoading || kpisQ.isLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : (
                <EvolucaoSaldoChart
                  data={fluxoMensalQ.data ?? []}
                  saldoAtual={kpisQ.data?.saldo_total ?? 0}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição por tipo de conta</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Saldo atual segmentado por natureza da conta.
              </p>
            </CardHeader>
            <CardContent>
              {contasQ.isLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : (
                <TipoContaPieChart contas={contasQ.data ?? []} />
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

/**
 * Cabeçalho de seção: tracinho âmbar + caption uppercase + descrição.
 * Cria hierarquia visual clara entre as 4 zonas do dashboard.
 */
function SectionHeader({
  label,
  descricao,
}: {
  label: string
  descricao?: string
}): React.ReactElement {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <span aria-hidden className="h-px w-6 bg-amb-400" />
        <span className="text-[11px] font-bold uppercase tracking-[2px] text-amb-600 dark:text-amb-400">
          {label}
        </span>
      </div>
      {descricao ? (
        <p className="ml-8 text-xs text-muted-foreground">{descricao}</p>
      ) : null}
    </div>
  )
}

export default MagnataVisaoPage
