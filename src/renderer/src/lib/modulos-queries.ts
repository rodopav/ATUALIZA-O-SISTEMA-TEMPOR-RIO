import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Enums } from '../../../shared/database.types'

export type ModuloApp = Enums<'modulo_app'>

export const modulosKeys = {
  meus: ['modulos', 'meus'] as const,
}

/**
 * Lista os módulos que o usuário corrente pode visualizar.
 *
 * Resolução no servidor:
 * - `is_superadmin = true` → recebe todos os módulos.
 * - `role = 'admin_financeiro'` → recebe todos os módulos (inclusive
 *   `magnata_dashboard` se `is_magnata = true`).
 * - usuário comum → recebe apenas os módulos presentes em `user_modulos`.
 *
 * Cache curto + Realtime: mudanças do admin no IAM invalidam o cache
 * imediatamente via subscription a `user_modulos` (use-modulos-realtime).
 * Stale baixo garante refetch ao trocar de aba/janela.
 */
export const meusModulosQuery = queryOptions({
  queryKey: modulosKeys.meus,
  queryFn: async (): Promise<Set<ModuloApp>> => {
    const { data, error } = await supabase.rpc('meus_modulos')
    if (error) throw error
    const list = (data ?? []) as { modulo: ModuloApp }[] | ModuloApp[]
    // A função pode retornar `setof modulo_app` (string[]) ou
    // `setof record(modulo modulo_app)` (objetos). Normalizamos.
    const out = new Set<ModuloApp>()
    for (const item of list) {
      if (typeof item === 'string') {
        out.add(item as ModuloApp)
      } else if (item && typeof item === 'object' && 'modulo' in item) {
        out.add((item as { modulo: ModuloApp }).modulo)
      }
    }
    return out
  },
  staleTime: 0,
  refetchOnWindowFocus: true,
  refetchOnMount: 'always',
})

/**
 * Helper síncrono para verificação inline em listas/filtros.
 */
export function temAcessoModulo(
  modulos: Set<ModuloApp> | ModuloApp[] | null | undefined,
  modulo: ModuloApp,
): boolean {
  if (!modulos) return false
  if (modulos instanceof Set) return modulos.has(modulo)
  return modulos.includes(modulo)
}
