import * as React from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

const DEBUG = true
function log(...args: unknown[]): void {
  if (DEBUG) console.log('[auth]', ...args)
}

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
        log('loadProfile start', userId)
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nome_completo, is_magnata, is_superadmin, role, ativo')
          .eq('id', userId)
          .single()
        if (error) {
          log('loadProfile error', error)
          if (error.code === 'PGRST301' || error.message.includes('JWT')) {
            return { profile: null, error: null }
          }
          return { profile: null, error: error.message }
        }
        if (!data) return { profile: null, error: 'Perfil não encontrado' }
        log('loadProfile ok', data)
        return { profile: data as unknown as ProfileInfo, error: null }
      } catch (e) {
        log('loadProfile exception', e)
        return { profile: null, error: e instanceof Error ? e.message : String(e) }
      }
    },
    [],
  )

  React.useEffect(() => {
    let mounted = true
    log('AuthProvider mount')

    const setSafely = (next: AuthState): void => {
      if (mounted) {
        log('setState', { loading: next.loading, hasSession: !!next.session, hasProfile: !!next.profile, error: next.profileError })
        setState(next)
      }
    }

    // ★ FAILSAFE: se passar 7s e loading ainda true, força false. Garante
    // que NUNCA fica preso em spinner infinito mesmo se getSession travar.
    const failsafe = setTimeout(() => {
      if (!mounted) return
      log('FAILSAFE: forçando loading=false após 7s')
      setState((prev) =>
        prev.loading
          ? { ...prev, loading: false, profileError: prev.profileError ?? 'Conexão demorou demais (failsafe)' }
          : prev,
      )
    }, 7000)

    void (async () => {
      try {
        log('getSession start')
        const { data, error } = await supabase.auth.getSession()
        log('getSession result', { hasSession: !!data?.session, error })
        if (!mounted) return
        if (error) {
          setSafely({ loading: false, session: null, user: null, profile: null, profileError: error.message })
          return
        }
        if (data.session?.user) {
          const { profile, error: profErr } = await loadProfile(data.session.user.id)
          if (!mounted) return
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
        log('getSession exception', e)
        if (!mounted) return
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
      log('auth event', event, { hasSession: !!session })
      if (!mounted) return
      if (event === 'TOKEN_REFRESHED' && session) {
        setState((prev) => ({ ...prev, session, user: session.user, loading: false }))
        return
      }
      if (event === 'INITIAL_SESSION') {
        // INITIAL_SESSION também dispara — useEffect inicial já cuida disso
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
      log('AuthProvider unmount')
      mounted = false
      clearTimeout(failsafe)
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
  // Defesa: se supabase.auth.signOut() travar (lock interno), apaga
  // localStorage manualmente após 2s e força reload. Garante que o
  // botão "Sair" sempre desloga, mesmo se o client estiver bugado.
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2000))
  try {
    await Promise.race([supabase.auth.signOut(), timeout])
  } catch (e) {
    log('signOut error (ignorado)', e)
  }
  // Garante limpeza local mesmo se signOut do server falhou
  try {
    localStorage.removeItem('rodopav-magnata-auth')
    // Limpa também chaves automáticas que o gotrue cria
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) localStorage.removeItem(k)
    })
  } catch {
    // ignore
  }
  // Reload pra estado limpo
  window.location.href = '/'
}
