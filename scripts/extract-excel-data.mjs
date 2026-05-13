// Extrai dados da planilha SALDO GERAL copia.xlsx e produz JSON pronto para
// gerar SQL de import. Saída: scripts/import/excel-data.json
//
// Não conecta no Supabase — apenas leitura local.

import ExcelJS from 'exceljs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const xlsxPath = path.resolve(here, '..', '..', 'SALDO GERAL copia.xlsx')

const SHEET_TO_USER = {
  'FINANCEIRO - DERIK': 'derik@rodopav.com',
  'FINANCEIRO - JULIANA': 'juliana@rodopav.com',
  'FINANCEIRO - RH': 'rh@rodopav.com',
  'FINANCEIRO - YURI': 'yuri@rodopav.com',
  'FINANCEIRO - MARIA EDUARDA': 'maria@rodopav.com',
}

function trimStr(v) {
  if (v === null || v === undefined) return null
  if (typeof v === 'object') {
    if ('result' in v) return trimStr(v.result)
    if ('text' in v) return trimStr(v.text)
    if ('richText' in v && Array.isArray(v.richText)) {
      return v.richText.map((p) => p.text).join('').trim() || null
    }
    return null
  }
  const s = String(v).trim()
  return s.length === 0 ? null : s
}

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'object' && 'result' in v) return toNumber(v.result)
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function toDate(v) {
  if (!v) return null
  if (v instanceof Date) {
    const y = v.getUTCFullYear()
    const m = String(v.getUTCMonth() + 1).padStart(2, '0')
    const d = String(v.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof v === 'string') {
    // YYYY-MM-DD ou ISO
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
  }
  return null
}

async function main() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(xlsxPath)

  // 1. SALDOS INICIAIS — pega de SALDO GERAL (1 linha por usuário×conta).
  //    Como a planilha duplica a mesma conta por usuário, vamos AGRUPAR
  //    saldos por conta (somando) — mas na realidade cada conta aparece
  //    com o mesmo saldo inicial em todos os 5 responsáveis, então vamos
  //    pegar APENAS a primeira ocorrência por conta.
  const sg = wb.getWorksheet('SALDO GERAL')
  const saldosByConta = new Map() // apelido -> saldo_inicial
  for (let r = 2; r <= sg.rowCount; r++) {
    const row = sg.getRow(r)
    const banco = trimStr(row.getCell(2).value)
    const saldoInicial = toNumber(row.getCell(3).value)
    if (!banco || saldoInicial === null) continue
    if (!saldosByConta.has(banco)) saldosByConta.set(banco, saldoInicial)
  }

  // 2. LANCAMENTOS — coletar de cada sheet FINANCEIRO - <USER>
  const lancamentos = []
  const fornecedoresSet = new Set()
  const centrosSet = new Set()
  const tiposSet = new Set()
  const bancosSet = new Set()

  for (const [sheetName, userEmail] of Object.entries(SHEET_TO_USER)) {
    const ws = wb.getWorksheet(sheetName)
    if (!ws) continue
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r)
      const data = toDate(row.getCell(1).value)
      if (!data) continue
      const valor = toNumber(row.getCell(6).value)
      if (valor === null || valor === 0) continue
      const ri = trimStr(row.getCell(3).value)
      const fornecedor = trimStr(row.getCell(4).value)
      const descricao = trimStr(row.getCell(5).value)
      const natureza = trimStr(row.getCell(7).value)
      const tipo = trimStr(row.getCell(8).value)
      const bancoSaida = trimStr(row.getCell(9).value)
      const bancoEntrada = trimStr(row.getCell(10).value)
      const centro = trimStr(row.getCell(11).value)

      if (fornecedor) fornecedoresSet.add(fornecedor)
      if (centro) centrosSet.add(centro)
      if (tipo) tiposSet.add(tipo)
      if (bancoSaida) bancosSet.add(bancoSaida)
      if (bancoEntrada) bancosSet.add(bancoEntrada)

      lancamentos.push({
        data,
        valor,
        ri,
        fornecedor,
        descricao: descricao ?? '(sem descrição)',
        natureza,
        tipo,
        banco_saida: bancoSaida,
        banco_entrada: bancoEntrada,
        centro,
        responsavel_email: userEmail,
      })
    }
  }

  const out = {
    saldos_iniciais: Array.from(saldosByConta.entries()).map(([conta, saldo]) => ({
      conta,
      saldo,
    })),
    catalogos: {
      fornecedores: Array.from(fornecedoresSet).sort(),
      centros: Array.from(centrosSet).sort(),
      tipos: Array.from(tiposSet).sort(),
      bancos: Array.from(bancosSet).sort(),
    },
    lancamentos,
  }

  const outPath = path.resolve(here, 'import', 'excel-data.json')
  await writeFile(outPath, JSON.stringify(out, null, 2), 'utf8')
  console.log('Saída:', outPath)
  console.log('  saldos iniciais:', out.saldos_iniciais.length)
  console.log('  fornecedores:', out.catalogos.fornecedores.length)
  console.log('  centros:', out.catalogos.centros.length)
  console.log('  tipos:', out.catalogos.tipos.length)
  console.log('  bancos:', out.catalogos.bancos.length)
  console.log('  lancamentos:', out.lancamentos.length)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
