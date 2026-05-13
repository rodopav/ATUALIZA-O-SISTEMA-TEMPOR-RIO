import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  Crown,
  ShieldCheck,
  User,
  Loader2,
  Eye,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { toast } from '../components/ui/use-toast'
import { cn } from '../lib/cn'
import { useAuthStore } from '../lib/auth-store'
import {
  conversasQuery,
  contatosQuery,
  threadQuery,
  enviarMensagem,
  marcarLidas,
  chatKeys,
  type ChatConversa,
  type ChatContato,
  type ChatMessage,
} from '../lib/chat-queries'
import { useChatRealtime } from '../lib/use-chat-realtime'

interface ConversaUI {
  outroId: string
  outroNome: string
  outroRole: string
  meuLado: boolean
  ultimaMsg: string | null
  ultimaMsgEm: string | null
  ultimaSenderId: string | null
  naoLidas: number
}

function roleBadge(role: string): React.ReactElement | null {
  if (role === 'admin_financeiro') return <Badge variant="info">Admin</Badge>
  if (role === 'usuario_financeiro') return <Badge variant="secondary">Usuário</Badge>
  return null
}

function specialIcon(c: ChatContato): React.ReactNode {
  if (c.is_superadmin) return <ShieldCheck className="h-3 w-3 text-pur-600" />
  if (c.is_magnata) return <Crown className="h-3 w-3 text-amb-500" />
  return <User className="h-3 w-3 text-muted-foreground" />
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const dt = new Date(iso).getTime()
  if (!Number.isFinite(dt)) return ''
  const diff = Math.max(0, Date.now() - dt)
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString('pt-BR')
}

