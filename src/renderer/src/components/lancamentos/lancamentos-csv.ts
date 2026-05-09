import {
  brDateString,
  brlNumber,
  type CsvColumn,
} from '../../lib/csv-export'
import type { LancamentoRow } from '../../lib/lancamentos-queries'

export function buildLancamentosCsvColumns(): CsvColumn<LancamentoRow>[] {
  return [
    { header: 'Data', accessor: (r) => brDateString(r.data) },
    { header: 'RI', accessor: (r) => r.ri ?? '' },
    { header: 'Descrição', accessor: (r) => r.descricao },
    { header: 'Fornecedor/Cliente', accessor: (r) => r.fornecedor?.nome ?? '' },
    { header: 'Valor', accessor: (r) => brlNumber(r.valor) },
    { header: 'Natureza', accessor: (r) => r.natureza },
    { header: 'Operação', accessor: (r) => r.tipo?.nome ?? '' },
    { header: 'Conta Origem', accessor: (r) => r.conta_origem?.apelido ?? '' },
    { header: 'Conta Destino', accessor: (r) => r.conta_destino?.apelido ?? '' },
    { header: 'Centro de Custo', accessor: (r) => r.centro?.nome ?? '' },
    { header: 'Responsável', accessor: (r) => r.responsavel?.nome_completo ?? '' },
    {
      header: 'Conciliado em',
      accessor: (r) =>
        r.conciliado_em ? brDateString(r.conciliado_em.slice(0, 10)) : '',
    },
    {
      header: 'Conciliado por',
      accessor: (r) => r.conciliador?.nome_completo ?? '',
    },
    { header: 'Estorno de', accessor: (r) => r.estorno_de_id ?? '' },
  ]
}
