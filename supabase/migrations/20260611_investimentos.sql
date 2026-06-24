-- ============================================================
-- INVESTIMENTOS — mesmo princípio de separação do Caixa Físico.
-- Contas marcadas como investimento (renda fixa, CDB, fundos, etc.)
-- aparecem num bucket próprio no dashboard, NÃO somam no "Saldo das
-- contas" nem na liquidez imediata, mas entram no Saldo Geral.
-- Aplicar no Supabase Dashboard -> SQL Editor -> Run.
-- ============================================================

-- 1) Novo tipo de conta no enum (espelha 'CAIXA_FISICO').
--    ADD VALUE não pode ser usado na MESMA transação que o cria; como
--    nada abaixo referencia o enum 'INVESTIMENTO' (a separação usa a flag
--    booleana), rodar tudo junto funciona. Se o editor reclamar de "unsafe
--    use of new value", rode SÓ esta linha primeiro, depois o resto.
ALTER TYPE public.conta_tipo ADD VALUE IF NOT EXISTS 'INVESTIMENTO';

-- 2) Flag booleana que dirige a separação (espelha is_caixa_fisico).
ALTER TABLE public.contas_bancarias
  ADD COLUMN IF NOT EXISTS is_investimento boolean NOT NULL DEFAULT false;

-- 3) Cards consolidados do dashboard principal.
--    DROP+CREATE porque a RETURNS TABLE ganha uma coluna nova
--    (CREATE OR REPLACE não altera assinatura de retorno).
DROP FUNCTION IF EXISTS public.dashboard_saldos_consolidados();
CREATE FUNCTION public.dashboard_saldos_consolidados()
 RETURNS TABLE(saldo_contas numeric, saldo_caixa_fisico numeric, saldo_investimentos numeric, saldo_geral numeric, saldo_limite_total numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH visiveis AS (
    SELECT cb.id, cb.is_caixa_fisico, cb.is_investimento, cb.tem_limite
    FROM contas_bancarias cb
    WHERE cb.ativo = true AND pode_ver_conta(cb.id)
  ),
  saldos AS (
    SELECT v.is_caixa_fisico, v.is_investimento, v.tem_limite,
           saldo_atual_conta(v.id) AS saldo,
           CASE WHEN v.tem_limite
                THEN saldo_limite_disponivel(v.id)
                ELSE 0
           END AS limite_disp
    FROM visiveis v
  )
  SELECT
    COALESCE(SUM(saldo) FILTER (WHERE NOT is_caixa_fisico AND NOT is_investimento), 0)::numeric,
    COALESCE(SUM(saldo) FILTER (WHERE is_caixa_fisico), 0)::numeric,
    COALESCE(SUM(saldo) FILTER (WHERE is_investimento), 0)::numeric,
    COALESCE(SUM(saldo), 0)::numeric,
    COALESCE(SUM(limite_disp) FILTER (WHERE tem_limite), 0)::numeric
  FROM saldos;
END;
$function$;

-- 4) KPIs executivos (cockpit Magnata). Mesma assinatura (jsonb) — só
--    adiciona a chave saldo_investimentos e separa o bucket.
CREATE OR REPLACE FUNCTION public.magnata_kpis_executivos()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inicio_mes date := date_trunc('month', CURRENT_DATE)::date;
  v_saldo_geral numeric := 0;
  v_saldo_caixa numeric := 0;
  v_saldo_investimentos numeric := 0;
  v_saldo_contas numeric := 0;
  v_limite_total_disponivel numeric := 0;
  v_limite_total_configurado numeric := 0;
  v_limite_consumido numeric := 0;
  v_pct_limite_consumido numeric := 0;

  v_tarifas_mes_valor numeric := 0;
  v_tarifas_mes_count int := 0;
  v_usou_limite_mes_count int := 0;

  v_contas_negativas_count int := 0;
  v_liquidez_imediata numeric := 0;

  v_saidas_90d numeric := 0;
  v_dias_com_saida int := 0;
  v_media_diaria numeric := 0;
  v_runway_meses numeric := NULL;

  v_saldo_mes_passado_final numeric := 0;
  v_saldo_variacao_pct numeric := 0;

  v_solic_pendentes int := 0;
  v_solic_ausencia_pendentes int := 0;
