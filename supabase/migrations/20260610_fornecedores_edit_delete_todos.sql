-- ============================================================
-- FORNECEDORES/CLIENTES: editar e excluir liberado pra TODOS
-- os usuários autenticados (antes: UPDATE/DELETE eram só-admin).
-- Aplicar no Supabase Dashboard -> SQL Editor -> Run.
-- ============================================================
-- A trava de integridade continua na FK lancamentos.fornecedor_cliente_id:
-- um fornecedor com lançamentos vinculados NÃO pode ser apagado (o banco
-- bloqueia com erro 23503 e a UI orienta a desativar). SELECT e INSERT
-- ficam como estão — todos já leem o catálogo e cadastram novos.

ALTER TABLE public.fornecedores_clientes ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas de UPDATE/DELETE (eram restritas a admin),
-- pra não sobrar regra conflitante.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'fornecedores_clientes'
       AND cmd IN ('UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.fornecedores_clientes', pol.policyname);
  END LOOP;
END $$;

-- Qualquer usuário autenticado pode EDITAR...
CREATE POLICY fornecedores_update_todos
  ON public.fornecedores_clientes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ...e EXCLUIR (a FK protege contra lançamentos órfãos).
CREATE POLICY fornecedores_delete_todos
  ON public.fornecedores_clientes
  FOR DELETE
  TO authenticated
  USING (true);
