import * as React from 'react'
import { AlertCircle } from 'lucide-react'
import { formatBRL } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { Tables } from '../../../../shared/database.types'

type Row = Tables<'v_dashboard_centro_custo'>

interface OutliersListProps {
  data: Row[]
  /** Limite de z-score para considerar outlier. */
  threshold?: number
}

interface Outlier {
  nome: string
  saidas: number
  zscore: number
  media: number
  desvio: number
}

/**
 * Identifica centros de custo cujo valor do mês corrente está mais de `threshold`
 * desvios-padrão acima da média histórica do próprio centro.
 */
export function OutliersList({
  data,
  threshold = 3,
}: OutliersListProps): React.ReactElement {
  const outliers = React.useMemo<Outlier[]>(() => {
    if (data.length === 0) return []
    // Agrupa por centro_custo para calcular média/desvio.
    const groups = new Map<string, number[]>()
    for (const r of data) {
      const nome = r.centro_custo ?? r.codigo ?? '—'
      const v = Math.abs(Number(r.saidas ?? 0))
      const arr = groups.get(nome) ?? []
      arr.push(v)
      groups.set(nome, arr)
    }
    const out: Outlier[] = []
    for (const [nome, arr] of groups.entries()) {
      if (arr.length < 3) continue
      const media = arr.reduce((acc, n) => acc + n, 0) / arr.length
      const variancia =
        arr.reduce((acc, n) => acc + Math.pow(n - media, 2), 0) / arr.length
      const desvio = Math.sqrt(variancia)
      const ultimo = arr[arr.length - 1] ?? 0
      const z = desvio > 0 ? (ultimo - media) / desvio : 0
      if (z >= threshold) {
        out.push({ nome, saidas: ultimo, zscore: z, media, desvio })
      }
    }
    return out.sort((a, b) => b.zscore - a.zscore)
  }, [data, threshold])

  if (outliers.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        Nenhum outlier identificado (z-score &lt; {threshold}).
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {outliers.map((o) => (
        <li
          key={o.nome}
          className={cn(
            'flex items-start gap-3 rounded-md border border-amb-400/40 bg-amb-50/60 p-3',
            'dark:bg-amb-400/10',
          )}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amb-500 dark:text-amb-300" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{o.nome}</p>
            <p className="text-xs text-muted-foreground">
              z = {o.zscore.toFixed(2)} · média histórica{' '}
              {formatBRL(o.media)}
            </p>
          </div>
          <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-destructive">
            {formatBRL(o.saidas)}
          </p>
        </li>
      ))}
    </ul>
  )
}
