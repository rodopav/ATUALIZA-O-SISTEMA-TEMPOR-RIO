import * as React from 'react'
import {
  CalendarRange,
  Filter,
  Search,
  Building2,
  User,
  Wallet,
  Tag,
  ArrowRightLeft,
  CheckCircle2,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { cn } from '../../lib/cn'
import type { CentroCusto } from '../../lib/queries'

const ALL_VALUE = '__all__'

export interface LancamentosFiltersState {
  /** YYYY-MM (input[type=month]) — converted to YYYY-MM-01 in the query. */
  periodoMonth: string
  /** Intervalo custom (sobrepõe periodoMonth quando os 2 estão preenchidos). */
  dataInicio: string
  dataFim: string
  natureza: 'ENTRADA' | 'SAIDA' | null
  centroCustoId: string | null
  contaId: string | null
  responsavelId: string | null
  fornecedorId: string | null
  tipoOperacaoId: string | null
  status: 'all' | 'conciliado' | 'pendente' | 'estornado'
  valorMin: string
  valorMax: string
  search: string
}

export function defaultFilters(): LancamentosFiltersState {
  const now = new Date()
  const periodoMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return {
    periodoMonth,
    dataInicio: '',
    dataFim: '',
    natureza: null,
    centroCustoId: null,
    contaId: null,
    responsavelId: null,
    fornecedorId: null,
    tipoOperacaoId: null,
    status: 'all',
    valorMin: '',
    valorMax: '',
    search: '',
  }
}

export interface FilterOption {
  id: string
  label: string
}

interface FiltersBarProps {
  value: LancamentosFiltersState
  onChange: (next: LancamentosFiltersState) => void
  centrosCusto: CentroCusto[]
  contas: FilterOption[]
  responsaveis: FilterOption[]
  fornecedores: FilterOption[]
  tiposOperacao: FilterOption[]
}

const NATUREZA_CHIPS: Array<{
  key: 'ALL' | 'ENTRADA' | 'SAIDA'
  label: string
}> = [
  { key: 'ALL', label: 'Todas' },
  { key: 'ENTRADA', label: 'Entradas' },
  { key: 'SAIDA', label: 'Saídas' },
]

const STATUS_OPTIONS: Array<{ key: LancamentosFiltersState['status']; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'conciliado', label: 'Conciliados' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'estornado', label: 'Estornados' },
]

function countActiveAdvanced(value: LancamentosFiltersState): number {
  let n = 0
  if (value.dataInicio || value.dataFim) n++
  if (value.contaId) n++
  if (value.responsavelId) n++
  if (value.fornecedorId) n++
  if (value.tipoOperacaoId) n++
  if (value.status !== 'all') n++
  if (value.valorMin) n++
  if (value.valorMax) n++
  return n
}

