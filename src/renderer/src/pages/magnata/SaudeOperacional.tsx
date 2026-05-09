import * as React from 'react'
import { useQuery, queryOptions } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
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
import { PendentesAgingChart } from '../../components/magnata/PendentesAgingChart'
import { supabase } from '../../lib/supabase'
import { mapError } from '../../lib/error-mapper'
import { formatBRL } from '../../lib/format'
import { divergenciasQuery } from '../../lib/dashboards-queries'
import { currentPeriodoIso } from '../../lib/queries'
import {
  saldoPorEmpresaQuery,
  fluxoMensalQuery,
} from '../../lib/magnata-queries'
import { cn } from '../../lib/cn'
import type { Tables } from '../../../../shared/database.types'

type PendenteRow = Tables<'v_pendentes_conciliacao'>
type PeriodoFechado = Tables<'periodos_fechados'>

const pendentesQuery = queryOptions({
  queryKey: ['magnata', 'pendentes_conciliacao'] as const,
  queryFn: async (): Promise<PendenteRow[]> => {
    const { data, error } = await supabase
      .from('v_pendentes_conciliacao')
      .select('*')
      .order('data', { ascending: true })
      .limit(500)
    if (error) throw error
    return data ?? []
  },
  staleTime: 60_000,
})

const fechamentoStatusQuery = queryOptions({
  queryKey: ['magnata', 'fechamento_status'] as const,
  queryFn: async (): Promise<{
    periodoAtual: string
    fechamentoAtual: PeriodoFechado | null
    fechamentoAnterior: PeriodoFechado | null
  }> => {
    const periodoAtual = currentPeriodoIso()
    const dt = new Date(periodoAtual + 'T00:00:00')
    const anterior = new Date(dt.getFullYear(), dt.getMonth() - 1, 1)
    const periodoAnterior = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, '0')}-01`
    const { data, error } = await supabase
      .from('periodos_fechados')
      .select('*')
      .in('periodo', [periodoAtual, periodoAnterior])
    if (error) throw error
    const list = data ?? []
    return {
      periodoAtual,
      fechamentoAtual: list.find((r) => r.periodo === periodoAtual) ?? null,
      fechamentoAnterior:
        list.find((r) => r.periodo === periodoAnterior) ?? null,
    }
  },
  staleTime: 60_000,
})

const conciliacaoTaxaQuery = queryOptions({
  queryKey: ['magnata', 'conciliacao_taxa'] as const,
  queryFn: async (): Promise<{
    total: number
    conciliados: number
    pct: number
  }> => {
    const periodo = currentPeriodoIso()
    const dt = new Date(periodo + 'T00:00:00')
    const fim = new Date(dt.getFullYear(), dt.getMonth() + 1, 0)
    const inicioStr = periodo
    const fimStr = `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, '0')}-${String(fim.getDate()).padStart(2, '0')}`
    const totalRes = await supabase
      .from('lancamentos')
      .select('*', { count: 'exact', head: true })
      .gte('data', inicioStr)
      .lte('data', fimStr)
    if (totalRes.error) throw totalRes.error
    const conciliadosRes = await supabase
      .from('lancamentos')
      .select('*', { count: 'exact', head: true })
      .gte('data', inicioStr)
      .lte('data', fimStr)
      .not('conciliado_em', 'is', null)
    if (conciliadosRes.error) throw conciliadosRes.error
    const total = totalRes.count ?? 0
    const conciliados = conciliadosRes.count ?? 0
    const pct = total === 0 ? 100 : (conciliados / total) * 100
    return { total, conciliados, pct }
  },
  staleTime: 30_000,
})

function formatPeriodo(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})/)
  if (!m) return iso
  return `${m[2]}/${m[1]}`
}

export function MagnataSaudePage(): React.ReactElement {
  const periodo = React.useMemo(() => currentPeriodoIso(), [])
  const pendentesQ = useQuery(pendentesQuery)
  const divQ = useQuery(divergenciasQuery(periodo))
  const fechQ = useQuery(fechamentoStatusQuery)
  const conciliacaoQ = useQuery(conciliacaoTaxaQuery)
  const fluxoMensalQ = useQuery(fluxoMensalQuery)
  const empresasQ = useQuery(saldoPorEmpresaQuery)

  const errorMsg = pendentesQ.error ?? divQ.error
  const errorDescription = errorMsg ? mapError(errorMsg).description : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Magnata"
        title="Saúde do Sistema"
        description="Conciliação, fechamento e saúde operacional por empresa."
      />

      <Alert variant="info">
        <Info className="h-4 w-4" />
        <AlertTitle>O que é considerado pendente?</AlertTitle>
        <AlertDescription>
          Lançamentos <strong>pendentes</strong> são os que foram registrados
          mas ainda <strong>não foram conciliados</strong> contra o extrato
          bancário. Não confunda com solicitações de saldo (essas têm fluxo
          próprio em <em>Solicitações</em>).
        </AlertDescription>
      </Alert>

      {errorDescription ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar dados de saúde</AlertTitle>
          <AlertDescription>{errorDescription}</AlertDescription>
        </Alert>
      ) : null}

      {/* Linha 1: Conciliação + Fechamento */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Taxa de Conciliação</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                % de lançamentos do mês confirmados contra o extrato bancário.
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-grn-50 text-grn-600 dark:bg-success/15">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {conciliacaoQ.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <ConciliacaoCard data={conciliacaoQ.data!} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Status do Fechamento</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Travamento contábil dos meses para auditoria.
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amb-400/10 text-amb-500 dark:text-amb-300">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {fechQ.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <FechamentoCard data={fechQ.data!} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Aging + Saúde por empresa */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Pendências envelhecidas</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Idade dos lançamentos ainda não conciliados. Acima de 30 dias
                exige atenção.
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amb-400/10 text-amb-500 dark:text-amb-300">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {pendentesQ.isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <PendentesAgingChart data={pendentesQ.data ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Saúde Operacional por Empresa</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Resultado líquido (entradas − saídas) do mês corrente, por
                entidade.
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blu-600/10 text-blu-600">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {fluxoMensalQ.isLoading || empresasQ.isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <SaudeEmpresasList
                empresas={empresasQ.data ?? []}
                periodoIso={periodo}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha 3: Divergências */}
      <Card>
        <CardHeader>
          <CardTitle>Divergências do mês corrente</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Contas com saldo calculado divergente do esperado.
          </p>
        </CardHeader>
        <CardContent>
          {divQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (divQ.data ?? []).length === 0 ? (
            <div className="rounded-md border bg-success/5 px-4 py-6 text-center text-sm text-success">
              Nenhuma divergência neste período.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Conta</th>
                    <th className="px-3 py-2 font-medium">Empresa</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Saldo atual
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Saldo inicial
                    </th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(divQ.data ?? []).map((row) => (
                    <tr key={`${row.conta_id}-${row.periodo}`} className="border-t">
                      <td className="px-3 py-2">{row.conta ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.empresa ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatBRL(Number(row.saldo_atual ?? 0))}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatBRL(Number(row.saldo_inicial ?? 0))}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                          {row.status ?? 'DIVERGENTE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ConciliacaoCard({
  data,
}: {
  data: { total: number; conciliados: number; pct: number }
}): React.ReactElement {
  const { total, conciliados, pct } = data
  const color =
    pct >= 90 ? 'bg-success' : pct >= 70 ? 'bg-amb-400' : 'bg-destructive'
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-semibold tabular-nums">
          {pct.toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground">
          {conciliados} / {total} lançamentos
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full transition-all', color)}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {pct >= 90
          ? 'Excelente — quase tudo conferido.'
          : pct >= 70
            ? 'Bom — ainda há lançamentos sem confirmação no extrato.'
            : 'Atenção — muitos lançamentos pendentes de conciliação.'}
      </p>
    </div>
  )
}

function FechamentoCard({
  data,
}: {
  data: {
    periodoAtual: string
    fechamentoAtual: PeriodoFechado | null
    fechamentoAnterior: PeriodoFechado | null
  }
}): React.ReactElement {
  const { periodoAtual, fechamentoAtual, fechamentoAnterior } = data
  const dt = new Date(periodoAtual + 'T00:00:00')
  const anterior = new Date(dt.getFullYear(), dt.getMonth() - 1, 1)
  const periodoAnterior = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, '0')}-01`

  const Item = ({
    label,
    fechado,
  }: {
    label: string
    fechado: boolean
  }): React.ReactElement => (
    <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
          fechado
            ? 'bg-success/10 text-success'
            : 'bg-amb-400/15 text-amb-600 dark:text-amb-300',
        )}
      >
        {fechado ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <AlertTriangle className="h-3 w-3" />
        )}
        {fechado ? 'Fechado' : 'Aberto'}
      </span>
    </div>
  )

  return (
    <div className="space-y-2">
      <Item label={`Mês anterior (${formatPeriodo(periodoAnterior)})`} fechado={!!fechamentoAnterior} />
      <Item label={`Mês corrente (${formatPeriodo(periodoAtual)})`} fechado={!!fechamentoAtual} />
      <p className="pt-1 text-xs text-muted-foreground">
        O fechamento trava lançamentos retroativos com hash SHA-256 dos totais.
        Auditoria registra qualquer reabertura.
      </p>
    </div>
  )
}

