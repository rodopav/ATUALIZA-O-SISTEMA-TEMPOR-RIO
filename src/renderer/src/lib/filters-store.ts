// Store persistente (sessionStorage) com os filtros aplicados em cada
// página. Frank pediu: filtros NÃO somem ao navegar — só quando o
// usuário clica em "Limpar filtros".
//
// Uso:
//   const filters = usePageFilters('lancamentos', DEFAULT_LANCAMENTOS_FILTERS)
//   filters.value          // objeto atual
//   filters.replace(next)  // substitui inteiro
//   filters.set(parcial)   // merge parcial
//   filters.reset()        // volta pro default

import * as React from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type PageKey =
  | 'lancamentos'
  | 'conciliacao'
  | 'saldo_geral'
  | 'conferencia'
  | 'centros_custo'
  | 'dashboard'

interface FiltersState {
  byPage: Record<string, unknown>
  setPage: (key: PageKey, value: unknown) => void
  reset: (key: PageKey) => void
  resetAll: () => void
}

const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      byPage: {},
      setPage(key, value) {
        set((s) => ({ byPage: { ...s.byPage, [key]: value } }))
      },
      reset(key) {
        set((s) => {
          const next = { ...s.byPage }
          delete next[key]
          return { byPage: next }
        })
      },
      resetAll() {
        set({ byPage: {} })
      },
    }),
    {
      name: 'rodopav.filters.v1',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)

export function usePageFilters<T extends object>(
  key: PageKey,
  defaults: T,
): {
  value: T
  set: (partial: Partial<T>) => void
  replace: (next: T) => void
  reset: () => void
} {
  const stored = useFiltersStore((s) => s.byPage[key]) as T | undefined
  const setPage = useFiltersStore((s) => s.setPage)

  // O `value` é o que está no store OU o default (se nada salvo).
  // Não escrevo defaults no store na montagem — economiza render.
  const value = (stored ?? defaults) as T

  // Usamos refs pra estabilizar a callback set (não depende de `value` direto)
  const valueRef = React.useRef(value)
  valueRef.current = value

  const set = React.useCallback(
    (partial: Partial<T>) => {
      setPage(key, { ...valueRef.current, ...partial })
    },
    [key, setPage],
  )

  const replace = React.useCallback(
    (next: T) => {
      setPage(key, next)
    },
    [key, setPage],
  )

  const defaultsRef = React.useRef(defaults)
  defaultsRef.current = defaults

  const reset = React.useCallback(() => {
    setPage(key, defaultsRef.current)
  }, [key, setPage])

  return { value, set, replace, reset }
}

/** Exposto pra logout limpar tudo. */
export function resetAllFilters(): void {
  useFiltersStore.getState().resetAll()
}
