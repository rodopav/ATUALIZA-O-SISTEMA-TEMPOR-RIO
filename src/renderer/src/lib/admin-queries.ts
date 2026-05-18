import { queryOptions } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Tables } from '../../../shared/database.types'

export type Empresa = Tables<'empresas'>
export type ContaBancaria = Tables<'contas_bancarias'>
export type CentroCusto = Tables<'centros_de_custo'>
export type TipoOperacao = Tables<'tipos_operacao'>
export type FornecedorCliente = Tables<'fornecedores_clientes'>
export type Profile = Tables<'profiles'>
export type SaldoInicial = Tables<'saldos_iniciais'>
export type PeriodoFechado = Tables<'periodos_fechados'>

const FIVE_MIN = 1000 * 60 * 5
const ONE_MIN = 1000 * 60

export const adminKeys = {
  empresas: ['admin', 'empresas'] as const,
  contas: ['admin', 'contas'] as const,
  centros: ['admin', 'centros'] as const,
  tipos: ['admin', 'tipos'] as const,
  fornecedores: ['admin', 'fornecedores'] as const,
  profiles: ['admin', 'profiles'] as const,
  saldosIniciais: (periodo?: string | null) =>
    ['admin', 'saldos_iniciais', periodo ?? 'all'] as const,
  periodosFechados: ['admin', 'periodos_fechados'] as const,
}

// ---------- Plain fetchers (also used directly by CrudPage callers) ----------

export async function fetchEmpresas(): Promise<Empresa[]> {
  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .order('razao_social', { ascending: true })
  if (error) throw error
  return data ?? []
}

export interface ContaWithEmpresa extends ContaBancaria {
  empresa: { razao_social: string; nome_fantasia: string | null } | null
  limite?: { valor_limite: number; ativo: boolean } | null
}

export async function fetchContas(): Promise<ContaWithEmpresa[]> {
  const { data, error } = await supabase
    .from('contas_bancarias')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select(
      '*, empresa:empresas(razao_social, nome_fantasia), limite:limites_conta(valor_limite, ativo)' as any,
    )
    .order('apelido', { ascending: true })
  if (error) throw error
  // limite vem como array (FK reverse). Achatar pra single (PK 1:1).
  type Raw = Omit<ContaWithEmpresa, 'limite'> & {
    limite?: Array<{ valor_limite: number; ativo: boolean }> | null
  }
  const rows = (data ?? []) as unknown as Raw[]
  return rows.map<ContaWithEmpresa>((r) => {
    const arr = Array.isArray(r.limite) ? r.limite : null
    const lim = arr?.find((l) => l.ativo) ?? null
    return { ...r, limite: lim }
  })
}

export async function fetchCentros(): Promise<CentroCusto[]> {
  const { data, error } = await supabase
    .from('centros_de_custo')
    .select('*')
    .order('codigo', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchTipos(): Promise<TipoOperacao[]> {
  const { data, error } = await supabase
    .from('tipos_operacao')
    .select('*')
    .order('codigo', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchFornecedores(): Promise<FornecedorCliente[]> {
  const { data, error } = await supabase
    .from('fornecedores_clientes')
    .select('*')
    .order('nome', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('nome_completo', { ascending: true })
  if (error) throw error
  return data ?? []
}

export interface SaldoInicialWithJoins extends SaldoInicial {
  conta: {
    apelido: string
    empresa: { razao_social: string } | null
  } | null
  criador: { nome_completo: string } | null
}

export async function fetchSaldosIniciais(
  periodo: string | null,
): Promise<SaldoInicialWithJoins[]> {
  let q = supabase
    .from('saldos_iniciais')
    .select(
      'id, conta_id, periodo, valor, created_at, created_by, conta:contas_bancarias(apelido, empresa:empresas(razao_social)), criador:profiles!created_by(nome_completo)',
    )
    .order('periodo', { ascending: false })
    .order('created_at', { ascending: false })

  if (periodo) q = q.eq('periodo', periodo)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as SaldoInicialWithJoins[]
}

export interface PeriodoFechadoWithJoins extends PeriodoFechado {
  fechador: { nome_completo: string } | null
  reabridor: { nome_completo: string } | null
}

export async function fetchPeriodosFechados(): Promise<PeriodoFechadoWithJoins[]> {
  const { data, error } = await supabase
    .from('periodos_fechados')
    .select(
      'id, periodo, fechado_em, fechado_por, reaberto_em, reaberto_por, motivo_reabertura, totals_hash, fechador:profiles!fechado_por(nome_completo), reabridor:profiles!reaberto_por(nome_completo)',
    )
    .order('periodo', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as PeriodoFechadoWithJoins[]
}

// ---------- queryOptions wrappers (for direct useQuery usage) ----------

export const empresasAdminQuery = queryOptions({
  queryKey: adminKeys.empresas,
  queryFn: fetchEmpresas,
  staleTime: FIVE_MIN,
})

export const contasAdminQuery = queryOptions({
  queryKey: adminKeys.contas,
  queryFn: fetchContas,
  staleTime: FIVE_MIN,
})

export const centrosAdminQuery = queryOptions({
  queryKey: adminKeys.centros,
  queryFn: fetchCentros,
  staleTime: FIVE_MIN,
})

export const tiposAdminQuery = queryOptions({
  queryKey: adminKeys.tipos,
  queryFn: fetchTipos,
  staleTime: FIVE_MIN,
})

export const fornecedoresAdminQuery = queryOptions({
  queryKey: adminKeys.fornecedores,
  queryFn: fetchFornecedores,
  staleTime: ONE_MIN,
})

export const profilesAdminQuery = queryOptions({
  queryKey: adminKeys.profiles,
  queryFn: fetchProfiles,
  staleTime: ONE_MIN,
})

export const saldosIniciaisAdminQuery = (periodo: string | null) =>
  queryOptions({
    queryKey: adminKeys.saldosIniciais(periodo),
    queryFn: () => fetchSaldosIniciais(periodo),
    staleTime: ONE_MIN,
  })

export const periodosFechadosAdminQuery = queryOptions({
  queryKey: adminKeys.periodosFechados,
  queryFn: fetchPeriodosFechados,
  staleTime: ONE_MIN,
})
