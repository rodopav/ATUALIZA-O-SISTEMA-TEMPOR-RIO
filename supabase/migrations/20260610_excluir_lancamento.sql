-- ============================================================
-- EXCLUIR LANÇAMENTO (hard delete) com justificativa + auditoria
-- Aplicar no Supabase Dashboard → SQL Editor → Run
-- ============================================================
-- Regras:
--  • Qualquer usuário autenticado e ATIVO pode excluir (pedido do PO).
--  • Justificativa obrigatória (mín. 10 caracteres) — vai pro audit_log.motivo.
--  • O trigger trg_audit_lancamento já grava a linha DELETE com o JSON
--    completo do lançamento (valores_antes) e o usuário (auth.uid()).
--    A função apenas preenche o motivo nessa mesma linha — NADA no
--    trigger existente é alterado.
--  • Mês fechado continua bloqueado (trigger lanc_check_periodo dispara
--    no DELETE normalmente).
--  • Guardas de integridade:
--      - lançamento com estorno vinculado → excluir o estorno primeiro
--      - lançamento conciliado → desfazer conciliação primeiro
--      - lançamento gerado por solicitação aprovada → não exclui direto
--        (preserva rastreabilidade do fluxo de aprovação)

CREATE OR REPLACE FUNCTION public.excluir_lancamento(
  p_lancamento_id uuid,
  p_motivo text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_ativo boolean;
  v_row   lancamentos%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada — faça login novamente.';
  END IF;

  SELECT ativo INTO v_ativo FROM profiles WHERE id = v_uid;
  IF NOT COALESCE(v_ativo, false) THEN
    RAISE EXCEPTION 'Usuário inativo ou sem perfil.';
  END IF;

  IF length(trim(COALESCE(p_motivo, ''))) < 10 THEN
    RAISE EXCEPTION 'Justificativa obrigatória (mínimo 10 caracteres).';
  END IF;

  SELECT * INTO v_row FROM lancamentos WHERE id = p_lancamento_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento não encontrado.';
  END IF;

  IF EXISTS (SELECT 1 FROM lancamentos WHERE estorno_de_id = p_lancamento_id) THEN
    RAISE EXCEPTION 'Este lançamento tem um estorno vinculado. Exclua o estorno primeiro.';
  END IF;

  IF v_row.conciliado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Lançamento conciliado. Desfaça a conciliação antes de excluir.';
  END IF;

  IF EXISTS (SELECT 1 FROM solicitacoes_saldo WHERE lancamento_gerado_id = p_lancamento_id) THEN
    RAISE EXCEPTION 'Este lançamento foi gerado por uma solicitação aprovada — use o fluxo de solicitações.';
  END IF;

  -- DELETE dispara os triggers existentes:
  --   lanc_check_periodo  → bloqueia mês fechado
  --   trg_audit_lancamento → grava DELETE no audit_log (com o JSON da linha)
  DELETE FROM lancamentos WHERE id = p_lancamento_id;

  -- Preenche a justificativa na linha de auditoria recém-criada pelo trigger.
  UPDATE audit_log
     SET motivo = trim(p_motivo)
   WHERE id = (
     SELECT max(id)
       FROM audit_log
      WHERE entidade = 'lancamentos'
        AND entidade_id = p_lancamento_id
        AND acao = 'DELETE'
   );
END;
$$;

-- Só usuário logado executa (anon não):
REVOKE ALL ON FUNCTION public.excluir_lancamento(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_lancamento(uuid, text) TO authenticated;
