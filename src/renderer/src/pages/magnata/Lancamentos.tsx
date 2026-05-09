import * as React from 'react'
import { useQuery, queryOptions } from '@tanstack/react-query'
import {
  ListChecks,
  AlertTriangle,
  Search,
  Calendar,
  User,
  Filter,
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
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { supabase } from '../../lib/supabase'
import { mapError } from '../../lib/error-mapper'
import { formatBRL } from '../../lib/format'
import { cn } from '../../lib/cn'

interface MagnataLancamento {
  id: string
  data: string
  descricao: string
  valor: number
  natureza: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
  estornado: boolean
  is_estorno: boolean
  conciliado_em: string | null
  responsavel_id: string
  responsavel_nome: string | null
  empresa_nome: string | null
  conta_origem_apelido: string | null
  conta_destino_apelido: string | null
  fornecedor_nome: string | null
  fornecedor_texto: string | null
  centro_custo_codigo: string | null
}

interface ResponsavelOption {
  id: string
  nome: string
}

function defaultDateRange(): { inicio: string; fim: string } {
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  const fmt = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { inicio: fmt(inicio), fim: fmt(fim) }
}

const responsaveisQuery = queryOptions({
  queryKey: ['magnata', 'responsaveis'] as const,
  queryFn: async (): Promise<ResponsavelOption[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome_completo')
      .order('nome_completo', { ascending: true })
    if (error) throw error
    return (data ?? []).map((p) => ({
      id: p.id,
      nome: p.nome_completo,
    }))
  },
  staleTime: 5 * 60_000,
})

interface FilterState {
  inicio: string
  fim: string
  responsavelId: string
  busca: string
  natureza: 'all' | 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
}

function buildLancamentosQuery(filters: FilterState) {
  return queryOptions({
    queryKey: ['magnata', 'lancamentos_drill', filters] as const,
    queryFn: async (): Promise<MagnataLancamento[]> => {
      let q = supabase
        .from('lancamentos')
        .select(
          `id, data, descricao, valor, natureza, motivo_estorno, estorno_de_id, conciliado_em, responsavel_id,
           responsavel:profiles!lancamentos_responsavel_id_profiles_fkey(nome_completo),
           tipo:tipos_operacao(empresa:empresas(razao_social, nome_fantasia)),
           origem:contas_bancarias!lancamentos_conta_origem_id_fkey(apelido),
           destino:contas_bancarias!lancamentos_conta_destino_id_fkey(apelido),
           fornecedor:fornecedores_clientes(nome),
           fornecedor_cliente_texto,
           centro:centros_de_custo(codigo)`,
        )
        .gte('data', filters.inicio)
        .lte('data', filters.fim)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500)

      if (filters.responsavelId) q = q.eq('responsavel_id', filters.responsavelId)
      if (filters.natureza !== 'all') {
        // O enum natureza_lancamento aceita TRANSFERENCIA mas o tipo gerado
        // restringe — cast para o overload genérico do .eq
        q = q.eq('natureza', filters.natureza as 'ENTRADA' | 'SAIDA')
      }

      const { data, error } = await q
      if (error) throw error

      type RawLanc = {
        id: string
        data: string
        descricao: string
        valor: number | string
        natureza: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
        motivo_estorno: string | null
        estorno_de_id: string | null
        conciliado_em: string | null
        responsavel_id: string
        fornecedor_cliente_texto: string | null
        responsavel: { nome_completo: string } | null
        tipo: {
          empresa: { razao_social: string; nome_fantasia: string | null } | null
        } | null
        origem: { apelido: string } | null
        destino: { apelido: string } | null
        fornecedor: { nome: string } | null
        centro: { codigo: string } | null
      }
      const raw = (data ?? []) as unknown as RawLanc[]

      const rows = raw.map((r): MagnataLancamento => {
        const empresa = r.tipo?.empresa
          ? (r.tipo.empresa.nome_fantasia ?? r.tipo.empresa.razao_social)
          : null
        return {
          id: r.id,
          data: r.data,
          descricao: r.descricao,
          valor: Number(r.valor),
          natureza: r.natureza,
          estornado: r.motivo_estorno !== null,
          is_estorno: r.estorno_de_id !== null,
          conciliado_em: r.conciliado_em,
          responsavel_id: r.responsavel_id,
          responsavel_nome: r.responsavel?.nome_completo ?? null,
          empresa_nome: empresa,
          conta_origem_apelido: r.origem?.apelido ?? null,
          conta_destino_apelido: r.destino?.apelido ?? null,
          fornecedor_nome: r.fornecedor?.nome ?? null,
          fornecedor_texto: r.fornecedor_cliente_texto,
          centro_custo_codigo: r.centro?.codigo ?? null,
        }
      })

      if (filters.busca.trim()) {
        const needle = filters.busca.trim().toLowerCase()
        return rows.filter((row) =>
          [
            row.descricao,
            row.responsavel_nome,
            row.empresa_nome,
            row.fornecedor_nome,
            row.fornecedor_texto,
            row.centro_custo_codigo,
            row.conta_origem_apelido,
            row.conta_destino_apelido,
          ]
            .filter(Boolean)
            .some((s) => s!.toLowerCase().includes(needle)),
        )
      }
      return rows
    },
    staleTime: 30_000,
  })
}

