-- =====================================================================
-- Security hardening recomendado — Magnata Rodopav
-- =====================================================================
-- Este arquivo descreve as policies/funções que DEVEM existir no projeto
-- Supabase pra que os achados do recon Fase 1 fiquem mitigados no
-- backend (defesa em profundidade — frontend nunca é fonte de verdade).
--
-- Aplique no SQL Editor do Supabase Dashboard, ou via CLI:
--   supabase db push
--
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Helper de role check (centraliza a lógica em 1 lugar)
-- ---------------------------------------------------------------------
-- Cria uma função SECURITY DEFINER que retorna true se o usuário atual
-- tem permissão "magnata" (acesso ao cockpit executivo).
--
-- Não retorna nada sensível; só boolean. Pode ser chamada por RLS de
-- tabelas e por outras RPCs.
create or replace function public.is_magnata_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (p.is_magnata or p.is_superadmin) and p.ativo
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.is_magnata_user() from public;
grant execute on function public.is_magnata_user() to authenticated;

-- ---------------------------------------------------------------------
-- 2. RPCs administrativas — check de role no início
-- ---------------------------------------------------------------------
-- TEMPLATE: cada RPC magnata_* deve começar verificando is_magnata_user().
-- Se você tem as funções definidas, adicione a verificação no início.
-- Exemplo abaixo pra magnata_kpis_executivos (adapte pra cada uma):

create or replace function public.magnata_kpis_executivos()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  -- BLOQUEIA acesso de usuário sem flag magnata
  if not public.is_magnata_user() then
    raise exception 'forbidden: requires magnata role'
      using errcode = '42501';
  end if;

  -- ... lógica original da função (queries, agregações) ...
  -- select json_build_object(...) into v_result;

  return v_result;
end;
$$;

revoke all on function public.magnata_kpis_executivos() from public;
grant execute on function public.magnata_kpis_executivos() to authenticated;

-- Repita o padrão acima pra:
--   magnata_alertas()
--   magnata_drill_contas_negativas()
--   dashboard_limites_por_conta()

-- ---------------------------------------------------------------------
-- 3. RLS em tabelas/views administrativas
-- ---------------------------------------------------------------------
-- Mesmo que o app só use RPCs SECURITY DEFINER, é boa prática ter
-- RLS de SELECT direta nas tabelas e views, caso alguém chame via
-- /rest/v1/... direto com JWT de role inferior.

-- profiles: usuário só lê o próprio profile (exceto magnata, que lê todos)
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.is_magnata_user()
);

-- profiles: UPDATE só pelo próprio dono, e SEM mexer em flags sensíveis.
-- O update de is_magnata, is_superadmin, role e ativo só pode ser feito
-- via service_role (admin do Supabase Dashboard).
drop policy if exists "profiles_update_safe_fields" on public.profiles;
create policy "profiles_update_safe_fields"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and is_magnata is not distinct from (select is_magnata from public.profiles where id = auth.uid())
  and is_superadmin is not distinct from (select is_superadmin from public.profiles where id = auth.uid())
  and role is not distinct from (select role from public.profiles where id = auth.uid())
  and ativo is not distinct from (select ativo from public.profiles where id = auth.uid())
);

-- lancamentos: só magnata lê
alter table public.lancamentos enable row level security;

drop policy if exists "lancamentos_select_magnata" on public.lancamentos;
create policy "lancamentos_select_magnata"
on public.lancamentos for select
to authenticated
using (public.is_magnata_user());

-- Bloqueia INSERT/UPDATE/DELETE direto via PostgREST (app é read-only)
drop policy if exists "lancamentos_no_write" on public.lancamentos;
create policy "lancamentos_no_write"
on public.lancamentos for all
to authenticated
using (false)
with check (false);

-- ---------------------------------------------------------------------
-- 4. Views administrativas (v_*)
-- ---------------------------------------------------------------------
-- Views herdam RLS das tabelas-base. Pra reforçar, recrie cada view
-- com SECURITY INVOKER (default no Supabase moderno) e adicione filtro.
--
-- Exemplo de pattern:
--
-- create or replace view public.v_contas_saldo
-- with (security_invoker = true)
-- as
--   select ...
--   from public.contas c
--   where public.is_magnata_user();  -- filtro adicional pra defesa em profundidade

-- ---------------------------------------------------------------------
-- 5. Auditoria mínima de role escalation
-- ---------------------------------------------------------------------
-- Tabela pra logar mudanças em flags sensíveis (is_magnata, is_superadmin, role).
-- Quem mudou, quando, e pra qual valor.

create table if not exists public.profile_role_audit (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  changed_by uuid references public.profiles(id),
  old_is_magnata boolean,
  new_is_magnata boolean,
  old_is_superadmin boolean,
  new_is_superadmin boolean,
  old_role text,
  new_role text,
  old_ativo boolean,
  new_ativo boolean,
  changed_at timestamptz not null default now()
);

alter table public.profile_role_audit enable row level security;
drop policy if exists "audit_select_magnata" on public.profile_role_audit;
create policy "audit_select_magnata"
on public.profile_role_audit for select
to authenticated
using (public.is_magnata_user());

create or replace function public.profiles_audit_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.is_magnata is distinct from new.is_magnata)
     or (old.is_superadmin is distinct from new.is_superadmin)
     or (old.role is distinct from new.role)
     or (old.ativo is distinct from new.ativo)
  then
    insert into public.profile_role_audit (
      profile_id, changed_by,
      old_is_magnata, new_is_magnata,
      old_is_superadmin, new_is_superadmin,
      old_role, new_role,
      old_ativo, new_ativo
    ) values (
      new.id, auth.uid(),
      old.is_magnata, new.is_magnata,
      old.is_superadmin, new.is_superadmin,
      old.role, new.role,
      old.ativo, new.ativo
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_audit_role on public.profiles;
create trigger trg_profiles_audit_role
after update on public.profiles
for each row
execute function public.profiles_audit_role_changes();

-- ---------------------------------------------------------------------
-- Fim. Checklist pós aplicação:
--   1. Logar com user comum (sem is_magnata) e tentar chamar
--      magnata_kpis_executivos() via API direta → deve retornar 42501
--   2. Tentar PATCH /rest/v1/profiles?id=eq.<seu_id> com is_magnata=true
--      → deve retornar 42501 (WITH CHECK bloqueia)
--   3. Conferir que app continua funcionando pra user magnata legítimo
-- ---------------------------------------------------------------------
