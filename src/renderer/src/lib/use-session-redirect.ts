import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './auth-store'

const PUBLIC_PATHS = ['/login', '/redefinir-senha']

/**
 * Quando a sessão expira (logout, token revogado, refresh falhou) o usuário
 * pode ficar parado em uma rota protegida — os loaders do react-router só
 * rodam em transições, então o redirecionamento não é automático.
 *
 * Esse hook observa o `session` do auth-store e força um navigate('/login')
 * sempre que a sessão se torna nula em qualquer rota protegida.
 *
 * Coloque dentro do RouterProvider (em algum componente filho) ou num layout
 * raiz que renderize em todas as rotas autenticadas.
 */
export function useSessionRedirect(): void {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useAuthStore((s) => s.session)
  const hydrated = useAuthStore((s) => s.hydrated)

  React.useEffect(() => {
    if (!hydrated) return
    const isPublic = PUBLIC_PATHS.some((p) => location.pathname.startsWith(p))
    if (!session && !isPublic) {
      navigate('/login', { replace: true })
    }
  }, [session, hydrated, navigate, location.pathname])
}
