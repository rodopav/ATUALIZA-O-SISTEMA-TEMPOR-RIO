import * as React from 'react'
import { Building2, Check } from 'lucide-react'
import { Label } from './ui/label'
import { Skeleton } from './ui/skeleton'
import { cn } from '../lib/cn'
import type { Empresa } from '../lib/queries'

interface EmpresaMultiSelectProps {
  empresas: Empresa[]
  value: string[]
  onChange: (next: string[]) => void
  loading?: boolean
}

export function EmpresaMultiSelect({
  empresas,
  value,
  onChange,
  loading,
}: EmpresaMultiSelectProps): React.ReactElement {
  const toggle = (id: string): void => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        Empresas
        {value.length > 0 ? (
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary tabular-nums">
            {value.length}
          </span>
        ) : null}
      </Label>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-background p-1.5 shadow-sm">
        {loading ? (
          <div className="flex w-full gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
        ) : empresas.length === 0 ? (
          <span className="px-2 text-xs text-muted-foreground">
            Nenhuma empresa cadastrada.
          </span>
        ) : (
          empresas.map((emp) => {
            const selected = value.includes(emp.id)
            return (
              <button
                type="button"
                key={emp.id}
                onClick={() => toggle(emp.id)}
                className={cn(
                  'inline-flex h-7 items-center gap-1 rounded-full px-3 text-xs font-medium transition-all',
                  selected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
              >
                {selected ? <Check className="h-3 w-3" /> : null}
                {emp.nome_fantasia ?? emp.razao_social}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
