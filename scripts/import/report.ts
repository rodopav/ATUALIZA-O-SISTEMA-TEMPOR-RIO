// Geração do relatório HTML em pt-BR.

import { writeFile } from 'node:fs/promises'

import type { ImportError, ImportStats, ImportWarning, TransferPair } from './types.js'

function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return ''
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pairsTable(pairs: TransferPair[]): string {
  if (pairs.length === 0) {
    return '<p class="empty">Nenhum par de transferência detectado.</p>'
  }
  const rows = pairs
    .map(
      (p) => `<tr>
      <td>${escapeHtml(p.sheet)}</td>
      <td>${escapeHtml(p.rowEntrada)}</td>
      <td>${escapeHtml(p.rowSaida)}</td>
      <td>${escapeHtml(p.data)}</td>
      <td class="num">${formatNumber(p.valor)}</td>
      <td>${escapeHtml(p.descricao)}</td>
    </tr>`,
    )
    .join('\n')
  return `<table>
    <thead><tr>
      <th>Aba</th>
      <th>Linha Entrada</th>
      <th>Linha Saída</th>
      <th>Data</th>
      <th>Valor</th>
      <th>Descrição</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

function warningsTable(warnings: ImportWarning[]): string {
  if (warnings.length === 0) return '<p class="empty">Sem avisos.</p>'
  const rows = warnings
    .map(
      (w) => `<tr>
      <td><span class="badge badge-warn">${escapeHtml(w.kind)}</span></td>
      <td>${escapeHtml(w.sheet)}</td>
      <td>${escapeHtml(w.row ?? '-')}</td>
      <td>${escapeHtml(w.column ?? '-')}</td>
      <td>${escapeHtml(w.value ?? '-')}</td>
      <td>${escapeHtml(w.message)}</td>
    </tr>`,
    )
    .join('\n')
  return `<table>
    <thead><tr>
      <th>Tipo</th>
      <th>Aba</th>
      <th>Linha</th>
      <th>Coluna</th>
      <th>Valor</th>
      <th>Mensagem</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

function errorsTable(errors: ImportError[]): string {
  if (errors.length === 0) return '<p class="empty">Sem erros.</p>'
  const rows = errors
    .map(
      (e) => `<tr>
      <td>${escapeHtml(e.sheet)}</td>
      <td>${escapeHtml(e.row ?? '-')}</td>
      <td>${escapeHtml(e.message)}</td>
    </tr>`,
    )
    .join('\n')
  return `<table>
    <thead><tr>
      <th>Aba</th>
      <th>Linha</th>
      <th>Erro</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

function summaryHtml(stats: ImportStats): string {
  return `<div class="cards">
    <div class="card"><div class="value">${stats.rowsRead}</div><div class="label">Linhas lidas</div></div>
    <div class="card success"><div class="value">${stats.rowsInserted}</div><div class="label">Lançamentos inseridos</div></div>
    <div class="card warn"><div class="value">${stats.rowsSkipped}</div><div class="label">Linhas puladas</div></div>
    <div class="card info"><div class="value">${stats.saldosUpserted}</div><div class="label">Saldos iniciais (upsert)</div></div>
    <div class="card info"><div class="value">${stats.fornecedoresCriados}</div><div class="label">Fornecedores criados</div></div>
    <div class="card error"><div class="value">${stats.errors.length}</div><div class="label">Erros</div></div>
  </div>`
}

function sheetSummaryTable(stats: ImportStats): string {
  if (stats.sheetSummary.length === 0) return ''
  const rows = stats.sheetSummary
    .map(
      (s) => `<tr>
      <td>${escapeHtml(s.sheet)}</td>
      <td class="num">${s.lidas}</td>
      <td class="num">${s.processadas}</td>
      <td class="num">${s.pulos}</td>
    </tr>`,
    )
    .join('\n')
  return `<table>
    <thead><tr><th>Aba</th><th>Lidas</th><th>Processadas</th><th>Puladas</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

export function renderReport(stats: ImportStats): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório de Importação — Sistema Financeiro Rodopav</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           margin: 0; padding: 24px; background: #f5f6f8; color: #1a1a1a; }
    h1 { margin: 0 0 8px; }
    h2 { margin: 32px 0 12px; border-bottom: 1px solid #d8dde2; padding-bottom: 6px; }
    .meta { color: #5b6470; font-size: 14px; margin-bottom: 24px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
             gap: 12px; margin-bottom: 16px; }
    .card { background: #fff; border-radius: 10px; padding: 16px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05); border-left: 4px solid #888; }
    .card.success { border-left-color: #16a34a; }
    .card.warn    { border-left-color: #d97706; }
    .card.info    { border-left-color: #2563eb; }
    .card.error   { border-left-color: #dc2626; }
    .card .value  { font-size: 28px; font-weight: 600; }
    .card .label  { color: #5b6470; font-size: 13px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; background: #fff;
            border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    th, td { padding: 8px 12px; text-align: left; font-size: 13px;
             border-bottom: 1px solid #eef0f3; vertical-align: top; }
    th { background: #f0f2f5; font-weight: 600; color: #1a1a1a; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px;
             font-size: 11px; font-weight: 600; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .empty { color: #5b6470; font-style: italic; }
    code { background: #eef0f3; padding: 1px 4px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Relatório de Importação</h1>
  <p class="meta">
    Arquivo: <code>${escapeHtml(stats.xlsxPath)}</code><br/>
    Início: ${escapeHtml(stats.startedAt)} — Fim: ${escapeHtml(stats.finishedAt)}
  </p>

  <h2>Resumo</h2>
  ${summaryHtml(stats)}

  <h3>Por aba</h3>
  ${sheetSummaryTable(stats)}

  <h2>Pares de transferência detectados (${stats.pairsDetected.length})</h2>
  ${pairsTable(stats.pairsDetected)}

  <h2>Avisos (${stats.warnings.length})</h2>
  ${warningsTable(stats.warnings)}

  <h2>Erros (${stats.errors.length})</h2>
  ${errorsTable(stats.errors)}
</body>
</html>`
}

export async function writeReport(htmlPath: string, stats: ImportStats): Promise<void> {
  const html = renderReport(stats)
  await writeFile(htmlPath, html, 'utf8')
}
