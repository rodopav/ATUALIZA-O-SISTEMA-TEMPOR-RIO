// Store global da "thread ativa" do chat.
// O useChatRealtime (montado uma única vez no Layout) lê isso pra decidir
// se mostra toast quando chega nova mensagem.
//
// Por que precisa: useChatRealtime só pode rodar em UM componente — se o
// Layout E a ChatPage chamam, o supabase tenta adicionar callbacks num
// canal já subscrito e dispara o erro "cannot add postgres_changes
// callbacks ... after subscribe()".

import { create } from 'zustand'

interface ChatActiveState {
  activeOtherUserId: string | null
  setActive: (id: string | null) => void
}

export const useChatActiveStore = create<ChatActiveState>((set) => ({
  activeOtherUserId: null,
  setActive: (id) => set({ activeOtherUserId: id }),
}))
