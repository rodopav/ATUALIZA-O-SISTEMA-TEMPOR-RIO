// Loaders compartilhados entre os 3 modos do app (user/admin/magnata).

import { redirect, type LoaderFunctionArgs } from 'react-router-dom'
import { useAuthStore } from './lib/auth-store'
import { supabase } from './lib/supabase'
import { APP_MODE as APP_MODE_VALUE } from './lib/app-mode'
import type { Enums } from '../../shared/database.types'

export type ModuloApp = Enums<'modulo_app'>

export const APP_MODE = APP_MODE_VALUE

async function ensureHydrated(): Promise<void> {
  const { hydrated, hydrate } = useAuthStore.getState()
  if (!hydrated) await hydrate()
}

export async function requireAuth(_args: LoaderFunctionArgs): Promise<null> {
  await ensureHydrated()
  const { session } = useAuthStore.getState()
  if (!session) throw redirect('/login')
  return null
}

export async function requireAdmin(args: LoaderFunctionArgs): Promise<null> {
  await requireAuth(args)
  const { isAdmin } = useAuthStore.getState()
  if (!isAdmin) throw redirect('/acesso-negado')
  return null
}

export async function requireSuperadmin(
  args: LoaderFunctionArgs,
): Promise<null> {
  await requireAuth(args)
  const { isSuperadmin } = useAuthStore.getState()
  if (!isSuperadmin) throw redirect('/acesso-negado')
  return null
}

export async function requireMagnata(
  args: LoaderFunctionArgs,
): Promise<null> {
  await requireAuth(args)
  const { profile, isSuperadmin } = useAuthStore.getState()
  if (isSuperadmin) return null
  if (!profile?.is_magnata) {
    throw redirect('/acesso-negado')
  }
  return null
}

/**
 * Loader genérico que exige acesso a um módulo específico. Admin financeiro
 * e superadmin têm bypass automático.
 */
export function requireModulo(modulo: ModuloApp) {
  return async (args: LoaderFunctionArgs): Promise<null> => {
    await requireAuth(args)
    const { isAdmin, isSuperadmin } = useAuthStore.getState()
    if (isAdmin || isSuperadmin) return null
    const { data, error } = await supabase.rpc('pode_ver_modulo', {
      p_modulo: modulo,
    })
    if (error) throw redirect('/acesso-negado')
    if (!data) throw redirect('/acesso-negado')
    return null
  }
}

export async function publicOnly(_args: LoaderFunctionArgs): Promise<null> {
  await ensureHydrated()
  const { session } = useAuthStore.getState()
  if (session) {
    throw redirect(
      APP_MODE === 'admin'
        ? '/iam/usuarios'
        : APP_MODE === 'magnata'
          ? '/magnata'
          : '/dashboard',
    )
  }
  return null
}
