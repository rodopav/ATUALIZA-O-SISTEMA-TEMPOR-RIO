import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CreditCard,
  ExternalLink,
  Inbox,
  Receipt,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import {
  drillTarifasMesQuery,
  drillContasNegativasQuery,
  drillAusenciaPendentesQuery,
  drillMovimentosMesQuery,
  kpisExecutivosQuery,
} from '../../lib/magnata-queries'
import { formatBRL, formatDate } from '../../lib/format'
import { cn } from '../../lib/cn'

export type DrillKind =
  | 'variacao_mes'
  | 'folego_caixa'
  | 'custo_bancario'
  | 'limite_uso'
  | 'contas_negativas'
  | 'aprovadas_sem_voce'

interface KpiDrillDownDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: DrillKind | null
}

interface DrillMeta {
  titulo: string
  icone: React.ReactNode
  explicacao: string
  navegarPara?: string
  navegarLabel?: string
}

const META: Record<DrillKind, DrillMeta> = {
  variacao_mes: {
    titulo: 'Cresceu/Caiu no mês',
    icone: <TrendingUp className="h-4 w-4" />,
    explicacao:
      'Variação % do saldo geral em relação ao início do mês corrente. Mostro os 10 maiores movimentos do mês como justificativa.',
    navegarPara: '/lancamentos',
    navegarLabel: 'Abrir Lançamentos',
  },
  folego_caixa: {
    titulo: 'Fôlego do caixa',
    icone: <Calculator className="h-4 w-4" />,
    explicacao:
      'Quantos meses o caixa atual aguenta no ritmo atual de gastos (saldo geral ÷ média de saídas dos últimos 3 meses).',
  },
  custo_bancario: {
    titulo: 'Custo bancário do mês',
    icone: <Receipt className="h-4 w-4" />,
    explicacao:
      'Tarifas registradas no mês corrente: tipos de operação marcados como is_tarifa (taxas, IOF, juros bancários).',
    navegarPara: '/lancamentos',
    navegarLabel: 'Filtrar tarifas em Lançamentos',
  },
  limite_uso: {
    titulo: 'Limite em uso',
    icone: <CreditCard className="h-4 w-4" />,
    explicacao:
      'Quanto do cheque especial total já foi consumido. Detalhe por banco abaixo.',
    navegarPara: '/dashboard/saldo-geral',
    navegarLabel: 'Ver saldo geral',
  },
  contas_negativas: {
    titulo: 'Contas no vermelho',
    icone: <TrendingDown className="h-4 w-4" />,
    explicacao:
      'Contas bancárias com saldo abaixo de zero — usando cheque especial ou no negativo sem limite (atenção!).',
    navegarPara: '/dashboard/saldo-geral?status=DIVERGENTE',
    navegarLabel: 'Abrir Saldo Geral',
  },
  aprovadas_sem_voce: {
    titulo: 'Aprovadas sem você',
    icone: <ShieldAlert className="h-4 w-4" />,
    explicacao:
      'Solicitações que usuários liberaram em sua ausência. Esperam você confirmar ou reprovar. Reprovar APAGA o lançamento gerado.',
    navegarPara: '/admin/solicitacoes',
    navegarLabel: 'Abrir Aprovar Solicitações',
  },
}