function timeHHMM(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function ChatPage(): React.ReactElement {
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)
  const meuId = session?.user.id ?? null
  const isSuper = profile?.is_superadmin === true

  const [selectedKey, setSelectedKey] = React.useState<string | null>(null)
  const [newDialogOpen, setNewDialogOpen] = React.useState(false)

  // Realtime: conecta no canal e mantém queries fresh
  useChatRealtime({
    activeOtherUserId: selectedKey ? selectedKey.split('::')[0] ?? null : null,
  })

  const conversasQ = useQuery(conversasQuery)

  // Lista normalizada do ponto de vista do usuário logado.
  // - Participantes: "outro" é o outro lado da DM.
  // - Superadmin: mostra TODAS as conversas (par user_a ↔ user_b), e "outro"
  //   passa a representar a CONVERSA como um todo (user_a-user_b).
  const conversas = React.useMemo<ConversaUI[]>(() => {
    const list = conversasQ.data ?? []
    return list.map((c) => {
      if (isSuper && meuId !== c.user_a && meuId !== c.user_b) {
        // Observando conversa de terceiros — chave composta
        return {
          outroId: `${c.user_a}::${c.user_b}`,
          outroNome: `${c.user_a_nome ?? '—'} ↔ ${c.user_b_nome ?? '—'}`,
          outroRole: 'observado',
          meuLado: false,
          ultimaMsg: c.ultima_msg,
          ultimaMsgEm: c.ultima_msg_em,
          ultimaSenderId: c.ultima_sender_id,
          naoLidas: 0,
        }
      }
      const sou_a = meuId === c.user_a
      return {
        outroId: sou_a ? (c.user_b ?? '') : (c.user_a ?? ''),
        outroNome: sou_a ? (c.user_b_nome ?? '—') : (c.user_a_nome ?? '—'),
        outroRole: sou_a ? (c.user_b_role ?? '') : (c.user_a_role ?? ''),
        meuLado: true,
        ultimaMsg: c.ultima_msg,
        ultimaMsgEm: c.ultima_msg_em,
        ultimaSenderId: c.ultima_sender_id,
        naoLidas: Number(c.nao_lidas ?? 0),
      }
    })
  }, [conversasQ.data, meuId, isSuper])

  const selected = React.useMemo<ConversaUI | null>(
    () => conversas.find((c) => c.outroId === selectedKey) ?? null,
    [conversas, selectedKey],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sistema"
        title="Chat"
        description={
          isSuper
            ? 'Você é Superadmin — vê TODAS as conversas do sistema.'
            : 'Suas conversas com outros usuários. Mensagens em tempo real.'
        }
        actions={
          <Button onClick={() => setNewDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova conversa
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] md:min-h-[560px]">
          {/* Lista de conversas */}
          <div className="border-b md:border-b-0 md:border-r bg-muted/20">
            {conversasQ.isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : conversas.length === 0 ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
                <MessageSquare className="mb-3 h-8 w-8 opacity-60" />
                <p>Nenhuma conversa ainda.</p>
                <p className="text-xs">
                  Clique em <strong>Nova conversa</strong> pra começar.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {conversas.map((c) => (
                  <li key={c.outroId}>
                    <button
                      type="button"
                      onClick={() => setSelectedKey(c.outroId)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60',
                        selectedKey === c.outroId && 'bg-accent',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase',
                          c.meuLado
                            ? 'bg-primary/15 text-primary'
                            : 'bg-pur-600/15 text-pur-600',
                        )}
                      >
                        {c.meuLado ? (
                          c.outroNome.slice(0, 2)
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {c.outroNome}
                          </p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {relativeTime(c.ultimaMsgEm)}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.ultimaMsg ?? '—'}
                        </p>
                      </div>
                      {c.naoLidas > 0 ? (
                        <span className="ml-auto shrink-0 self-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground tabular-nums">
                          {c.naoLidas}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Thread */}
          <div className="flex min-h-[560px] flex-col bg-background">
            {selected ? (
              <Thread
                conversa={selected}
                meuId={meuId}
                isSuperObservando={!selected.meuLado}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
                <MessageSquare className="mb-3 h-10 w-10 opacity-40" />
                <p>Selecione uma conversa à esquerda</p>
                <p className="text-xs">ou inicie uma nova.</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <NovaConversaDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        onSelect={(c) => {
          setSelectedKey(c.id!)
          setNewDialogOpen(false)
        }}
      />
    </div>
  )
}

interface ThreadProps {
  conversa: ConversaUI
  meuId: string | null
  isSuperObservando: boolean
}

function Thread({
  conversa,
  meuId,
  isSuperObservando,
}: ThreadProps): React.ReactElement {
  const qc = useQueryClient()
  const [text, setText] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Quando observando (superadmin), a chave é "userA::userB" — busca todas as
  // mensagens entre os 2. Caso participante, busca eu↔outro.
  const [a, b] = conversa.outroId.includes('::')
    ? conversa.outroId.split('::')
    : [conversa.outroId, '']
  const queryKey = isSuperObservando ? a! : conversa.outroId
  const otherUserB = b || ''

  const threadQ = useQuery({
    ...threadQuery(queryKey, isSuperObservando ? null : meuId),
    // refetch a cada invalidate via realtime
  })

  // Para superadmin observando, filtra no client pra pegar SÓ msgs entre a e b
  const messages = React.useMemo<ChatMessage[]>(() => {
    const all = threadQ.data ?? []
    if (isSuperObservando && otherUserB) {
      return all.filter(
        (m) =>
          (m.sender_id === a && m.recipient_id === otherUserB) ||
          (m.sender_id === otherUserB && m.recipient_id === a),
      )
    }
    return all
  }, [threadQ.data, isSuperObservando, a, otherUserB])

  // Scroll pro fim quando chegar nova msg
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  // Marca lidas ao abrir thread (apenas participante)
  React.useEffect(() => {
    if (isSuperObservando || !meuId) return
    if (conversa.naoLidas === 0) return
    void marcarLidas(conversa.outroId).then(() => {
      void qc.invalidateQueries({ queryKey: chatKeys.conversas })
      void qc.invalidateQueries({ queryKey: chatKeys.unread })
    })
  }, [conversa.outroId, conversa.naoLidas, isSuperObservando, meuId, qc])

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!meuId) throw new Error('Sem sessão.')
      if (isSuperObservando) throw new Error('Apenas observação — não pode enviar.')
      const body = text.trim()
      if (!body) throw new Error('Mensagem vazia.')
      if (body.length > 2000) throw new Error('Máximo de 2000 caracteres.')
      return enviarMensagem({
        recipientId: conversa.outroId,
        body,
        senderId: meuId,
      })
    },
    onSuccess: () => {
      setText('')
      void qc.invalidateQueries({ queryKey: chatKeys.conversas })
      void qc.invalidateQueries({
        queryKey: chatKeys.thread(conversa.outroId, meuId ?? '*'),
      })
    },
    onError: (err) => {
      toast({
        title: 'Falha ao enviar',
        description: err instanceof Error ? err.message : 'Erro inesperado',
        variant: 'destructive',
      })
    },
  })

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold uppercase text-primary">
            {conversa.outroNome.slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-semibold">{conversa.outroNome}</p>
            <p className="text-[11px] text-muted-foreground">
              {isSuperObservando
                ? 'Observando conversa (read-only)'
                : roleBadge(conversa.outroRole)
                  ? null
                  : conversa.outroRole}
            </p>
          </div>
        </div>
        {roleBadge(conversa.outroRole)}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto px-4 py-4"
      >
        {threadQ.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Sem mensagens ainda. Mande a primeira.
          </div>
        ) : (
          messages.map((m) => {
            const mine = !isSuperObservando && m.sender_id === meuId
            return (
              <div
                key={m.id}
                className={cn(
                  'flex w-full',
                  mine ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'max-w-[75%] rounded-lg px-3 py-2 text-sm',
                    mine
                      ? 'bg-primary text-primary-foreground'
                      : 'border bg-card',
                  )}
                >
                  {isSuperObservando ? (
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {/* Mostra quem enviou no modo observador */}
                      {m.sender_id === a ? conversa.outroNome.split(' ↔ ')[0] : conversa.outroNome.split(' ↔ ')[1]}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={cn(
                      'mt-1 text-[10px] tabular-nums',
                      mine ? 'text-primary-foreground/70' : 'text-muted-foreground',
                    )}
                  >
                    {timeHHMM(m.created_at)}
                    {mine && m.read_at ? ' ✓✓' : mine ? ' ✓' : ''}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {!isSuperObservando ? (
        <div className="border-t bg-card p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMut.mutate()
            }}
            className="flex gap-2"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite sua mensagem…"
              maxLength={2000}
              autoComplete="off"
              disabled={sendMut.isPending}
            />
            <Button
              type="submit"
              disabled={!text.trim() || sendMut.isPending}
            >
              {sendMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar
            </Button>
          </form>
        </div>
      ) : (
        <div className="border-t bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
          <Eye className="mr-1 inline h-3 w-3" />
          Modo observação — superadmin não envia mensagens nesta conversa
        </div>
      )}
    </>
  )
}

function NovaConversaDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSelect: (c: ChatContato) => void
}): React.ReactElement {
  const contatosQ = useQuery(contatosQuery)
  const [q, setQ] = React.useState('')

  const filtered = React.useMemo(() => {
    const list = contatosQ.data ?? []
    if (!q.trim()) return list
    const needle = q.toLowerCase()
    return list.filter((c) =>
      (c.nome_completo ?? '').toLowerCase().includes(needle),
    )
  }, [contatosQ.data, q])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
          <DialogDescription>
            Escolha um usuário ativo para iniciar uma DM.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Buscar nome…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="max-h-[40vh] space-y-1 overflow-y-auto">
          {contatosQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum contato encontrado.
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c)}
                className="flex w-full items-center gap-3 rounded-md border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold uppercase text-primary">
                  {(c.nome_completo ?? '?').slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.nome_completo}</p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    {specialIcon(c)}
                    <span>{c.role ?? '—'}</span>
                  </div>
                </div>
                {roleBadge(c.role ?? '')}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ChatPage
