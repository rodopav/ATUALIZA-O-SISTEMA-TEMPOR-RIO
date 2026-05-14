import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useAuthStore } from './auth-store'
import { modulosKeys } from './modulos-queries'
import { toast } from '../components/ui/use-toast'

/**
 * Escuta mudanças na user_modulos do próprio usuário.
 * Quando o superadmin altera os módulos atribuídos no IAM, este hook:
 *   1) invalida o cache de `meusModulosQuery` (sidebar re-renderiza)
 *   2) mostra um toast informando que a permissão mudou
 *
 * Sem isso, o usuário precisaria fazer logout/login para ver o efeito.
 *
 * IMPORTANTE: deve ser chamado apenas uma vez na árvore (Layout/MagnataLayout)
 * para evitar canais duplicados — mesmo padrão do useChatRealtime.
 */
export function useModulosRealtime(): void {
  const qc = useQueryClient()
  const session = useAuthStore((s) => s.session)
  const meuId = session?.user.id ?? null

  React.useEffect(() => {
    if (!meuId) return
    const channel: RealtimeChannel = supabase.channel(`modulos:${meuId}`)

    const handleChange = (): void => {
      void qc.invalidateQueries({ queryKey: modulosKeys.meus })
      toast({
        title: 'Suas permissões foram atualizadas',
        description: 'A barra lateral foi recarregada.',
      })
    }

    channel.on(
      'postgres_changes',
      {
        event: '*', // INSERT / UPDATE / DELETE
        schema: 'public',
        table: 'user_modulos',
        filter: `user_id=eq.${meuId}`,
      },
      handleChange,
    )

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [meuId, qc])
}