export function KpiDrillDownDialog({
  open,
  onOpenChange,
  kind,
}: KpiDrillDownDialogProps): React.ReactElement | null {
  const navigate = useNavigate()
  if (!kind) return null
  const meta = META[kind]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-amb-500">{meta.icone}</span>
            {meta.titulo}
          </DialogTitle>
          <DialogDescription>{meta.explicacao}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {kind === 'variacao_mes' ? <DrillVariacaoMes /> : null}
          {kind === 'folego_caixa' ? <DrillFolegoCaixa /> : null}
          {kind === 'custo_bancario' ? <DrillCustoBancario /> : null}
          {kind === 'limite_uso' ? <DrillLimiteUso /> : null}
          {kind === 'contas_negativas' ? <DrillContasNegativas /> : null}
          {kind === 'aprovadas_sem_voce' ? <DrillAusencia /> : null}
        </div>

        {meta.navegarPara ? (
          <div className="flex justify-end border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                if (meta.navegarPara) navigate(meta.navegarPara)
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {meta.navegarLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/* ============================= conteúdos ============================ */

function DrillVariacaoMes(): React.ReactElement {
  const q = useQuery(drillMovimentosMesQuery)
  const kpisQ = useQuery(kpisExecutivosQuery)
  const items = q.data ?? []
  const entradas = items.filter((i) => i.natureza === 'ENTRADA')
  const saidas = items.filter((i) => i.natureza === 'SAIDA')

  return (
    <div className="space-y-4">
      {kpisQ.data ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <ResumoBox
            label="Variação do mês"
            valor={`${kpisQ.data.saldo_variacao_pct >= 0 ? '+' : ''}${kpisQ.data.saldo_variacao_pct.toFixed(1)}%`}
            tom={kpisQ.data.saldo_variacao_pct >= 0 ? 'success' : 'danger'}
          />
          <ResumoBox
            label="Saldo geral hoje"
            valor={formatBRL(kpisQ.data.saldo_geral)}
            tom="default"
          />
        </div>
      ) : null}

      <DrillSection
        titulo="Top 10 entradas do mês"
        icone={<TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
        loading={q.isLoading}
        empty={entradas.length === 0}
      >
        <TabelaCompacta>
          {entradas.map((it) => (
            <LinhaMov key={it.lancamento_id} item={it} />
          ))}
        </TabelaCompacta>
      </DrillSection>

      <DrillSection
        titulo="Top 10 saídas do mês"
        icone={<TrendingDown className="h-3.5 w-3.5 text-red-500" />}
        loading={q.isLoading}
        empty={saidas.length === 0}
      >
        <TabelaCompacta>
          {saidas.map((it) => (
            <LinhaMov key={it.lancamento_id} item={it} />
          ))}
        </TabelaCompacta>
      </DrillSection>
    </div>
  )
}

function DrillFolegoCaixa(): React.ReactElement {
  const kpisQ = useQuery(kpisExecutivosQuery)
  const k = kpisQ.data
  const histInsuficiente = (k?.runway_dias_historico ?? 0) < 14
  return (
    <div className="space-y-3">
      <Alert variant={histInsuficiente ? 'destructive' : 'default'}>
        <Calculator className="h-4 w-4" />
        <AlertTitle>
          {histInsuficiente
            ? 'Histórico insuficiente'
            : 'Como o sistema calcula'}
        </AlertTitle>
        <AlertDescription className="space-y-2">
          {histInsuficiente ? (
            <p>
              Você tem apenas{' '}
              <strong>{k?.runway_dias_historico ?? 0} dia(s)</strong> de
              histórico de saídas. O cálculo precisa de pelo menos 14 dias pra
              não inflar a média diária. Por isso o card mostra "—".
            </p>
          ) : null}
          <p className="font-mono text-xs">
            Fôlego = Saldo geral ÷ (média diária dos últimos 90 dias × 30)
          </p>
          {k ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <ResumoBox
                label="Saldo geral"
                valor={formatBRL(k.saldo_geral)}
                tom="default"
              />
              <ResumoBox
                label={histInsuficiente ? 'Fôlego (estimativa)' : 'Fôlego'}
                valor={
                  histInsuficiente
                    ? '—'
                    : k.runway_meses != null
                      ? `${k.runway_meses.toFixed(1)} m`
                      : '∞'
                }
                tom={
                  histInsuficiente
                    ? 'default'
                    : k.runway_meses == null
                      ? 'default'
                      : k.runway_meses < 3
                        ? 'danger'
                        : k.runway_meses < 6
                          ? 'warning'
                          : 'success'
                }
              />
              <ResumoBox
                label="Saídas nos últimos 90 dias"
                valor={formatBRL(k.runway_saidas_90d)}
                tom="default"
              />
              <ResumoBox
                label="Gasto médio por dia"
                valor={formatBRL(k.runway_media_diaria)}
                tom="default"
              />
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Janela de 90 dias rolling (inclui hoje). Quanto mais histórico,
            mais preciso. Não considera entradas previstas — se houver
            pagamento grande já contratado, ajuste mental.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}

function DrillCustoBancario(): React.ReactElement {
  const q = useQuery(drillTarifasMesQuery)
  const items = q.data ?? []
  const total = items.reduce((a, b) => a + b.valor, 0)

  return (
    <div className="space-y-3">
      <ResumoBox
        label={`Total no mês (${items.length} tarifa${items.length === 1 ? '' : 's'})`}
        valor={formatBRL(total)}
        tom="warning"
      />
      <DrillSection
        titulo="Tarifas registradas"
        icone={<Receipt className="h-3.5 w-3.5 text-amb-500" />}
        loading={q.isLoading}
        empty={items.length === 0}
        emptyMsg="Nenhuma tarifa marcada como tarifa este mês."
      >
        <TabelaCompacta>
          {items.map((it) => (
            <tr key={it.lancamento_id} className="border-b border-border/40">
              <td className="py-1.5 pr-2 text-[11px] tabular-nums text-muted-foreground">
                {formatDate(it.data)}
              </td>
              <td className="py-1.5 pr-2 text-xs">{it.descricao}</td>
              <td className="py-1.5 pr-2 text-[11px] text-muted-foreground">
                {it.conta_apelido}
              </td>
              <td className="py-1.5 pl-2 text-right font-mono text-xs font-semibold tabular-nums text-amb-600 dark:text-amb-400">
                {formatBRL(it.valor)}
              </td>
            </tr>
          ))}
        </TabelaCompacta>
      </DrillSection>
    </div>
  )
}

function DrillLimiteUso(): React.ReactElement {
  const kpisQ = useQuery(kpisExecutivosQuery)
  const k = kpisQ.data
  return (
    <div className="space-y-3">
      {k ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <ResumoBox
            label="% consumido"
            valor={`${k.pct_limite_consumido.toFixed(1)}%`}
            tom={
              k.pct_limite_consumido > 80
                ? 'danger'
                : k.pct_limite_consumido > 50
                  ? 'warning'
                  : 'default'
            }
          />
          <ResumoBox
            label="Em uso"
            valor={formatBRL(k.limite_consumido)}
            tom="danger"
          />
          <ResumoBox
            label="Disponível"
            valor={formatBRL(k.limite_total_disponivel)}
            tom="success"
          />
        </div>
      ) : null}
      <Alert>
        <CreditCard className="h-4 w-4" />
        <AlertTitle>Detalhe por banco</AlertTitle>
        <AlertDescription>
          Veja a seção "Contas com cheque especial" abaixo do dashboard pra
          cada conta separadamente, com barra de progresso e badge "NO LIMITE"
          nas contas mais expostas.
        </AlertDescription>
      </Alert>
    </div>
  )
}

function DrillContasNegativas(): React.ReactElement {
  const q = useQuery(drillContasNegativasQuery)
  const items = q.data ?? []
  const total = items.reduce((a, b) => a + b.saldo_atual, 0)

  return (
    <div className="space-y-3">
      <ResumoBox
        label={`Exposição total (${items.length} conta${items.length === 1 ? '' : 's'})`}
        valor={formatBRL(total)}
        tom="danger"
      />
      <DrillSection
        titulo="Contas com saldo abaixo de zero"
        icone={<TrendingDown className="h-3.5 w-3.5 text-red-500" />}
        loading={q.isLoading}
        empty={items.length === 0}
        emptyMsg="Nenhuma conta no negativo."
      >
        <TabelaCompacta>
          {items.map((it) => (
            <tr key={it.conta_id} className="border-b border-border/40">
              <td className="py-1.5 pr-2 text-xs font-medium">
                {it.apelido}
                <span className="block text-[10px] text-muted-foreground">
                  {it.empresa ?? '—'}
                </span>
              </td>
              <td className="py-1.5 px-2 text-[11px]">
                {it.tem_limite ? (
                  <Badge
                    variant="outline"
                    className="border-amb-400/40 bg-amb-400/10 text-[9px] uppercase tracking-wider text-amb-600 dark:text-amb-400"
                  >
                    cheque especial
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-red-500/40 bg-red-500/10 text-[9px] uppercase tracking-wider text-red-600 dark:text-red-400"
                  >
                    sem limite!
                  </Badge>
                )}
              </td>
              <td className="py-1.5 pl-2 text-right font-mono text-xs font-bold tabular-nums text-destructive">
                {formatBRL(it.saldo_atual)}
              </td>
            </tr>
          ))}
        </TabelaCompacta>
      </DrillSection>
    </div>
  )
}

function DrillAusencia(): React.ReactElement {
  const q = useQuery(drillAusenciaPendentesQuery)
  const items = q.data ?? []
  const total = items.reduce((a, b) => a + b.valor, 0)

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Requer sua decisão</AlertTitle>
          <AlertDescription>
            Cada solicitação aqui foi liberada por um usuário sem você. Se você
            <strong> reprovar</strong>, o lançamento gerado é apagado junto com
            saídas posteriores feitas pelo mesmo solicitante na conta
            beneficiada.
          </AlertDescription>
        </Alert>
      ) : null}

      <ResumoBox
        label={`Total aguardando revisão (${items.length})`}
        valor={formatBRL(total)}
        tom={items.length > 0 ? 'danger' : 'success'}
      />

      <DrillSection
        titulo="Solicitações"
        icone={<ShieldAlert className="h-3.5 w-3.5 text-red-500" />}
        loading={q.isLoading}
        empty={items.length === 0}
        emptyMsg="Nenhuma aprovação em ausência pendente."
      >
        <TabelaCompacta>
          {items.map((it) => (
            <tr key={it.solicitacao_id} className="border-b border-border/40">
              <td className="py-1.5 pr-2 text-xs font-medium">
                {it.solicitante}
                <span className="block text-[10px] text-muted-foreground">
                  {it.descricao}
                </span>
              </td>
              <td className="py-1.5 px-2 text-[11px] text-muted-foreground">
                {it.conta_origem_efetiva ?? '—'}
                <ArrowRight className="mx-0.5 inline h-2.5 w-2.5" />
                {it.conta_destino ?? '—'}
              </td>
              <td className="py-1.5 px-2 text-right text-[11px] text-muted-foreground">
                {it.horas_aguardando >= 24
                  ? `${Math.floor(it.horas_aguardando / 24)}d`
                  : `${Math.floor(it.horas_aguardando)}h`}
              </td>
              <td className="py-1.5 pl-2 text-right font-mono text-xs font-bold tabular-nums">
                {formatBRL(it.valor)}
              </td>
            </tr>
          ))}
        </TabelaCompacta>
      </DrillSection>
    </div>
  )
}

/* ============================= helpers ============================ */

function ResumoBox({
  label,
  valor,
  tom,
}: {
  label: string
  valor: string
  tom: 'success' | 'danger' | 'warning' | 'default'
}): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        tom === 'success' && 'border-emerald-500/30 bg-emerald-500/[0.04]',
        tom === 'danger' && 'border-red-500/30 bg-red-500/[0.04]',
        tom === 'warning' && 'border-amb-400/30 bg-amb-400/[0.04]',
        tom === 'default' && 'border-border bg-muted/30',
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 font-mono text-lg font-extrabold tabular-nums tracking-tight',
          tom === 'success' && 'text-emerald-600 dark:text-emerald-400',
          tom === 'danger' && 'text-destructive',
          tom === 'warning' && 'text-amb-600 dark:text-amb-400',
        )}
      >
        {valor}
      </p>
    </div>
  )
}

