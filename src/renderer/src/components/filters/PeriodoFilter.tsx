import * as React from 'react'
import { CalendarRange, Calendar } from 'lucide-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { cn } from '../../lib/cn'

export type PeriodoMode = 'mes' | 'intervalo'

export interface PeriodoFilterValue {
  mode: PeriodoMode
  /** YYYY-MM-DD do dia 1 do mês quando mode=mes. */
  mesIso: string
  /** YYYY-MM-DD quando mode=intervalo. */
  dataInicio: string
  dataFim: string
}

interface PeriodoFilterProps {
  value: PeriodoFilterValue
  onChange: (v: PeriodoFilterValue) => void
  /** Label opcional acima do campo. Default: "Período". */
  label?: string
  className?: string
}

/**
 * Filtro de período com dois modos:
 * - "Mês": picker de mês/ano
 * - "Intervalo": dois campos de data (de — até)
 *
 * Os dois valores ficam guardados ao mesmo tempo no state — quando você
 * troca o modo, o valor do outro modo é preservado.
 */
export function PeriodoFilter({
  value,
  onChange,
  label = 'Período',
  className,
}: PeriodoFilterProps): React.ReactElement {
  const handleMode = (mode: PeriodoMode): void => {
    onChange({ ...value, mode })
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5">
          <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
          {label}
        </Label>
        <div className="inline-flex h-7 items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5 text-xs">
          <ModeBtn
            active={value.mode === 'mes'}
            onClick={() => handleMode('mes')}
            label="Mês"
            icon={<Calendar className="h-3 w-3" />}
          />
          <ModeBtn
            active={value.mode === 'intervalo'}
            onClick={() => handleMode('intervalo')}
            label="Intervalo"
            icon={<CalendarRange className="h-3 w-3" />}
          />
        </div>
      </div>

      {value.mode === 'mes' ? (
        <Input
          type="month"
          value={value.mesIso.slice(0, 7)}
          onChange={(e) => {
            const v = e.target.value
            if (/^\d{4}-\d{2}$/.test(v)) {
              onChange({ ...value, mesIso: `${v}-01` })
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={value.dataInicio}
            max={value.dataFim || undefined}
            onChange={(e) =>
              onChange({ ...value, dataInicio: e.target.value })
            }
            aria-label="Data início"
          />
          <Input
            type="date"
            value={value.dataFim}
            min={value.dataInicio || undefined}
            onChange={(e) => onChange({ ...value, dataFim: e.target.value })}
            aria-label="Data fim"
          />
        </div>
      )}
    </div>
  )
}

function ModeBtn({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded px-1.5 transition-colors',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-background hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

/**
 * Pega o intervalo concreto (start, end exclusivo) a partir do filtro,
 * pronto pra usar em supabase `.gte('data', start).lt('data', end)`.
 */
export function periodoBounds(
  v: PeriodoFilterValue,
): { start: string; endExclusive: string } | null {
  if (v.mode === 'intervalo') {
    if (!v.dataInicio || !v.dataFim) return null
    return { start: v.dataInicio, endExclusive: nextDay(v.dataFim) }
  }
  // mês
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.mesIso)) return null
  const [y, m] = v.mesIso.split('-').map((s) => Number.parseInt(s, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null
  const start = `${v.mesIso.slice(0, 7)}-01`
  const startDate = new Date(y!, m! - 1, 1)
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)
  const endIso = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-01`
  return { start, endExclusive: endIso }
}

function nextDay(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-').map((s) => Number.parseInt(s, 10))
  const next = new Date(y!, m! - 1, (d ?? 0) + 1)
  const yy = next.getFullYear()
  const mm = String(next.getMonth() + 1).padStart(2, '0')
  const dd = String(next.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Cria o valor inicial default (mês atual). */
export function defaultPeriodoValue(currentMesIso: string): PeriodoFilterValue {
  return {
    mode: 'mes',
    mesIso: currentMesIso,
    dataInicio: '',
    dataFim: '',
  }
}

/** Resume o filtro como string pra exibir em label/CSV. */
export function formatPeriodoFilter(v: PeriodoFilterValue): string {
  if (v.mode === 'intervalo' && v.dataInicio && v.dataFim) {
    return `${brDate(v.dataInicio)} a ${brDate(v.dataFim)}`
  }
  return formatMesPtBr(v.mesIso)
}

function brDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatMesPtBr(iso: string): string {
  if (!/^\d{4}-\d{2}/.test(iso)) return iso
  const [y, m] = iso.split('-').map((s) => Number.parseInt(s, 10))
  const meses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  return `${meses[(m ?? 1) - 1] ?? ''}/${y ?? ''}`.trim()
}
