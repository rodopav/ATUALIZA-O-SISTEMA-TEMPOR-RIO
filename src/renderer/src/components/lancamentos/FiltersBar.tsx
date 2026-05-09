import * as React from 'react'
import { CalendarRange, Filter, Search } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
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
  natureza: 'ENTRADA' | 'SAIDA' | null
  centroCustoId: string | null
  search: string
}

export function defaultFilters(): LancamentosFiltersState {
  const now = new Date()
  const periodoMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return {
    periodoMonth,
    natureza: null,
    centroCustoId: null,
    search: '',
  }
}

interface FiltersBarProps {
  value: LancamentosFiltersState
  onChange: (next: LancamentosFiltersState) => void
  centrosCusto: CentroCusto[]
}

const NATUREZA_CHIPS: Array<{
  key: 'ALL' | 'ENTRADA' | 'SAIDA'
  label: string
}> = [
  { key: 'ALL', label: 'Todas' },
  { key: 'ENTRADA', label: 'Entradas' },
  { key: 'SAIDA', label: 'Saídas' },
]

export function FiltersBar({
  value,
  onChange,
  centrosCusto,
}: FiltersBarProps): React.ReactElement {
  const naturezaActive = value.natureza ?? 'ALL'
  return (
    <Card>
      <CardContent className="grid gap-4 p-5 lg:grid-cols-12">
        <div className="space-y-2 lg:col-span-3">
          <Label
            htmlFor="periodo-filter"
            className="flex items-center gap-1.5"
          >
            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
            Período
          </Label>
          <Input
            id="periodo-filter"
            type="month"
            value={value.periodoMonth}
            onChange={(e) =>
              onChange({ ...value, periodoMonth: e.target.value })
            }
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
          <Label htmlFor="centro-filter">Centro de custo</Label>
          <Select
            value={value.centroCustoId ?? ALL_VALUE}
            onValueChange={(v) =>
              onChange({
                ...value,
                centroCustoId: v === ALL_VALUE ? null : v,
              })
            }
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
          <Label htmlFor="search-filter">Busca</Label>
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
      </CardContent>
    </Card>
  )
}
