import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { LancamentoFormValues } from './form-types'
import type { LancamentoRow } from '../../lib/lancamentos-queries'

interface UseSaveLancamentoArgs {
  session: Session | null
  editingId: string | undefined
  onSuccess: (id: string) => void
  onError: (err: unknown) => void
}

export function useSaveLancamento({
  session,
  editingId,
  onSuccess,
  onError,
}: UseSaveLancamentoArgs) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: LancamentoFormValues): Promise<string> => {
      if (!session) throw new Error('Sessão expirada.')

      const payload = {
        data: values.data,
        descricao: values.descricao.trim(),
        valor: values.valor,
        natureza: values.natureza,
        tipo_operacao_id: values.tipo_operacao_id,
        centro_custo_id: values.centro_custo_id,
        conta_origem_id: values.conta_origem_id,
        conta_destino_id: values.conta_destino_id,
        fornecedor_cliente_id: values.fornecedor_cliente_id,
        ri: values.ri,
        observacoes: values.observacoes,
        responsavel_id: session.user.id,
      }

      if (editingId) {
        const { error } = await supabase
          .from('lancamentos')
          .update(payload)
          .eq('id', editingId)
        if (error) throw error
        return editingId
      }

      const { data, error } = await supabase
        .from('lancamentos')
        .insert(payload)
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: ['lancamentos'] })
      // Saldos de conta mudam após lançamento; invalida o cache de selectors.
      void qc.invalidateQueries({ queryKey: ['contas-saldo'] })
      onSuccess(id)
    },
    onError,
  })
}

export function rowToFormValues(row: LancamentoRow): LancamentoFormValues {
  return {
    data: row.data,
    tipo_operacao_id: row.tipo_operacao_id,
    natureza: row.natureza,
    valor: Number(row.valor),
    conta_origem_id: row.conta_origem_id,
    conta_destino_id: row.conta_destino_id,
    centro_custo_id: row.centro_custo_id,
    fornecedor_cliente_id: row.fornecedor_cliente_id,
    descricao: row.descricao,
    ri: row.ri,
    observacoes: row.observacoes,
  }
}