export function FiltersBar({
  value,
  onChange,
  centrosCusto,
  contas,
  responsaveis,
  fornecedores,
  tiposOperacao,
}: FiltersBarProps): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false)
  const naturezaActive = value.natureza ?? 'ALL'
  const advancedCount = countActiveAdvanced(value)

  const setSelect = (
    key: keyof LancamentosFiltersState,
  ): ((v: string) => void) => {
    return (v: string) =>
      onChange({
        ...value,
        [key]: v === ALL_VALUE ? null : v,
      } as LancamentosFiltersState)
  }

  const handleReset = (): void => onChange(defaultFilters())

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        {/* LINHA 1 — sempre visível: Período, Natureza, Centro, Busca */}
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-2 lg:col-span-3">
            <Label
              htmlFor="periodo-filter"
              className="flex items-center gap-1.5"
            >
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
              Período (mês)
            </Label>
            <Input
              id="periodo-filter"
              type="month"
              value={value.periodoMonth}
              onChange={(e) =>
                onChange({ ...value, periodoMonth: e.target.value })
              }
              disabled={Boolean(value.dataInicio || value.dataFim)}
            />
          </div>

          <div className="space-y-2 lg:col-span-4">
            <Label className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              Natureza
            </Label>
            <div className="inline-flex h-10 w-full items-center gap-1 rounded-md border bg-background p-1 shadow-sm">
              {NATUREZA_CHIPS.map((chip) => {
                const active = naturezaActive === chip.key
                return (
                  <button
                    type="button"
                    key={chip.key}
                    onClick={() =>
                      onChange({
                        ...value,
                        natureza: chip.key === 'ALL' ? null : chip.key,
                      })
                    }
                    className={cn(
                      'flex-1 rounded-sm px-3 py-1.5 text-xs font-medium transition-all',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {chip.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2 lg:col-span-3">
            <Label htmlFor="centro-filter" className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              Centro de custo
            </Label>
            <Select
              value={value.centroCustoId ?? ALL_VALUE}
              onValueChange={setSelect('centroCustoId')}
            >
              <SelectTrigger id="centro-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                {centrosCusto.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="search-filter" className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              Busca
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search-filter"
                placeholder="Descrição…"
                value={value.search}
                onChange={(e) => onChange({ ...value, search: e.target.value })}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* TOGGLE / RESET */}
        <div className="flex items-center justify-between border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            Filtros avançados
            {advancedCount > 0 ? (
              <span className="ml-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground tabular-nums">
                {advancedCount}
              </span>
            ) : null}
          </Button>
          {advancedCount > 0 || value.natureza || value.centroCustoId || value.search ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar filtros
            </Button>
          ) : null}
        </div>

        {/* LINHA 2 — avançados (colapsável): Datas custom, Banco, Responsável, Fornecedor, Tipo, Status, Valor */}
        {expanded ? (
          <div className="space-y-4 border-t pt-4">
            <div className="grid gap-4 lg:grid-cols-12">
              {/* Intervalo custom de datas */}
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="data-inicio" className="flex items-center gap-1.5">
                  <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                  De
                </Label>
                <div className="relative">
                  <Input
                    id="data-inicio"
                    type="date"
                    value={value.dataInicio}
                    onChange={(e) =>
                      onChange({ ...value, dataInicio: e.target.value })
                    }
                  />
                  {value.dataInicio ? (
                    <button
                      type="button"
                      onClick={() => onChange({ ...value, dataInicio: '' })}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Limpar data início"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="data-fim" className="flex items-center gap-1.5">
                  <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                  Até
                </Label>
                <div className="relative">
                  <Input
                    id="data-fim"
                    type="date"
                    value={value.dataFim}
                    onChange={(e) =>
                      onChange({ ...value, dataFim: e.target.value })
                    }
                  />
                  {value.dataFim ? (
                    <button
                      type="button"
                      onClick={() => onChange({ ...value, dataFim: '' })}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Limpar data fim"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Banco / Conta */}
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="conta-filter" className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                  Banco / Conta
                </Label>
                <Select
                  value={value.contaId ?? ALL_VALUE}
                  onValueChange={setSelect('contaId')}
                >
                  <SelectTrigger id="conta-filter">
                    <SelectValue placeholder="Todas as contas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Todas as contas</SelectItem>
                    {contas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Responsável */}
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="resp-filter" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Responsável
                </Label>
                <Select
                  value={value.responsavelId ?? ALL_VALUE}
                  onValueChange={setSelect('responsavelId')}
                >
                  <SelectTrigger id="resp-filter">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                    {responsaveis.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
              {/* Fornecedor */}
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="fornec-filter" className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Fornecedor
                </Label>
                <Select
                  value={value.fornecedorId ?? ALL_VALUE}
                  onValueChange={setSelect('fornecedorId')}
                >
                  <SelectTrigger id="fornec-filter">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de operação */}
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="tipo-filter" className="flex items-center gap-1.5">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                  Tipo de operação
                </Label>
                <Select
                  value={value.tipoOperacaoId ?? ALL_VALUE}
                  onValueChange={setSelect('tipoOperacaoId')}
                >
                  <SelectTrigger id="tipo-filter">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                    {tiposOperacao.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status conciliação */}
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="status-filter" className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Status
                </Label>
                <Select
                  value={value.status}
                  onValueChange={(v) =>
                    onChange({
                      ...value,
                      status: v as LancamentosFiltersState['status'],
                    })
                  }
                >
                  <SelectTrigger id="status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.key} value={o.key}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Faixa de valor */}
              <div className="space-y-2 lg:col-span-3">
                <Label className="flex items-center gap-1.5">
                  Valor (R$)
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Mín"
                    value={value.valorMin}
                    onChange={(e) =>
                      onChange({ ...value, valorMin: e.target.value })
                    }
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Máx"
                    value={value.valorMax}
                    onChange={(e) =>
                      onChange({ ...value, valorMax: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
