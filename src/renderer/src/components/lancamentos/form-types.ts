import type { Natureza } from '../../../../shared/domain'

/**
 * Form-state shape used by the React Hook Form instance. Mirrors
 * `lancamentoBaseSchema` but keeps `valor` as a number (parsed from BRL on
 * submit) and tolerates the empty-string sentinels produced by Select inputs.
 */
export interface LancamentoFormValues {
  data: string
  tipo_operacao_id: string
  natureza: Natureza
  valor: number
  conta_origem_id: string | null
  conta_destino_id: string | null
  centro_custo_id: string
  fornecedor_cliente_id: string | null
  descricao: string
  ri: string | null
  observacoes: string | null
}

export function defaultFormValues(): LancamentoFormValues {
  const today = new Date()
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return {
    data: iso,
    tipo_operacao_id: '',
    natureza: 'SAIDA',
    valor: 0,
    conta_origem_id: null,
    conta_destino_id: null,
    centro_custo_id: '',
    fornecedor_cliente_id: null,
    descricao: '',
    ri: null,
    observacoes: null,
  }
}
