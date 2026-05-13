// Queries e mutations do chat 1:1.
// RLS no banco já garante que:
//   - usuario / admin: só veem mensagens onde são sender ou recipient
//   - superadmin: vê tudo (todas as conversas do sistema)

import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Tables } from '../../../shared/database.types'

export type ChatMessage = Tables<'chat_messages'>
export type ChatConversa = Tables<'v_chat_conversas'>
export type ChatContato = Tables<'v_chat_contatos'>

export const chatKeys = {
  all: ['chat'] as const,
  conversas: ['chat', 'conversas'] as const,
  contatos: ['chat', 'contatos'] as const,
  thread: (a: string, b: string) => ['chat', 'thread', [a, b].sort().join(':')] as const,
  unread: ['chat', 'unread'] as const,
}

export const conversasQuery = queryOptions({
  queryKey: chatKeys.conversas,
  queryFn: async (): Promise<ChatConversa[]> => {
    const { data, error } = await supabase
      .from('v_chat_conversas')
      .select('*')
    if (error) throw error
    return data ?? []
  },
  staleTime: 5_000,
})

export const contatosQuery = queryOptions({
  queryKey: chatKeys.contatos,
  queryFn: async (): Promise<ChatContato[]> => {
    const { data, error } = await supabase
      .from('v_chat_contatos')
      .select('*')
      .order('nome_completo', { ascending: true })
    if (error) throw error
    return data ?? []
  },
  staleTime: 5 * 60_000,
})

export const unreadTotalQuery = queryOptions({
  queryKey: chatKeys.unread,
  queryFn: async (): Promise<number> => {
    const { data, error } = await supabase.rpc('chat_nao_lidas_total')
    if (error) throw error
    return Number(data ?? 0)
  },
  staleTime: 5_000,
})

export function threadQuery(otherUserId: string, viewerId: string | null) {
  return queryOptions({
    queryKey: chatKeys.thread(otherUserId, viewerId ?? '*'),
    queryFn: async (): Promise<ChatMessage[]> => {
      // Para superadmin observando conversa entre 2 outros, filtra por par.
      // Para participante, filtra "eu ↔ outro".
      let q = supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(500)

      if (viewerId && viewerId !== otherUserId) {
        // Participante: (sender=eu AND recipient=outro) OR (sender=outro AND recipient=eu)
        q = q.or(
          `and(sender_id.eq.${viewerId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${viewerId})`,
        )
      } else {
        // Superadmin observando: viewer=null OU viewer===outro (passou só 1 lado)
        // Buscamos todas as msgs onde otherUserId aparece — depois o caller filtra.
        q = q.or(`sender_id.eq.${otherUserId},recipient_id.eq.${otherUserId}`)
      }
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    staleTime: 5_000,
  })
}

export async function enviarMensagem(input: {
  recipientId: string
  body: string
  senderId: string
}): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      sender_id: input.senderId,
      recipient_id: input.recipientId,
      body: input.body.trim(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function marcarLidas(senderId: string): Promise<number> {
  const { data, error } = await supabase.rpc('chat_marcar_lidas', {
    p_sender_id: senderId,
  })
  if (error) throw error
  return Number(data ?? 0)
}
