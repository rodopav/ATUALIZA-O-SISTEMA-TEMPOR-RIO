import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { chatKeys, type ChatMessage } from './chat-queries'
import { useAuthStore } from './auth-store'
import { useChatActiveStore } from './chat-active-store'
import { toast } from '../components/ui/use-toast'

/**
 * IMPORTANTE: este hook só pode ser montado em UM componente da árvore
 * (Layout ou MagnataLayout). Chamar em mais de um lugar causa erro
 * "cannot add postgres_changes callbacks ... after subscribe()" porque
 * o supabase reusa canais pelo nome.
 *
 * Conecta no canal Realtime do Supabase para chat_messages.
 * Inserts disparam:
 *   1. invalidação das queries (conversas, threads, unread total)
 *   2. toast de notificação se a thread não está aberta (lendo
 *      `activeOtherUserId` do store global useChatActiveStore)
 *
 * Filtro server-side: `recipient_id=eq.<eu>` + `sender_id=eq.<eu>` (2 subs).
 * Superadmin recebe TUDO (sem filtro).
 */
export function useChatRealtime(): void {
  const qc = useQueryClient()
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)
  const meuId = session?.user.id ?? null
  const isSuper = profile?.is_superadmin === true

  React.useEffect(() => {
    if (!meuId) return
    const channel: RealtimeChannel = supabase.channel(`chat:${meuId}`)

    const handleInsert = (payload: { new: ChatMessage }): void => {
      const msg = payload.new
      if (!msg) return

      void qc.invalidateQueries({ queryKey: chatKeys.conversas })
      void qc.invalidateQueries({ queryKey: chatKeys.unread })
      void qc.invalidateQueries({ queryKey: ['chat', 'thread'] })

      // Lê valor atualizado do store sem re-criar o canal a cada mudança.
      const activeId = useChatActiveStore.getState().activeOtherUserId
      if (msg.recipient_id === meuId && activeId !== msg.sender_id) {
        toast({
          title: 'Nova mensagem',
          description: msg.body.slice(0, 120),
        })
      }
    }

    if (isSuper) {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        handleInsert,
      )
    } else {
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
