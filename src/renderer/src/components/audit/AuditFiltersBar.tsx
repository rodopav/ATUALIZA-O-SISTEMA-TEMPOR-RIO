import * as React from 'react'
import { Card, CardContent } from '../ui/card'
import { Label } from '../ui/label'
import { Combobox, type ComboboxOption } from '../ui/combobox'
import { DatePicker } from '../ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import type { AcaoAudit } from '../../lib/dashboards-queries'
import type { Profile } from '../../types/profile'

const ALL_VALUE = '__all__'

const ACOES: AcaoAudit[] = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOCK',
  'UNLOCK',
  'APPROVE',
  'REJECT',
  'OVERRIDE',
]

const ACAO_LABELS: Record<AcaoAudit, string> = {
  CREATE: 'Criar',
  UPDATE: 'Atualizar',
  DELETE: 'Excluir',
  LOCK: 'Fechar período',
  UNLOCK: 'Reabrir período',
  APPROVE: 'Aprovar',
  REJECT: 'Rejeitar',
  OVERRIDE: 'Override',
}

const ENTIDADES = [
  'lancamentos',
  'periodos_fechados',
  'profiles',
  'contas_bancarias',
  'centros_de_custo',
  'tipos_operacao',
  'fornecedores_clientes',
  'empresas',
  'saldos_iniciais',
] as const

const ENTIDADE_LABELS: Record<(typeof ENTIDADES)[number], string> = {
  lancamentos: 'Lançamentos',
  periodos_fechados: 'Períodos Fechados',
  profiles: 'Usuários',
  contas_bancarias: 'Contas Bancárias',
  centros_de_custo: 'Centros de Custo',
  tipos_operacao: 'Tipos de Operação',
  fornecedores_clientes: 'Fornecedores/Clientes',
  empresas: 'Empresas',
  saldos_iniciais: 'Saldos Iniciais',
}

export interface AuditFiltersState {
  usuarioId: string | null
  entidade: string | null
  acao: AcaoAudit | null
  dataDe: string | null
  dataAte: string | null
}

export const defaultAuditFilters: AuditFiltersState = {
  usuarioId: null,
  entidade: null,
  acao: null,
  dataDe: null,
  dataAte: null,
}

interface AuditFiltersBarProps {
  value: AuditFiltersState
  onChange: (next: AuditFiltersState) => void
  profiles: Profile[]
  loadingProfiles?: boolean
}

export function AuditFiltersBar({
  value,
  onChange,
  profiles,
  loadingProfiles,
}: AuditFiltersBarProps): React.ReactElement {
  const profileOptions = React.useMemo<ComboboxOption[]>(
    () =>
      profiles.map((p) => ({
        value: p.id,
        label: p.nome_completo,
        hint: p.email,
      })),
    [profiles],
  )

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="audit-usuario">Usuário</Label>
          <Combobox
            id="audit-usuario"
            value={value.usuarioId}
            onChange={(next) => onChange({ ...value, usuarioId: next })}
            options={profileOptions}
            placeholder={
              loadingProfiles ? 'Carregando...' : 'Todos os usuários'
            }
            searchPlaceholder="Buscar usuário..."
            emptyMessage="Nenhum usuário encontrado."
            disabled={loadingProfiles}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="audit-entidade">Entidade</Label>
          <Select
            value={value.entidade ?? ALL_VALUE}
            onValueChange={(v) =>
              onChange({ ...value, entidade: v === ALL_VALUE ? null : v })
            }
          >
            <SelectTrigger id="audit-entidade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todas</SelectItem>
              {ENTIDADES.map((e) => (
                <SelectItem key={e} value={e}>
                  {ENTIDADE_LABELS[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="audit-acao">Ação</Label>
          <Select
            value={value.acao ?? ALL_VALUE}
            onValueChange={(v) =>
              onChange({
                ...value,
                acao: v === ALL_VALUE ? null : (v as AcaoAudit),
              })
            }
          >
            <SelectTrigger id="audit-acao">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todas</SelectItem>
              {ACOES.map((a) => (
                <SelectItem key={a} value={a}>
                  {ACAO_LABELS[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="audit-de">De</Label>
          <DatePicker
            id="audit-de"
            value={value.dataDe}
            onChange={(next) => onChange({ ...value, dataDe: next })}
            max={value.dataAte ?? undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="audit-ate">Até</Label>
          <DatePicker
            id="audit-ate"
            value={value.dataAte}
            onChange={(next) => onChange({ ...value, dataAte: next })}
            min={value.dataDe ?? undefined}
          />
        </div>
      </CardContent>
    </Card>
  )
}