interface SaudeEmpresasListProps {
  empresas: Array<{
    empresa_id: string | null
    razao_social?: string | null
    nome_fantasia?: string | null
    saldo_total: number | null
  }>
  periodoIso: string
}

function SaudeEmpresasList({
  empresas,
  periodoIso,
}: SaudeEmpresasListProps): React.ReactElement {
  const fluxoQ = useQuery({
    queryKey: ['magnata', 'fluxo_empresa', periodoIso] as const,
    queryFn: async (): Promise<
      Array<{ empresa_id: string; entradas: number; saidas: number }>
    > => {
      const dt = new Date(periodoIso + 'T00:00:00')
      const fim = new Date(dt.getFullYear(), dt.getMonth() + 1, 0)
      const fimStr = `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, '0')}-${String(fim.getDate()).padStart(2, '0')}`
      // Lancamentos joina com tipos_operacao para chegar na empresa.
      const { data, error } = await supabase
        .from('lancamentos')
        .select('valor, natureza, tipo_operacao_id, tipos_operacao(empresa_id)')
        .gte('data', periodoIso)
        .lte('data', fimStr)
      if (error) throw error
      const rows = (data ?? []) as unknown as Array<{
        valor: number
        natureza: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
        tipos_operacao: { empresa_id: string | null } | null
      }>
      const map = new Map<string, { entradas: number; saidas: number }>()
      for (const r of rows) {
        const empresaId = r.tipos_operacao?.empresa_id
        if (!empresaId) continue
        const cur = map.get(empresaId) ?? { entradas: 0, saidas: 0 }
        const v = Number(r.valor ?? 0)
        if (r.natureza === 'ENTRADA') cur.entradas += v
        else if (r.natureza === 'SAIDA') cur.saidas += v
        map.set(empresaId, cur)
      }
      return Array.from(map.entries()).map(([empresa_id, v]) => ({
        empresa_id,
        ...v,
      }))
    },
    staleTime: 30_000,
  })

  const dataset = React.useMemo(() => {
    const fluxo = fluxoQ.data ?? []
    const fluxoMap = new Map(fluxo.map((f) => [f.empresa_id, f]))
    return empresas
      .filter((e) => e.empresa_id)
      .map((e) => {
        const f = fluxoMap.get(e.empresa_id!) ?? { entradas: 0, saidas: 0 }
        const liquido = f.entradas - f.saidas
        const empresaNome =
          e.nome_fantasia ?? e.razao_social ?? '—'
        return { ...e, ...f, liquido, empresaNome }
      })
      .sort((a, b) => b.liquido - a.liquido)
  }, [empresas, fluxoQ.data])

  if (fluxoQ.isLoading) return <Skeleton className="h-[220px] w-full" />

  if (dataset.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        Sem movimento operacional neste período.
      </div>
    )
  }

  return (
    <ul className="space-y-1.5">
      {dataset.slice(0, 8).map((row) => {
        const positivo = row.liquido >= 0
        return (
          <li
            key={row.empresa_id}
            className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.empresaNome}</p>
              <p className="truncate text-[11px] tabular-nums text-muted-foreground">
                + {formatBRL(row.entradas)} · − {formatBRL(row.saidas)}
              </p>
            </div>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums',
                positivo
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              {positivo ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {formatBRL(row.liquido)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default MagnataSaudePage
