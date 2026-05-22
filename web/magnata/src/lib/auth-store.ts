import * as React from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface ProfileInfo {
  id: string
  nome_completo: string
  is_magnata: boolean
  is_superadmin: boolean
  role: string | null
  ativo: boolean
}

interface AuthState {
  loading: boolean
  user: User | null
  session: Session | null
  profile: ProfileInfo | null
  /** Erro fatal ao carregar perfil. App.tsx mostra mensagem de erro em vez de spinner infinito. */
  profileError: string | null
}

const AuthContext = React.createContext<AuthState>({
  loading: true,
  user: null,
  session: null,
  profile: null,
  profileError: null,
})

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, setState] = React.useState<AuthState>({
    loading: true,
    user: null,
    session: null,
    profile: null,
    profileError: null,
  })

  const loadProfile = React.useCallback(
    async (userId: string): Promise<{ profile: ProfileInfo | null; error: string | null }> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nome_completo, is_magnata, is_superadmin, role, ativo')
          .eq('id', userId)
          .single()
        if (error) {
          // PostgREST 401/JWT expired → não é erro fatal, espera refresh
          if (error.code === 'PGRST301' || error.message.includes('JWT')) {
            return { profile: null, error: null }
          }
          return { profile: null, error: error.message }
        }
        if (!data) return { profile: null, error: 'Perfil não encontrado' }
        return { profile: data as unknown as ProfileInfo, error: null }
      } catch (e) {
        return { profile: null, error: e instanceof Error ? e.message : String(e) }
      }
    },
    [],
  )

  React.useEffect(() => {
    let mounted = true

    const setSafely = (next: AuthState): void => {
      if (mounted) setState(next)
    }

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!mounted) return
        if (error) {
          setSafely({ loading: false, session: null, user: null, profile: null, profileError: null })
          return
        }
        if (data.session?.user) {
          const { profile, error: profErr } = await loadProfile(data.session.user.id)
          setSafely({
            loading: false,
            session: data.session,
            user: data.session.user,
            profile,
            profileError: profErr,
          })
        } else {
          setSafely({ loading: false, session: null, user: null, profile: null, profileError: null })
        }
      } catch (e) {
        // Garante que NUNCA fica preso em loading=true
        console.error('[auth] getSession falhou:', e)
        setSafely({
          loading: false,
          session: null,
          user: null,
          profile: null,
          profileError: e instanceof Error ? e.message : String(e),
        })
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      // TOKEN_REFRESHED não precisa re-load profile, só atualiza session
      if (event === 'TOKEN_REFRESHED' && session) {
        setState((prev) => ({ ...prev, session, user: session.user }))
        return
      }
      if (session?.user) {
        const { profile, error: profErr } = await loadProfile(session.user.id)
        if (!mounted) return
        setState({
          loading: false,
          session,
          user: session.user,
          profile,
          profileError: profErr,
        })
      } else {
        if (!mounted) return
        setState({ loading: false, session: null, user: null, profile: null, profileError: null })
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  return React.createElement(AuthContext.Provider, { value: state }, children)
}

export function useAuth(): AuthState {
  return React.useContext(AuthContext)
}

export async function signIn(email: string, senha: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
