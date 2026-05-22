import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { HeroExecutivo } from '../components/HeroExecutivo'
import { AlertasBanner } from '../components/AlertasBanner'
import { SaldosCards } from '../components/SaldosCards'
import { KpisGrid } from '../components/KpisGrid'
import { ContasNegativasList } from '../components/ContasNegativasList'
import { LimitesPorContaList } from '../components/LimitesPorContaList'
import { alertasQuery } from '../lib/queries'

export function VisaoGeral(): React.ReactElement {
  const alertas = useQuery(alertasQuery)
  const temAlertas = (alertas.data?.length ?? 0) > 0

  return (
    <div className="space-y-5">
      <PageTitle eyebrow="Cockpit" title="Visão geral" />
      <HeroExecutivo />

      {temAlertas ? (
        <Section label="Atenção necessária">
          <AlertasBanner alertas={alertas.data ?? []} />
        </Section>
      ) : null}

      <Section label="Caixa do grupo">
        <SaldosCards />
      </Section>

      <Section label="Pulso do mês">
        <KpisGrid />
      </Section>

      <Section label="Detalhes por banco">
        <LimitesPorContaList />
        <ContasNegativasList />
      </Section>
    </div>
  )
}

export function PageTitle({
  eyebrow,
  title,
}: {
  eyebrow?: string
  title: string
}): React.ReactElement {
  return (
    <div>
      {eyebrow ? <p className="label-eyebrow">{eyebrow}</p> : null}
      <h1 className="text-xl font-bold leading-tight text-zinc-50 sm:text-2xl">{title}</h1>
    </div>
  )
}

export function Section({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span aria-hidden className="h-px w-6 bg-amb-400" />
        <span className="label-eyebrow">{label}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