export function MagnataLancamentosPage(): React.ReactElement {
  const [filters, setFilters] = React.useState<FilterState>(() => ({
    ...defaultDateRange(),
    responsavelId: '',
    busca: '',
    natureza: 'all',
  }))

  const respQ = useQuery(responsaveisQuery)
  const lancQ = useQuery(buildLancamentosQuery(filters))

  const errorDescription = lancQ.error
    ? mapError(lancQ.error).description
    : null

  const totals = React.useMemo(() => {
    const list = lancQ.data ?? []
    let entradas = 0
    let saidas = 0
    let transferencias = 0
    for (const l of list) {
      if (l.estornado) continue
      if (l.natureza === 'ENTRADA') entradas += l.valor
      else if (l.natureza === 'SAIDA') saidas += l.valor
      else if (l.natureza === 'TRANSFERENCIA') transferencias += l.valor
    }
    return { entradas, saidas, transferencias, count: list.length }
  }, [lancQ.data])

  const update = (patch: Partial<FilterState>): void =>
    setFilters((prev) => ({ ...prev, ...patch }))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Magnata"
        title="Detalhamento de Lançamentos"
        description="Drill-down por data, responsável, natureza e empresa."
      />

      {errorDescription ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar lançamentos</AlertTitle>
          <AlertDescription>{errorDescription}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Filtros</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Combine intervalo, responsável e busca livre. Limite de 500 linhas
              por consulta.
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amb-400/10 text-amb-500 dark:text-amb-300">
            <Filter className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="ml-inicio" className="text-xs">
                <Calendar className="mr-1 inline h-3 w-3" /> Início
              </Label>
              <Input
                id="ml-inicio"
                type="date"
                value={filters.inicio}
                onChange={(e) => update({ inicio: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ml-fim" className="text-xs">
                <Calendar className="mr-1 inline h-3 w-3" /> Fim
              </Label>
              <Input
                id="ml-fim"
                type="date"
                value={filters.fim}
                onChange={(e) => update({ fim: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ml-resp" className="text-xs">
                <User className="mr-1 inline h-3 w-3" /> Responsável
              </Label>
              <Select
                value={filters.responsavelId || 'all'}
                onValueChange={(v) =>
                  update({ responsavelId: v === 'all' ? '' : v })
                }
              >
                <SelectTrigger id="ml-resp">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os responsáveis</SelectItem>
                  {(respQ.data ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ml-nat" className="text-xs">
                Natureza
              </Label>
              <Select
                value={filters.natureza}
                onValueChange={(v) =>
                  update({ natureza: v as FilterState['natureza'] })
                }
              >
                <SelectTrigger id="ml-nat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="ENTRADA">Entrada</SelectItem>
                  <SelectItem value="SAIDA">Saída</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ml-busca" className="text-xs">
                <Search className="mr-1 inline h-3 w-3" /> Busca livre
              </Label>
              <Input
                id="ml-busca"
                placeholder="Descrição, fornecedor, conta…"
                value={filters.busca}
                onChange={(e) => update({ busca: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryStat label="Lançamentos" value={String(totals.count)} />
        <SummaryStat
          label="Entradas"
          value={formatBRL(totals.entradas)}
          tone="success"
        />
        <SummaryStat
          label="Saídas"
          value={formatBRL(totals.saidas)}
          tone="destructive"
        />
        <SummaryStat
          label="Transferências"
          value={formatBRL(totals.transferencias)}
          tone="info"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Ordenado do mais recente para o mais antigo.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {lancQ.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (lancQ.data ?? []).length === 0 ? (
            <div className="flex h-[200px] items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
              <div>
                <ListChecks className="mx-auto mb-2 h-6 w-6 opacity-60" />
                Nenhum lançamento encontrado para os filtros atuais.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Data</th>
                    <th className="px-3 py-2 font-medium">Responsável</th>
                    <th className="px-3 py-2 font-medium">Empresa</th>
                    <th className="px-3 py-2 font-medium">Descrição</th>
                    <th className="px-3 py-2 font-medium">Conta</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(lancQ.data ?? []).map((row) => (
                    <LancamentoRow key={row.id} row={row} />
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

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'success' | 'destructive' | 'info'
}): React.ReactElement {
  const colorClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'destructive'
        ? 'text-destructive'
        : tone === 'info'
          ? 'text-blu-600'
          : 'text-foreground'
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            'mt-1 text-xl font-semibold tabular-nums',
            colorClass,
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function LancamentoRow({
  row,
}: {
  row: MagnataLancamento
}): React.ReactElement {
  const naturezaColor =
    row.natureza === 'ENTRADA'
      ? 'text-success'
      : row.natureza === 'SAIDA'
        ? 'text-destructive'
        : 'text-blu-600'
  const conta =
    row.natureza === 'TRANSFERENCIA'
      ? `${row.conta_origem_apelido ?? '—'} → ${row.conta_destino_apelido ?? '—'}`
      : (row.conta_origem_apelido ?? row.conta_destino_apelido ?? '—')
  return (
    <tr className="border-t hover:bg-muted/20">
      <td className="px-3 py-2 tabular-nums text-xs">
        {formatDate(row.data)}
      </td>
      <td className="px-3 py-2 text-xs">{row.responsavel_nome ?? '—'}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {row.empresa_nome ?? '—'}
      </td>
      <td className="px-3 py-2">
        <p className="line-clamp-1 max-w-md text-sm">{row.descricao}</p>
        {row.fornecedor_nome || row.fornecedor_texto ? (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {row.fornecedor_nome ?? row.fornecedor_texto}
          </p>
        ) : null}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{conta}</td>
      <td className={cn('px-3 py-2 text-right font-semibold tabular-nums', naturezaColor)}>
        {row.natureza === 'SAIDA' ? '−' : ''}
        {formatBRL(row.valor)}
      </td>
      <td className="px-3 py-2">
        {row.estornado ? (
          <Badge variant="destructive">Estornado</Badge>
        ) : row.conciliado_em ? (
          <Badge variant="success">Conciliado</Badge>
        ) : (
          <Badge variant="warning">Pendente</Badge>
        )}
      </td>
    </tr>
  )
}

function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default MagnataLancamentosPage
