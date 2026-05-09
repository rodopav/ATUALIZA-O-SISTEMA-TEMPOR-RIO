// Importador de planilha Excel -> Supabase para o Sistema Financeiro Rodopav.
// Uso: pnpm import:excel "C:/caminho/para/SALDO GERAL copia.xlsx" [--apply]
//
// Por padrão o script roda em DRY-RUN: lê tudo, gera o relatório e
// NÃO grava no Supabase. Passe --apply para efetivar os inserts.

import { exec } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import ExcelJS from 'exceljs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import type { Database } from '../src/shared/database.types.js'
import { loadCatalogs, makeFornecedorResolver } from './import/catalogs.js'
import { insertLancamentosBatched, upsertSaldosIniciais } from './import/db.js'
import { pairTransferencias, processSheet, readSaldosIniciais } from './import/excel.js'
import { writeReport } from './import/report.js'
import {
  SALDO_GERAL_SHEET,
  SHEET_RESPONSAVEL_MAP,
  type EnvVars,
  type ImportError,
  type ImportStats,
  type ImportWarning,
  type ProcessedRow,
} from './import/types.js'

// --------- Logging ---------

function tsNow(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function log(msg: string): void {
  console.log(`[${tsNow()}] ${msg}`)
}

function warn(msg: string): void {
  console.warn(`[${tsNow()}] AVISO: ${msg}`)
}

function err(msg: string): void {
  console.error(`[${tsNow()}] ERRO: ${msg}`)
}

// --------- Env ---------

const envSchema = z.object({
  SUPABASE_URL: z.string().url().default('https://rhhmdjipigvtfrzwzchh.supabase.co'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, 'SUPABASE_SERVICE_ROLE_KEY ausente ou inválida.'),
})

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key) out[key] = value
  }
  return out
}

async function loadEnv(): Promise<EnvVars> {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.resolve(here, '..', '.env.local'),
    path.resolve(process.cwd(), '.env.local'),
  ]

  let parsed: Record<string, string> = {}
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const content = await readFile(candidate, 'utf8')
      parsed = parseEnvFile(content)
      log(`.env.local carregado de ${candidate}`)
      break
    }
  }

  const merged = { ...process.env, ...parsed }
  const result = envSchema.safeParse(merged)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(
      `Variáveis de ambiente inválidas:\n${issues}\n\n` +
        'Crie um arquivo .env.local com SUPABASE_SERVICE_ROLE_KEY=...',
    )
  }
  return result.data
}

// --------- Supabase ---------

function connectSupabase(env: EnvVars): SupabaseClient<Database> {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// --------- CLI ---------

function printHelp(): void {
  const help = `
Importador de planilha Excel para Supabase — Sistema Financeiro Rodopav

Uso:
  pnpm import:excel <caminho-do-xlsx> [--apply]

Opções:
  --apply        Efetiva inserts/upserts no Supabase (sem este flag o script roda em DRY-RUN).
  -h, --help     Mostra esta ajuda.

Variáveis de ambiente (.env.local):
  SUPABASE_URL                 URL do projeto Supabase (default: https://rhhmdjipigvtfrzwzchh.supabase.co)
  SUPABASE_SERVICE_ROLE_KEY    Service role key (obrigatório).

Saída:
  Gera "import-report.html" no diretório atual, com sumário, pares detectados, avisos e erros.
`
  console.log(help.trim())
}

type CliArgs = { xlsxPath: string; apply: boolean }

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2)
  if (args.includes('-h') || args.includes('--help')) {
    printHelp()
    process.exit(0)
  }
  let apply = false
  let xlsxPath: string | null = null
  for (const a of args) {
    if (a === '--apply') {
      apply = true
    } else if (!a.startsWith('--')) {
      xlsxPath = a
    } else {
      err(`Argumento desconhecido: ${a}`)
      printHelp()
      process.exit(2)
    }
  }
  if (!xlsxPath) {
    err('Caminho do XLSX não informado.')
    printHelp()
    process.exit(2)
  }
  return { xlsxPath, apply }
}

// --------- Pipeline ---------