function DrillSection({
  titulo,
  icone,
  loading,
  empty,
  emptyMsg = 'Sem dados.',
  children,
}: {
  titulo: string
  icone?: React.ReactNode
  loading?: boolean
  empty?: boolean
  emptyMsg?: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {icone}
        <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
          {titulo}
        </p>
      </div>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : empty ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          <Inbox className="h-3.5 w-3.5" />
          {emptyMsg}
        </div>
      ) : (
        children
      )}
    </div>
  )
}

function TabelaCompacta({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="rounded-md border border-border/60 bg-card">
      <table className="w-full text-sm">
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function LinhaMov({ item }: { item: DrillMovItem }): React.ReactElement {
  return (
    <tr className="border-b border-border/40">
      <td className="py-1.5 pl-3 pr-2 text-[11px] tabular-nums text-muted-foreground">
        {formatDate(item.data)}
      </td>
      <td className="py-1.5 pr-2 text-xs">{item.descricao}</td>
      <td className="py-1.5 pr-2 text-[11px] text-muted-foreground">
        {item.conta_apelido}
      </td>
      <td
        className={cn(
          'py-1.5 pl-2 pr-3 text-right font-mono text-xs font-semibold tabular-nums',
          item.natureza === 'ENTRADA' ? 'text-emerald-600' : 'text-destructive',
        )}
      >
        {item.natureza === 'ENTRADA' ? '+' : '−'}
        {formatBRL(item.valor)}
      </td>
    </tr>
  )
}

interface DrillMovItem {
  data: string
  descricao: string
  conta_apelido: string
  valor: number
  natureza: string
}
