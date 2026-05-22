import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Inbox, ArrowRight } from 'lucide-react'
import { PageTitle, Section } from './VisaoGeral'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { lancamentosListQuery, type MagnataLancamento } from '../lib/queries'
import { formatBRL, formatDate } from '../lib/format'
import { cn } from '../lib/cn'

type NaturezaFiltro = 'all' | 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'

const NATUREZA_OPTS: Array<{ key: NaturezaFiltro; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'ENTRADA', label: 'Entradas' },
  { key: 'SAIDA', label: 'Saídas' },
  { key: 'TRANSFERENCIA', label: 'Transferências' },
]

function inicioMes(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function fimMes(): string {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function Lancamentos(): React.ReactElement {
  const [filtros, setFiltros] = React.useState({
    inicio: inicioMes(),
    fim: fimMes(),
    natureza: 'all' as NaturezaFiltro,
  })

  const q = useQuery(lancamentosListQuery(filtros))
  const list = q.data ?? []

  const totais = React.useMemo(() => {
    let entradas = 0,
      saidas = 0,
      transf = 0,
      count = 0
    for (const l of list) {
      if (l.is_estorno) continue
      count++
      if (l.is_transferencia) {
        transf += l.valor
        continue
      }
      if (l.natureza === 'ENTRADA') entradas += l.valor
      else saidas += l.valor
    }
    return { entradas, saidas, transf, count }
  }, [list])

  return (
    <div className="space-y-5">
      <PageTitle eyebrow="Operacional" title="Lançamentos" />

      <Section label="Filtros">
        <Card>
          <CardContent className="space-y-3 p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Início
                </label>
                <Input
                  type="date"
                  value={filtros.inicio}
                  onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Fim
                </label>
                <Input
                  type="date"
                  value={filtros.fim}
                  onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {NATUREZA_OPTS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFiltros({ ...filtros, natureza: opt.key })}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    filtros.natureza === opt.key
                      ? 'border-amb-400 bg-amb-400 text-zinc-950'
                      : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800/40',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section label={`${totais.count} lançamento(s)`}>
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Entradas" valor={formatBRL(totais.entradas)} tom="success" />
          <MiniStat label="Saídas" valor={formatBRL(totais.saidas)} tom="destructive" />
          <MiniStat label="Transf." valor={formatBRL(totais.transf)} tom="info" />
        </div>

        <Card>
          <CardContent className="p-0">
            {q.isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 w-full animate-pulse rounded bg-zinc-800/60" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <Inbox className="h-6 w-6 text-zinc-600" />
                <p className="text-sm text-zinc-500">Nenhum lançamento encontrado.</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800/60">
                {list.map((l) => (
                  <Row key={l.id} row={l} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}

function MiniStat({
  label,
  valor,
  tom,
}: {
  label: string
  valor: string
  tom: 'success' | 'destructive' | 'info'
}): React.ReactElement {
  const cor =
    tom === 'success' ? 'text-emerald-400' : tom === 'destructive' ? 'text-red-400' : 'text-sky-400'
  return (
    <div className="card p-2.5 sm:p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={cn('num-mono mt-0.5 truncate text-sm sm:text-base font-extrabold', cor)}>
        {valor}
      </p>
    </div>
  )
}

function Row({ row }: { row: MagnataLancamento }): React.ReactElement {
  const naturezaColor = row.is_transferencia
    ? 'text-sky-400'
    : row.natureza === 'ENTRADA'
      ? 'text-emerald-400'
      : 'text-red-400'
  const conta = row.is_transferencia
    ? `${row.conta_origem_apelido ?? '—'} → ${row.conta_destino_apelido ?? '—'}`
    : (row.conta_origem_apelido ?? row.conta_destino_apelido ?? '—')

  return (
    <li
      className={cn(
        'flex items-start gap-3 px-3 py-2.5 sm:px-4',
        row.estornado && 'opacity-60',
        row.is_estorno && 'bg-amb-400/[0.04]',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium text-zinc-100">{row.descricao}</p>
        <p className="mt-0.5 text-[10px] text-zinc-500">
          {formatDate(row.data)} · {row.responsavel_nome ?? '—'}
          {row.empresa_nome ? ` · ${row.empresa_nome}` : ''}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-zinc-600">{conta}</p>
        {row.is_transferencia ? (
          <span className="mt-1 inline-block rounded bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-400">
            Transferência
          </span>
        ) : row.estornado ? (
          <span className="mt-1 inline-block rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
            Estornado
          </span>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className={cn('num-mono text-sm font-bold sm:text-base', naturezaColor)}>
          {row.natureza === 'SAIDA' && !row.is_transferencia ? '−' : ''}
          {formatBRL(row.valor)}
        </p>
      </div>
    </li>
  )
}
