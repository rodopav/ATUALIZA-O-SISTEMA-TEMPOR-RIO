// Tab/janela store estilo navegador. Cada vez que o usuário navega
// pra uma rota nova, abrimos uma "tab" persistente. Trocar de tab
// só faz navigate(); fechar remove e leva pra próxima.
//
// Persistido em sessionStorage (por janela): se o usuário relança o
// app, ele volta com as tabs daquela sessão.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AppTab {
  /** Pathname completo — é o id da tab. */
  path: string
  /** Texto exibido na pill. */
  label: string
  /** Nome do ícone Lucide (resolvido em runtime, JSON-safe). */
  iconName: string
}

interface TabsState {
  tabs: AppTab[]
  /** Última vez visitada (millis), pra ordenar o switcher. */
  lastVisitedAt: Record<string, number>
  /** Garante que existe uma tab pro path. Não troca rota. */
  ensureTab: (tab: AppTab) => void
  /** Remove a tab. Retorna o path da próxima a focar (ou null). */
  closeTab: (path: string) => string | null
  /** Marca que essa tab foi visitada agora. */
  touch: (path: string) => void
  /** Limpa tudo (útil no logout). */
  reset: () => void
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      lastVisitedAt: {},

      ensureTab(tab) {
        const { tabs, lastVisitedAt } = get()
        const exists = tabs.some((t) => t.path === tab.path)
        if (exists) {
          set({
            lastVisitedAt: { ...lastVisitedAt, [tab.path]: Date.now() },
          })
          return
        }
        set({
          tabs: [...tabs, tab],
          lastVisitedAt: { ...lastVisitedAt, [tab.path]: Date.now() },
        })
      },

      closeTab(path) {
        const { tabs, lastVisitedAt } = get()
        const idx = tabs.findIndex((t) => t.path === path)
        if (idx === -1) return null
        const next = tabs.filter((t) => t.path !== path)
        const { [path]: _drop, ...restVisited } = lastVisitedAt
        void _drop
        set({ tabs: next, lastVisitedAt: restVisited })
        if (next.length === 0) return null
        // Preferimos vizinho à direita; se não tiver, à esquerda.
        const neighbor = next[idx] ?? next[idx - 1] ?? next[0]
        return neighbor?.path ?? null
      },

      touch(path) {
        set((s) => ({
          lastVisitedAt: { ...s.lastVisitedAt, [path]: Date.now() },
        }))
      },

      reset() {
        set({ tabs: [], lastVisitedAt: {} })
      },
    }),
    {
      name: 'rodopav.tabs.v1',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
