-- Tabela pra guardar endpoint de Push Web API de cada device do usuário.
-- Cada navegador/instalação gera 1 subscription único.
-- Apaga quando user desinscreve ou desinstala o PWA.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_push_sub_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Usuário só vê/manipula as próprias subscriptions
create policy push_sub_select_own on public.push_subscriptions
  for select using (user_id = auth.uid());

create policy push_sub_insert_own on public.push_subscriptions
  for insert with check (user_id = auth.uid());

create policy push_sub_update_own on public.push_subscriptions
  for update using (user_id = auth.uid());

create policy push_sub_delete_own on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- Trigger pra preencher user_id automaticamente
create or replace function public.push_sub_set_user_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists trg_push_sub_set_user on public.push_subscriptions;
create trigger trg_push_sub_set_user
  before insert on public.push_subscriptions
  for each row execute function public.push_sub_set_user_id();

-- ===================== TRIGGER: NOTIFICAR APROVADORES =====================
-- Quando uma nova solicitação chega como PENDENTE, dispara a Edge Function
-- 'notify-approvers' via pg_net. Edge function envia push pra todos os
-- admins_financeiros/superadmin inscritos.

create or replace function public.notificar_aprovadores_on_nova_solic()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_anon_key text;
  v_payload jsonb;
begin
  if new.status <> 'PENDENTE' then
    return new;
  end if;

  -- Busca config em vault (ou hardcode aqui se Frank preferir).
  -- Pra MVP, deixa hardcoded a URL/anon-key — não é segredo crítico.
  -- Frank troca quando configurar a Edge Function.
  v_url := current_setting('app.supabase_url', true);
  v_anon_key := current_setting('app.anon_key', true);
  if v_url is null or v_url = '' then
    -- Configuração faltando, não falha o INSERT
    return new;
  end if;

  v_payload := jsonb_build_object(
    'solic_id', new.id,
    'valor', new.valor,
    'descricao', new.descricao
  );

  -- pg_net dispara assíncrono — não bloqueia o INSERT do app
  perform net.http_post(
    url := v_url || '/functions/v1/notify-approvers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := v_payload
  );
  return new;
exception when others then
  -- Não bloqueia INSERT se push falhar
  raise warning 'notificar_aprovadores falhou: %', sqlerrm;
  return new;
end $$;

-- Garantir extensão pg_net habilitada
-- (Já vem habilitada em projetos Supabase desde 2023)
-- create extension if not exists pg_net;

drop trigger if exists trg_notificar_aprovadores on public.solicitacoes_saldo;
create trigger trg_notificar_aprovadores
  after insert on public.solicitacoes_saldo
  for each row execute function public.notificar_aprovadores_on_nova_solic();

-- Frank executa via psql ou MCP execute_sql:
--   ALTER DATABASE postgres SET app.supabase_url = 'https://rhhmdjipigvtfrzwzchh.supabase.co';
--   ALTER DATABASE postgres SET app.anon_key = '<anon-key>';
