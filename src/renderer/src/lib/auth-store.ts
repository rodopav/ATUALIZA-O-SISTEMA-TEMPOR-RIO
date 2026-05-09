import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from '../types/profile'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  hydrated: boolean
  isAdmin: boolean
  isSuperadmin: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => Promise<void>
  refreshProfile: () => Promise<void>
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[auth-store] fetchProfile error', error)
    return null
  }
  return data
}

let authSubscription: { unsubscribe: () => void } | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: false,
  hydrated: false,
  isAdmin: false,
  isSuperadmin: false,

  async login(email, password) {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const session = data.session ?? null
      const profile = session ? await fetchProfile(session.user.id) : null
      set({
        session,
        profile,
        isAdmin: profile?.role === 'admin_financeiro',
        isSuperadmin: profile?.is_superadmin === true,
      })
    } finally {
      set({ loading: false })
    }
  },

  async logout() {
    set({ loading: true })
    try {
      await supabase.auth.signOut()
    } finally {
      set({
        session: null,
        profile: null,
        isAdmin: false,
        isSuperadmin: false,
        loading: false,
      })
    }
  },

  async hydrate() {
    if (get().hydrated) return
    set({ loading: true })
    try {
      const { data } = await supabase.auth.getSession()
      const session = data.session ?? null
      const profile = session ? await fetchProfile(session.user.id) : null
      set({
        session,
        profile,
        isAdmin: profile?.role === 'admin_financeiro',
        isSuperadmin: profile?.is_superadmin === true,
      })

      if (!authSubscription) {
        const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          if (!newSession) {
            set({ session: null, profile: null, isAdmin: false, isSuperadmin: false })
            return
          }
          const current = get()
          if (
            current.session?.user.id === newSession.user.id &&
            current.profile
          ) {
            set({ session: newSession })
            return
          }
          const newProfile = await fetchProfile(newSession.user.id)
          set({
            session: newSession,
            profile: newProfile,
            isAdmin: newProfile?.role === 'admin_financeiro',
            isSuperadmin: newProfile?.is_superadmin === true,
          })
        })
        authSubscription = sub.subscription
      }
    } finally {
      set({ loading: false, hydrated: true })
    }
  },

  async refreshProfile() {
    const { session } = get()
    if (!session) return
    const profile = await fetchProfile(session.user.id)
    set({
      profile,
      isAdmin: profile?.role === 'admin_financeiro',
      isSuperadmin: profile?.is_superadmin === true,
    })
  },
}))
