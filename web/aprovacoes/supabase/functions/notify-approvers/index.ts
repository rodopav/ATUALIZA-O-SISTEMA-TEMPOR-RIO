// Edge Function — envia Web Push pra todos os aprovadores
// quando uma nova solicitação PENDENTE é criada.
//
// Deploy:
//   supabase functions deploy notify-approvers
//
// Secrets necessários (Supabase Dashboard → Edge Functions → notify-approvers → Secrets):
//   VAPID_PUBLIC_KEY  — chave pública (mesma que vai pro frontend)
//   VAPID_PRIVATE_KEY — chave privada (só edge function tem)
//   VAPID_SUBJECT     — "mailto:ti@rodopav.com.br" ou URL do projeto
//
// Gerar par VAPID:
//   npx web-push generate-vapid-keys

import { createClient } from 'jsr:@supabase/supabase-js@2'
// @ts-ignore — Deno resolve via URL imports
import * as webpush from 'npm:web-push@3.6.7'

interface Payload {
  solic_id: string
  valor: number
  descricao: string
}

Deno.serve(async (req: Request) => {
  // Aceita só POST
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')
  const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')
  const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:ti@rodopav.com.br'
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response('VAPID keys não configuradas', { status: 500 })
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const body: Payload = await req.json().catch(() => ({} as Payload))

  // Buscar TODOS os user_ids de aprovadores (admin_financeiro OR superadmin)
  const { data: aprovadores, error: errA } = await sb
    .from('profiles')
    .select('id')
    .or('role.eq.admin_financeiro,is_superadmin.eq.true')
    .eq('ativo', true)

  if (errA || !aprovadores) {
    return new Response(`falha listando aprovadores: ${errA?.message}`, { status: 500 })
  }
  const userIds = aprovadores.map((a: { id: string }) => a.id)
  if (userIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, msg: 'sem aprovadores' }), { status: 200 })
  }

  // Buscar todas as subscriptions desses users
  const { data: subs, error: errS } = await sb
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (errS || !subs) {
    return new Response(`falha listando subs: ${errS?.message}`, { status: 500 })
  }

  const title = 'Nova solicitação aguarda'
  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format
  const body_msg = `${fmt(Number(body.valor) || 0)} · ${(body.descricao ?? '').slice(0, 60)}`
  const pushBody = JSON.stringify({
    title,
    body: body_msg,
    tag: `solic-${body.solic_id ?? 'unk'}`,
    url: '/',
  })

  const results = await Promise.allSettled(
    subs.map((s: { id: string; endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        pushBody,
      ),
    ),
  )

  // Limpa subscriptions inválidas (410 Gone)
  const dead: string[] = []
  results.forEach((r, i) => {
    if (
      r.status === 'rejected' &&
      typeof r.reason === 'object' &&
      r.reason !== null &&
      'statusCode' in (r.reason as any) &&
      ((r.reason as any).statusCode === 404 || (r.reason as any).statusCode === 410)
    ) {
      dead.push(subs[i].id)
    }
  })
  if (dead.length > 0) {
    await sb.from('push_subscriptions').delete().in('id', dead)
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length
  return new Response(JSON.stringify({ sent, total: subs.length, removed_dead: dead.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
