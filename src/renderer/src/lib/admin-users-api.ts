// Cliente da Edge Function `admin-users`. Envolve `supabase.functions.invoke`
// e propaga erros em pt-BR. Toda chamada exige sessão de admin financeiro
// (a verificação ocorre no servidor).

import { supabase } from './supabase'
import type { Tables } from '../../../shared/database.types'

export type Profile = Tables<'profiles'>

export interface IamUser {
  id: string
  email: string | null
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  created_at: string
  banned_until: string | null
  profile: Profile | null
}

interface ApiError {
  error: string
}

async function invoke<T>(
  action: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T | ApiError>(
    'admin-users',
    {
      body: { action, payload },
    },
  )
  if (error) {
    throw new Error(error.message || 'Falha ao executar a operação.')
  }
  if (!data) {
    throw new Error('Resposta vazia da Edge Function.')
  }
  if (typeof data === 'object' && data !== null && 'error' in data) {
    throw new Error(String((data as ApiError).error))
  }
  return data as T
}

export interface CreateUserInput {
  email: string
  password: string
  nome_completo: string
  role: 'admin_financeiro' | 'usuario_financeiro'
  is_superadmin?: boolean
  is_magnata?: boolean
}

export interface UpdateUserInput {
  id: string
  role?: 'admin_financeiro' | 'usuario_financeiro'
  ativo?: boolean
  nome_completo?: string
  is_superadmin?: boolean
  is_magnata?: boolean
}

export interface InviteUserInput {
  email: string
  nome_completo?: string
  role: 'admin_financeiro' | 'usuario_financeiro'
}

export interface SetFlagInput {
  id: string
  value: boolean
}

export interface SetModulesInput {
  id: string
  modules: string[]
}

export const adminUsersApi = {
  list(): Promise<IamUser[]> {
    return invoke<{ users: IamUser[] }>('list').then((r) => r.users)
  },
  create(input: CreateUserInput): Promise<{ id: string }> {
    return invoke<{ user: { id: string } }>('create', { ...input }).then(
      (r) => ({ id: r.user.id }),
    )
  },
  update(input: UpdateUserInput): Promise<void> {
    return invoke<{ ok: true }>('update', { ...input }).then(() => undefined)
  },
  delete(id: string): Promise<void> {
    return invoke<{ ok: true }>('delete', { id }).then(() => undefined)
  },
  resetPassword(email: string): Promise<void> {
    return invoke<{ ok: true }>('reset-password', { email }).then(
      () => undefined,
    )
  },
  /** Define uma nova senha sem precisar de email (superadmin escolhe). */
  setPassword(input: { id: string; password: string }): Promise<void> {
    return invoke<{ ok: true }>('set-password', { ...input }).then(
      () => undefined,
    )
  },
  invite(input: InviteUserInput): Promise<void> {
    return invoke<{ user: unknown }>('invite', { ...input }).then(
      () => undefined,
    )
  },
  /** Toggle do flag `is_magnata` (acesso exclusivo ao app Magnata Dashboard). */
  setMagnata(input: SetFlagInput): Promise<void> {
    return invoke<{ ok: true }>('set-magnata', { ...input }).then(
      () => undefined,
    )
  },
  /** Toggle do flag `is_superadmin` (acesso exclusivo ao app IAM/Admin). */
  setSuperadmin(input: SetFlagInput): Promise<void> {
    return invoke<{ ok: true }>('set-superadmin', { ...input }).then(
      () => undefined,
    )
  },
  /** Substitui em massa todos os módulos do usuário. */
  setModules(input: SetModulesInput): Promise<void> {
    return invoke<{ ok: true }>('set-modules', { ...input }).then(
      () => undefined,
    )
  },
  /** Lista os módulos atualmente concedidos ao usuário. */
  getModules(id: string): Promise<string[]> {
    return invoke<{ modules: string[] }>('get-modules', { id }).then(
      (r) => r.modules ?? [],
    )
  },
}

export const adminUsersKeys = {
  all: ['admin', 'users'] as const,
  modules: (id: string) => ['admin', 'users', id, 'modules'] as const,
}