async function main(): Promise<void> {
  const startedAt = new Date().toISOString()
  const args = parseArgs(process.argv)
  const xlsxPath = path.resolve(args.xlsxPath)

  if (!existsSync(xlsxPath)) {
    err(`Arquivo XLSX não encontrado: ${xlsxPath}`)
    process.exit(2)
  }

  log(`Modo: ${args.apply ? 'APPLY (escreve no Supabase)' : 'DRY-RUN (não escreve)'}`)
  log(`Arquivo: ${xlsxPath}`)

  const env = await loadEnv()
  const client = connectSupabase(env)
  const catalogs = await loadCatalogs(client, log)

  log('Lendo XLSX...')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(xlsxPath)

  const fornecedorCounter = { created: 0 }
  const fornecedorResolver = makeFornecedorResolver({
    client,
    catalogs,
    apply: args.apply,
    counter: fornecedorCounter,
  })

  const allRows: ProcessedRow[] = []
  const allWarnings: ImportWarning[] = []
  const allErrors: ImportError[] = []
  const sheetSummary: ImportStats['sheetSummary'] = []
  let totalRead = 0

  for (const [sheetName, responsavelKey] of SHEET_RESPONSAVEL_MAP.entries()) {
    const sheet = workbook.getWorksheet(sheetName)
    if (!sheet) {
      warn(`Aba "${sheetName}" não encontrada no XLSX. Pulando.`)
      allWarnings.push({
        kind: 'sheet_ignorada',
        sheet: sheetName,
        row: null,
        column: null,
        value: null,
        message: 'Aba não encontrada no arquivo XLSX.',
      })
      sheetSummary.push({ sheet: sheetName, lidas: 0, processadas: 0, pulos: 0 })
      continue
    }

    let responsavelId: string | null = null
    for (const [nomeNorm, id] of catalogs.profiles.entries()) {
      if (nomeNorm.includes(responsavelKey)) {
        responsavelId = id
        break
      }
    }
    if (!responsavelId) {
      warn(
        `Responsável "${responsavelKey}" não encontrado em profiles. Pulando aba "${sheetName}".`,
      )
      allWarnings.push({
        kind: 'responsavel_nao_encontrado',
        sheet: sheetName,
        row: null,
        column: null,
        value: responsavelKey,
        message: 'Profile não encontrado por ILIKE em nome_completo. Aba inteira ignorada.',
      })
      sheetSummary.push({ sheet: sheetName, lidas: 0, processadas: 0, pulos: 0 })
      continue
    }

    log(`Processando aba "${sheetName}" (responsável: ${responsavelKey})...`)
    const result = await processSheet({
      sheet,
      responsavelId,
      catalogs,
      fornecedorResolver,
    })
    allRows.push(...result.rows)
    allWarnings.push(...result.warnings)
    allErrors.push(...result.errors)
    totalRead += result.rowsRead
    sheetSummary.push({
      sheet: sheetName,
      lidas: result.rowsRead,
      processadas: result.rows.length,
      pulos: result.rowsRead - result.rows.length,
    })
    log(
      `Aba "${sheetName}": ${result.rowsRead} linhas lidas, ${result.rows.length} candidatas, ` +
        `${result.warnings.length} avisos.`,
    )
  }

  log('Tentando parear transferências...')
  const { paired, pairs, warnings: pairWarnings } = pairTransferencias(allRows)
  allWarnings.push(...pairWarnings)
  log(`Pares detectados: ${pairs.length}. Linhas finais: ${paired.length}.`)

  // Ordena por data + sheet + linha original para estabilidade.
  paired.sort((a, b) => {
    if (a.insert.data < b.insert.data) return -1
    if (a.insert.data > b.insert.data) return 1
    if (a.sourceSheet < b.sourceSheet) return -1
    if (a.sourceSheet > b.sourceSheet) return 1
    return a.sourceRow - b.sourceRow
  })

  const insertResp = await insertLancamentosBatched(
    client,
    paired.map((r) => r.insert),
    args.apply,
    log,
  )
  allErrors.push(...insertResp.errors)

  // Saldos iniciais.
  let saldosCount = 0
  const saldoSheet = workbook.getWorksheet(SALDO_GERAL_SHEET)
  if (!saldoSheet) {
    warn(`Aba "${SALDO_GERAL_SHEET}" não encontrada — saldos iniciais ignorados.`)
    allWarnings.push({
      kind: 'sheet_ignorada',
      sheet: SALDO_GERAL_SHEET,
      row: null,
      column: null,
      value: null,
      message: 'Aba "SALDO GERAL" não encontrada no XLSX.',
    })
  } else {
    log(`Lendo saldos iniciais da aba "${SALDO_GERAL_SHEET}"...`)
    const { saldos, warnings: saldoWarnings } = readSaldosIniciais(saldoSheet)
    allWarnings.push(...saldoWarnings)
    const upsertResp = await upsertSaldosIniciais({
      client,
      catalogs,
      saldos,
      apply: args.apply,
      log,
    })
    allWarnings.push(...upsertResp.warnings)
    allErrors.push(...upsertResp.errors)
    saldosCount = upsertResp.count
  }

  const stats: ImportStats = {
    startedAt,
    finishedAt: new Date().toISOString(),
    xlsxPath,
    rowsRead: totalRead,
    rowsInserted: insertResp.inserted,
    rowsSkipped: totalRead - paired.length,
    saldosUpserted: saldosCount,
    fornecedoresCriados: fornecedorCounter.created,
    pairsDetected: pairs,
    warnings: allWarnings,
    errors: allErrors,
    sheetSummary,
  }

  const reportPath = path.resolve(process.cwd(), 'import-report.html')
  await writeReport(reportPath, stats)
  log(`Relatório gerado: ${reportPath}`)

  console.log(
    [
      '',
      '=== RESUMO ===',
      `Lidas:                ${stats.rowsRead}`,
      `Inseridas:            ${stats.rowsInserted}${args.apply ? '' : ' (dry-run)'}`,
      `Puladas:              ${stats.rowsSkipped}`,
      `Pares transferência:  ${stats.pairsDetected.length}`,
      `Saldos upserted:      ${stats.saldosUpserted}${args.apply ? '' : ' (dry-run)'}`,
      `Fornecedores novos:   ${stats.fornecedoresCriados}`,
      `Avisos:               ${stats.warnings.length}`,
      `Erros:                ${stats.errors.length}`,
      '',
    ].join('\n'),
  )

  if (process.platform === 'win32') {
    exec(`start "" "${reportPath}"`, (e) => {
      if (e) warn(`Não consegui abrir o relatório no navegador: ${e.message}`)
    })
  } else if (process.platform === 'darwin') {
    exec(`open "${reportPath}"`)
  } else {
    log(`Abra manualmente: ${reportPath}`)
  }

  process.exit(stats.errors.length > 0 ? 1 : 0)
}

main().catch((e: unknown) => {
  const message = e instanceof Error ? e.message : String(e)
  err(message)
  if (e instanceof Error && e.stack) console.error(e.stack)
  process.exit(1)
})
