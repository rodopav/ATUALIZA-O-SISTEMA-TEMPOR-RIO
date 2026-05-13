import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { chatKeys, type ChatMessage } from './chat-queries'
import { useAuthStore } from './auth-store'
import { toast } from '../components/ui/use-toast'

/**
 * Conecta no canal Realtime do Supabase para chat_messages.
 * Inserts vindos pra mim disparam:
 *   1. invalidação das queries (conversas, thread ativa, unread total)
 *   2. toast de notificação (se a thread não está aberta na tela)
 *
 * Filtro server-side: `recipient_id=eq.<eu>` + `sender_id=eq.<eu>` (2 subs).
 * Superadmin também recebe TUDO via filtro extra.
 */
export function useChatRealtime(opts: {
  activeOtherUserId?: string | null
}): void {
  const qc = useQueryClient()
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)
  const meuId = session?.user.id ?? null
  const isSuper = profile?.is_superadmin === true

  // Mantemos uma ref pro activeOtherUserId pra que o handler veja o valor
  // atualizado sem precisar reconectar o canal a cada mudança de thread.
  const activeRef = React.useRef<string | null>(opts.activeOtherUserId ?? null)
  React.useEffect(() => {
    activeRef.current = opts.activeOtherUserId ?? null
  }, [opts.activeOtherUserId])

  React.useEffect(() => {
    if (!meuId) return
    const channel: RealtimeChannel = supabase.channel(`chat:${meuId}`)

    const handleInsert = (payload: { new: ChatMessage }): void => {
      const msg = payload.new
      if (!msg) return

      // Invalida queries afetadas
      void qc.invalidateQueries({ queryKey: chatKeys.conversas })
      void qc.invalidateQueries({ queryKey: chatKeys.unread })
      void qc.invalidateQueries({
        queryKey: ['chat', 'thread'],
      })

      // Toast só se mensagem veio PRA MIM e a thread não está aberta
      if (
        msg.recipient_id === meuId &&
        activeRef.current !== msg.sender_id
      ) {
        toast({
          title: 'Nova mensagem',
          description: msg.body.slice(0, 120),
        })
      }
    }

    if (isSuper) {
      // Superadmin: ouve TODOS os inserts
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        handleInsert,
      )
    } else {
      // Usuário comum: ouve apenas mensagens onde é recipient ou sender
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `recipient_id=eq.${meuId}`,
        },
        handleInsert,
      )
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `sender_id=eq.${meuId}`,
        },
        handleInsert,
      )
    }

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [meuId, isSuper, qc])
}
