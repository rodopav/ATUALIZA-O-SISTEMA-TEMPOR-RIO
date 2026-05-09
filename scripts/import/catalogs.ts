// Carregamento dos catálogos (contas, centros, tipos, profiles, fornecedores)
// e resolver de fornecedores (com cache + criação on-demand).

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '../../src/shared/database.types.js'
import { fuzzyLookup, normalize } from './match.js'
import type { Catalogs, FornecedorInsert } from './types.js'

export async function loadCatalogs(
  client: SupabaseClient<Database>,
  log: (msg: string) => void,
): Promise<Catalogs> {
  log('Carregando catálogos do Supabase...')

  const contas: Map<string, string> = new Map()
  const contasRaw: Map<string, string> = new Map()
  const centros: Map<string, string> = new Map()
  const centrosRaw: Map<string, string> = new Map()
  const tipos: Map<string, { id: string; isTransferencia: boolean }> = new Map()
  const tiposRaw: Map<string, string> = new Map()
  const profiles: Map<string, string> = new Map()
  const fornecedores: Map<string, string> = new Map()

  const contasResp = await client.from('contas_bancarias').select('id, apelido')
  if (contasResp.error) throw new Error(`Erro ao carregar contas: ${contasResp.error.message}`)
  for (const c of contasResp.data ?? []) {
    const norm = normalize(c.apelido)
    contas.set(norm, c.id)
    contasRaw.set(norm, c.apelido)
  }

  const centrosResp = await client.from('centros_de_custo').select('id, nome, codigo')
  if (centrosResp.error)
    throw new Error(`Erro ao carregar centros de custo: ${centrosResp.error.message}`)
  for (const c of centrosResp.data ?? []) {
    const norm = normalize(c.nome)
    centros.set(norm, c.id)
    centrosRaw.set(norm, c.nome)
    const normCodigo = normalize(c.codigo)
    if (normCodigo && !centros.has(normCodigo)) {
      centros.set(normCodigo, c.id)
      centrosRaw.set(normCodigo, c.codigo)
    }
  }

  const tiposResp = await client
    .from('tipos_operacao')
    .select('id, nome, codigo, is_transferencia')
  if (tiposResp.error) throw new Error(`Erro ao carregar tipos: ${tiposResp.error.message}`)
  for (const t of tiposResp.data ?? []) {
    const norm = normalize(t.nome)
    tipos.set(norm, { id: t.id, isTransferencia: t.is_transferencia })
    tiposRaw.set(norm, t.nome)
    const normCod = normalize(t.codigo)
    if (normCod && !tipos.has(normCod)) {
      tipos.set(normCod, { id: t.id, isTransferencia: t.is_transferencia })
      tiposRaw.set(normCod, t.codigo)
    }
  }

  const profilesResp = await client.from('profiles').select('id, nome_completo')
  if (profilesResp.error)
    throw new Error(`Erro ao carregar profiles: ${profilesResp.error.message}`)
  for (const p of profilesResp.data ?? []) {
    profiles.set(normalize(p.nome_completo), p.id)
  }

  const fornResp = await client.from('fornecedores_clientes').select('id, nome')
  if (fornResp.error) throw new Error(`Erro ao carregar fornecedores: ${fornResp.error.message}`)
  for (const f of fornResp.data ?? []) {
    fornecedores.set(normalize(f.nome), f.id)
  }

  log(
    `Catálogos prontos: ${contas.size} contas, ${centros.size} centros, ${tipos.size} tipos, ` +
      `${profiles.size} profiles, ${fornecedores.size} fornecedores.`,
  )

  return { contas, contasRaw, centros, centrosRaw, tipos, tiposRaw, profiles, fornecedores }
}

export type FornecedorResolver = (
  rawName: string,
) => Promise<{ id: string; created: boolean } | null>

export function makeFornecedorResolver(args: {
  client: SupabaseClient<Database>
  catalogs: Catalogs
  apply: boolean
  counter: { created: number }
}): FornecedorResolver {
  const { client, catalogs, apply, counter } = args
  const cache: Map<string, string> = new Map()

  return async (rawName: string) => {
    const norm = normalize(rawName)
    if (!norm) return null

    const cached = cache.get(norm)
    if (cached) return { id: cached, created: false }

    const existing = fuzzyLookup(catalogs.fornecedores, rawName)
    if (existing) {
      cache.set(norm, existing)
      return { id: existing, created: false }
    }

    if (!apply) {
      // Em dry-run usamos um pseudo-id (não é gravado em lugar nenhum) só para
      // distinguir fornecedores novos no relatório.
      const pseudoId = `dryrun:${norm}`
      cache.set(norm, pseudoId)
      catalogs.fornecedores.set(norm, pseudoId)
      counter.created += 1
      return { id: pseudoId, created: true }
    }

    const insert: FornecedorInsert = {
      nome: rawName.trim(),
      tipo: 'PJ',
      documento: null,
    }
    const resp = await client
      .from('fornecedores_clientes')
      .insert(insert)
      .select('id')
      .single()
    if (resp.error || !resp.data) {
      throw new Error(
        `Falha ao inserir fornecedor "${rawName}": ${resp.error?.message ?? 'sem dados retornados'}`,
      )
    }
    cache.set(norm, resp.data.id)
    catalogs.fornecedores.set(norm, resp.data.id)
    counter.created += 1
    return { id: resp.data.id, created: true }
  }
}
