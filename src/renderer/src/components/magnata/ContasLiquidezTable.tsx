import * as React from 'react'
import { Building2 } from 'lucide-react'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { cn } from '../../lib/cn'
import { formatBRL } from '../../lib/format'
import type { ContaSaldoRow } from '../../lib/magnata-queries'

interface ContasLiquidezTableProps {
  contas: ContaSaldoRow[]
}

const TODAS = '__todas__'

const TIPO_LABEL: Record<string, string> = {
  CORRENTE: 'Corrente',
  POUPANCA: 'Poupança',
  CAIXA_FISICO: 'Caixa Físico',
  CARTAO_CREDITO_CONTA: 'Cartão',
}

function statusOfSaldo(saldo: number, tipo: string | null): {
  color: string
  text: string
} {
  if (tipo === 'CARTAO_CREDITO_CONTA') {
    return { color: 'bg-blu-600/15 text-blu-600', text: 'Crédito' }
  }
  if (saldo <= 0) {
    return { color: 'bg-destructive/15 text-destructive', text: 'Crítico' }
  }
  if (saldo < 5000) {
    return { color: 'bg-amb-400/15 text-amb-600', text: 'Baixo' }
  }
  return { color: 'bg-success/15 text-success', text: 'OK' }
}

export function ContasLiquidezTable({
  contas,
}: ContasLiquidezTableProps): React.ReactElement {
  const [empresaFiltro, setEmpresaFiltro] = React.useState<string>(TODAS)

  const empresas = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const c of contas) {
      if (c.empresa_id && c.empresa) map.set(c.empresa_id, c.empresa)
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
  }, [contas])

  const filtered = React.useMemo(() => {
    if (empresaFiltro === TODAS) return contas
    return contas.filter((c) => c.empresa_id === empresaFiltro)
  }, [contas, empresaFiltro])

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label className="flex items-center gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            Filtrar por empresa
          </Label>
          <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
            <SelectTrigger className="h-9 w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas as empresas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="ml-auto text-xs text-muted-foreground">
          {filtered.length} de {contas.length} conta(s)
        </p>
      </div>

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Conta</th>
                <th className="px-3 py-2 font-medium">Empresa</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 text-right font-medium">Saldo</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Nenhuma conta encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const saldo = Number(c.saldo_atual ?? 0)
                  const st = statusOfSaldo(saldo, c.tipo)
                  return (
                    <tr key={c.conta_id} className="border-t">
                      <td className="px-3 py-2 font-medium">{c.apelido ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {c.empresa ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {TIPO_LABEL[c.tipo ?? ''] ?? '—'}
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2 text-right tabular-nums font-semibold',
                          saldo < 0 ? 'text-destructive' : 'text-foreground',
                        )}
                      >
                        {formatBRL(saldo)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            st.color,
                          )}
                        >
                          {st.text}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
