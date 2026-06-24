-- ============================================================
-- v_contas_saldo: expõe is_caixa_fisico e is_investimento por conta,
-- pra o dashboard montar as boxes "Caixa Físico por conta" e
-- "Investimentos por conta" (igual à de cheque especial).
-- A view já respeita RLS (security_invoker) e traz saldo/banco/empresa.
-- Aplicar DEPOIS da migration 20260611_investimentos.sql.
-- ============================================================
CREATE OR REPLACE VIEW public.v_contas_saldo WITH (security_invoker=on) AS
 SELECT c.id AS conta_id,
    c.apelido,
    c.tipo,
    c.banco,
    c.numero,
    c.empresa_id,
    e.razao_social AS empresa,
    c.ativo,
    saldo_atual_conta(c.id) AS saldo_atual,
    c.is_caixa_fisico,
    c.is_investimento
   FROM contas_bancarias c
     JOIN empresas e ON e.id = c.empresa_id
  WHERE c.ativo = true;
