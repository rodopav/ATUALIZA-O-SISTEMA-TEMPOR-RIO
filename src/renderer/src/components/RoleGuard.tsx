import * as React from 'react'
import { useAuthStore } from '../lib/auth-store'

interface RoleGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  /**
   * If provided, restricts to the listed roles. Defaults to `admin_financeiro` only.
   */
  allow?: Array<'admin_financeiro' | 'usuario_financeiro'>
}

export function RoleGuard({
  children,
  fallback = null,
  allow = ['admin_financeiro'],
}: RoleGuardProps): React.ReactElement | null {
  const profile = useAuthStore((s) => s.profile)
  if (!profile) return <>{fallback}</>
  if (!allow.includes(profile.role)) return <>{fallback}</>
  return <>{children}</>
}
