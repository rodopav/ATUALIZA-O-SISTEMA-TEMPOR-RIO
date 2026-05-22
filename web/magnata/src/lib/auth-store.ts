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
}

const AuthContext = React.createContext<AuthState>({
  loading: true,
  user: null,
  session: null,
  profile: null,
})

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, setState] = React.useState<AuthState>({
    loading: true,
    user: null,
    session: null,
    profile: null,
  })

  const loadProfile = React.useCallback(async (userId: string): Promise<ProfileInfo | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome_completo, is_magnata, is_superadmin, role, ativo')
      .eq('id', userId)
      .single()
    if (error || !data) return null
    return data as unknown as ProfileInfo
  }, [])

  React.useEffect(() => {
    let mounted = true

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      if (data.session?.user) {
        const profile = await loadProfile(data.session.user.id)
        if (!mounted) return
        setState({ loading: false, session: data.session, user: data.session.user, profile })
      } else {
        setState({ loading: false, session: null, user: null, profile: null })
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      if (session?.user) {
        const profile = await loadProfile(session.user.id)
        if (!mounted) return
        setState({ loading: false, session, user: session.user, profile })
      } else {
        setState({ loading: false, session: null, user: null, profile: null })
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