BEGIN
  IF NOT public.is_magnata_user() THEN
    RAISE EXCEPTION 'forbidden: requires magnata role' USING ERRCODE = '42501';
  END IF;

  -- Saldo das contas exclui caixa físico E investimento; saldo_geral soma tudo.
  SELECT
    COALESCE(SUM(saldo_atual_conta(c.id)) FILTER (WHERE NOT c.is_caixa_fisico AND NOT c.is_investimento), 0),
    COALESCE(SUM(saldo_atual_conta(c.id)) FILTER (WHERE c.is_caixa_fisico), 0),
    COALESCE(SUM(saldo_atual_conta(c.id)) FILTER (WHERE c.is_investimento), 0),
    COALESCE(SUM(saldo_atual_conta(c.id)), 0)
  INTO v_saldo_contas, v_saldo_caixa, v_saldo_investimentos, v_saldo_geral
  FROM contas_bancarias c
  WHERE c.ativo AND pode_ver_conta(c.id);

  SELECT
    COALESCE(SUM(lc.valor_limite), 0),
    COALESCE(SUM(saldo_limite_disponivel(c.id)), 0)
  INTO v_limite_total_configurado, v_limite_total_disponivel
  FROM contas_bancarias c
  JOIN limites_conta lc ON lc.conta_id = c.id AND lc.ativo
  WHERE c.ativo AND c.tem_limite AND pode_ver_conta(c.id);

  v_limite_consumido := v_limite_total_configurado - v_limite_total_disponivel;
  v_pct_limite_consumido := CASE
    WHEN v_limite_total_configurado > 0
    THEN ROUND((v_limite_consumido / v_limite_total_configurado) * 100, 2)
    ELSE 0
  END;

  SELECT COALESCE(SUM(l.valor), 0), COUNT(*)
  INTO v_tarifas_mes_valor, v_tarifas_mes_count
  FROM lancamentos l
  WHERE l.is_tarifa = true
    AND l.data >= v_inicio_mes
    AND l.estorno_de_id IS NULL;

  SELECT COUNT(*)
  INTO v_usou_limite_mes_count
  FROM lancamentos l
  WHERE l.usou_limite = true
    AND l.data >= v_inicio_mes
    AND l.estorno_de_id IS NULL;

  SELECT COUNT(*)
  INTO v_contas_negativas_count
  FROM contas_bancarias c
  WHERE c.ativo
    AND pode_ver_conta(c.id)
    AND saldo_atual_conta(c.id) < 0;

  -- Liquidez imediata = caixa físico + saldos positivos de contas correntes.
  -- Investimento NÃO é liquidez imediata (precisa resgatar), então fica de fora.
  SELECT
    v_saldo_caixa +
    COALESCE(SUM(GREATEST(saldo_atual_conta(c.id), 0)) FILTER (
      WHERE NOT c.is_caixa_fisico AND NOT c.is_investimento
    ), 0)
  INTO v_liquidez_imediata
  FROM contas_bancarias c
  WHERE c.ativo AND pode_ver_conta(c.id);

  SELECT
    COALESCE(SUM(l.valor), 0),
    COUNT(DISTINCT l.data)
  INTO v_saidas_90d, v_dias_com_saida
  FROM lancamentos l
  JOIN tipos_operacao t ON t.id = l.tipo_operacao_id
  WHERE l.natureza = 'SAIDA'
    AND NOT t.is_transferencia
    AND l.data > (CURRENT_DATE - interval '90 days')
    AND l.data <= CURRENT_DATE
    AND l.estorno_de_id IS NULL
    AND l.conta_origem_id IS NOT NULL
    AND pode_ver_conta(l.conta_origem_id);

  IF v_dias_com_saida > 0 AND v_saidas_90d > 0 THEN
    DECLARE
      v_dias_janela int;
    BEGIN
      SELECT LEAST(
        90,
        GREATEST(1, (CURRENT_DATE - MIN(l.data)::date + 1))
      )
      INTO v_dias_janela
      FROM lancamentos l
      JOIN tipos_operacao t ON t.id = l.tipo_operacao_id
      WHERE l.natureza = 'SAIDA'
        AND NOT t.is_transferencia
        AND l.data > (CURRENT_DATE - interval '90 days')
        AND l.data <= CURRENT_DATE
        AND l.estorno_de_id IS NULL;

      v_media_diaria := v_saidas_90d / GREATEST(v_dias_janela, 1);

      IF v_saldo_geral > 0 AND v_media_diaria > 0 THEN
        v_runway_meses := ROUND((v_saldo_geral / v_media_diaria) / 30, 1);
      END IF;
    END;
  END IF;

  SELECT
    v_saldo_geral - COALESCE(SUM(
      CASE
        WHEN l.natureza = 'ENTRADA' THEN l.valor
        WHEN l.natureza = 'SAIDA' THEN -l.valor
        ELSE 0
      END
    ), 0)
  INTO v_saldo_mes_passado_final
  FROM lancamentos l
  JOIN tipos_operacao t ON t.id = l.tipo_operacao_id
  WHERE l.data >= v_inicio_mes
    AND l.estorno_de_id IS NULL
    AND NOT t.is_transferencia
    AND (
      (l.conta_origem_id IS NOT NULL AND pode_ver_conta(l.conta_origem_id))
      OR (l.conta_destino_id IS NOT NULL AND pode_ver_conta(l.conta_destino_id))
    );

  v_saldo_variacao_pct := CASE
    WHEN v_saldo_mes_passado_final <> 0
    THEN ROUND(((v_saldo_geral - v_saldo_mes_passado_final) / abs(v_saldo_mes_passado_final)) * 100, 2)
    ELSE 0
  END;

  SELECT COUNT(*) INTO v_solic_pendentes
  FROM solicitacoes_saldo
  WHERE status = 'PENDENTE';

  SELECT COUNT(*) INTO v_solic_ausencia_pendentes
  FROM solicitacoes_saldo
  WHERE aprovada_em_ausencia = true AND status = 'APROVADA';

  RETURN jsonb_build_object(
    'saldo_geral', v_saldo_geral,
    'saldo_contas', v_saldo_contas,
    'saldo_caixa_fisico', v_saldo_caixa,
    'saldo_investimentos', v_saldo_investimentos,
    'limite_total_configurado', v_limite_total_configurado,
    'limite_total_disponivel', v_limite_total_disponivel,
    'limite_consumido', v_limite_consumido,
    'pct_limite_consumido', v_pct_limite_consumido,
    'tarifas_mes_valor', v_tarifas_mes_valor,
    'tarifas_mes_count', v_tarifas_mes_count,
    'usou_limite_mes_count', v_usou_limite_mes_count,
    'contas_negativas_count', v_contas_negativas_count,
    'liquidez_imediata', v_liquidez_imediata,
    'runway_meses', v_runway_meses,
    'runway_dias_historico', v_dias_com_saida,
    'runway_saidas_90d', v_saidas_90d,
    'runway_media_diaria', v_media_diaria,
    'saldo_variacao_pct', v_saldo_variacao_pct,
    'solicitacoes_pendentes_count', v_solic_pendentes,
    'solicitacoes_ausencia_pendentes_count', v_solic_ausencia_pendentes
  );
END;
$function$;

-- 5) Lookup de contas: expõe a flag pra UI classificar (espelha is_caixa_fisico).
CREATE OR REPLACE VIEW public.v_contas_lookup WITH (security_invoker=true) AS
 SELECT id,
    apelido,
    is_caixa_fisico,
    is_investimento
   FROM contas_bancarias
  WHERE ativo = true;
