-- =====================================================================
-- Role check consolidation — Magnata Rodopav (aplicado via MCP)
-- =====================================================================
-- Estas 6 migrations já foram aplicadas direto no projeto Supabase
-- (rhhmdjipigvtfrzwzchh) via MCP do Claude Code. Este arquivo é o
-- registro git pra ficar versionado.
--
-- Status atual no banco (validado pós-aplicação):
--   ✓ public.is_magnata_user() existe
--   ✓ search_path fixo em set_updated_at, periodo_esta_fechado,
--     enforce_data_razoavel, chat_protect_immutable
--   ✓ 7 views com security_invoker=true: v_chat_conversas, v_contas_lookup,
--     v_movimentos, v_entradas_saidas_usuario, v_conferencia, v_saldo_geral,
--     v_saldo_por_conta_usuario
--   ✓ apagar_dados_teste revogado de anon (mantém check is_superadmin)
--   ✓ 8 RPCs magnata_* + dashboard_limites_por_conta validam is_magnata_user()
--
-- Pós-validação advisors: 0 ERROR (era 7). Pendência única é
-- auth_leaked_password_protection (precisa dashboard, ver HARDENING_PENDENTE.md).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Helper centralizado de role check
-- ---------------------------------------------------------------------
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

revoke all on function public.is_magnata_user() from public, anon;
grant execute on function public.is_magnata_user() to authenticated;

-- ---------------------------------------------------------------------
-- 2. search_path fixo em funções utilitárias
-- ---------------------------------------------------------------------
-- Defesa contra search_path hijack: força resolução a 'public' mesmo
-- se o caller tiver SET search_path arbitrário no JWT/session.
alter function public.set_updated_at() set search_path = public;
alter function public.periodo_esta_fechado(date) set search_path = public;
alter function public.enforce_data_razoavel() set search_path = public;
alter function public.chat_protect_immutable() set search_path = public;

-- ---------------------------------------------------------------------
-- 3. Views security_invoker=true (defesa em profundidade)
-- ---------------------------------------------------------------------
-- Aplicado via ALTER VIEW pra forçar herança de RLS do caller. Sem isso,
-- view criada como SECURITY DEFINER (default antigo do Postgres) faz
-- bypass de RLS — anon poderia ler dado via /rest/v1/v_saldo_geral
-- mesmo com tabela-base trancada.
alter view public.v_chat_conversas         set (security_invoker = true);
alter view public.v_contas_lookup          set (security_invoker = true);
alter view public.v_movimentos             set (security_invoker = true);
alter view public.v_entradas_saidas_usuario set (security_invoker = true);
alter view public.v_conferencia            set (security_invoker = true);
alter view public.v_saldo_geral            set (security_invoker = true);
alter view public.v_saldo_por_conta_usuario set (security_invoker = true);

-- ---------------------------------------------------------------------
-- 4. apagar_dados_teste: tira do anon
-- ---------------------------------------------------------------------
-- Função SECURITY DEFINER que apaga lancamentos, solicitacoes_saldo,
-- saldos_iniciais, periodos_fechados, audit_log. Internamente checa
-- is_superadmin, mas defesa em profundidade pede revogação do anon
-- pra anon NÃO ter sequer caminho via /rest/v1/rpc/apagar_dados_teste.
revoke all on function public.apagar_dados_teste() from public, anon;
grant execute on function public.apagar_dados_teste() to authenticated;

-- ---------------------------------------------------------------------
-- 5. Role check em todas RPCs magnata_*
-- ---------------------------------------------------------------------
-- Cada RPC magnata_* agora começa com:
--   IF NOT public.is_magnata_user() THEN
--     RAISE EXCEPTION 'forbidden: requires magnata role'
--       USING ERRCODE = '42501';
--   END IF;
--
-- Bloqueia user autenticado SEM flag is_magnata de chamar via
-- /rest/v1/rpc/magnata_*. App já filtrava no AuthGate (App.tsx),
-- mas agora a defesa está no banco também — quem bypassar o front
-- também bate na barreira.
--
-- IMPORTANTE: os defaults dos parâmetros foram preservados:
--   magnata_drill_movimentos_mes(p_limit integer DEFAULT 10)
--   magnata_projecao_caixa(p_dias integer DEFAULT 30)
--
-- Aplicado via apply_migration porque o corpo de cada função foi
-- recriado integralmente. Ver migration security_magnata_rpcs_role_check_v3
-- no histórico do banco (list_migrations) pra código completo.
--
-- RPCs afetadas (8):
--   • magnata_alertas()
--   • magnata_drill_ausencia_pendentes()
--   • magnata_drill_contas_negativas()
--   • magnata_drill_movimentos_mes(integer)
--   • magnata_drill_tarifas_mes()
--   • magnata_kpis()
--   • magnata_kpis_executivos()
--   • magnata_projecao_caixa(integer)

-- ---------------------------------------------------------------------
-- 6. Role check em dashboard_limites_por_conta
-- ---------------------------------------------------------------------
-- Função SECURITY DEFINER chamada pelo cockpit (queries.ts:151).
-- Tinha só filtro pode_ver_conta() interno, agora valida is_magnata_user()
-- antes de retornar dado.
create or replace function public.dashboard_limites_por_conta()
returns TABLE(conta_id uuid, apelido text, banco text, empresa text, valor_limite numeric, saldo_atual numeric, limite_disponivel numeric, total_disponivel numeric)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
BEGIN
  IF NOT public.is_magnata_user() THEN
    RAISE EXCEPTION 'forbidden: requires magnata role' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    cb.id AS conta_id,
    cb.apelido,
    cb.banco,
    e.razao_social AS empresa,
    lc.valor_limite,
    saldo_atual_conta(cb.id) AS saldo_atual,
    (lc.valor_limite + LEAST(saldo_atual_conta(cb.id), 0))::numeric AS limite_disponivel,
    (saldo_atual_conta(cb.id) + lc.valor_limite)::numeric AS total_disponivel
  FROM contas_bancarias cb
  JOIN limites_conta lc ON lc.conta_id = cb.id AND lc.ativo
  LEFT JOIN empresas e ON e.id = cb.empresa_id
  WHERE cb.tem_limite = true
    AND cb.ativo = true
    AND pode_ver_conta(cb.id)
  ORDER BY cb.apelido;
END;
$function$;

revoke all on function public.dashboard_limites_por_conta() from public, anon;
grant execute on function public.dashboard_limites_por_conta() to authenticated;

-- =====================================================================
-- Smoke test (rodar como anon, sem JWT):
--   curl -X POST https://<proj>.supabase.co/rest/v1/rpc/magnata_kpis_executivos
--     -H "apikey: <ANON>"
--   → HTTP 401 (esperado)
--
-- Smoke test (rodar como user comum, com JWT mas SEM is_magnata):
--   curl ... -H "Authorization: Bearer <JWT_COMUM>"
--   → HTTP 403 com SQLSTATE 42501 (esperado)
-- =====================================================================
