// Gera SQL de import a partir do excel-data.json + mapeamento de contas/users
// Produz 3 arquivos:
//   import/01-cadastros.sql   — fornecedores, normaliza nomes
//   import/02-saldos.sql      — saldos_iniciais por conta
//   import/03-lancamentos.sql — lancamentos em batches

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dataPath = path.resolve(here, 'import', 'excel-data.json')

// Mappings vindos do banco (queries iniciais)
const USER_BY_EMAIL = {
  'derik@rodopav.com': 'f126418a-2d2f-4280-927f-857fcd09ca78',
  'juliana@rodopav.com': 'c81e9282-1b3c-431e-9643-214da3aed636',
  'maria@rodopav.com': 'c9ad0031-a3fc-41f7-bc35-4032174dca9a',
  'yuri@rodopav.com': '43b60914-05d6-4e12-8f43-bcdbbf50a900',
  'rh@rodopav.com': 'cb049712-455a-4587-87b2-65542f3ff500',
}

const CONTA_BY_APELIDO = {
  'BANCO BRASIL BOLETOS 71433-0': 'fb01be49-ac20-4c34-b89e-e9a1b85eddf7',
  'BANCO BRASIL DESPESA GERAIS 57196-2': '31527cc9-7b0e-466d-9109-384ee88f9ac5',
  'BANCO BRASIL GERENCIAL 51433-0': '9e31c673-a831-4d45-a2a6-03064f6d25ae',
  'BANCO BRASIL MANUTENÇÃO 56792-2': 'b0cdc751-fa4a-40c4-a2ae-47383528ea1d',
  'BANCO BRASIL OPERACIONAL 56791-4': '6fd30713-be40-47eb-ae0e-46211cd2db02',
  'BANCO BRASIL RIOS EMPREENDIMENTOS 58673-0': 'c443a3ec-a57d-4c00-b65f-45a383f148f9',
  'BANCO BRASIL ROAD CONCRETO 58200-X': '34f0d5de-1372-4339-81d9-e554bd17f573',
  'BANCO BRASIL RODOAGRO 61433-5': 'ea18a630-9c86-4b49-81c6-0f6aab1aaefa',
  'BANCO BRASIL RTC': '0b199abc-6f0f-4716-8e06-b724e1fa60fc',
  'BANCO DO BRASIL TRANSPORTES OPERACIONAL': 'ec984a58-010c-4a64-8c37-7f61437b4335',
  'BB RODOPAV TARNSPORTES 63100-0': 'b773a676-066c-4475-9da4-6290780c0b10',
  'BRASIL BRASILA ROAD ASFALTO 58400-2': '39cafcfb-d51b-4946-a2f5-e691a3321fcc',
  'C6 BANK - RTC': '5c1baae0-86f4-4a71-88f5-accb87d1c2cf',
  'CAIXA ECONOMICA - RTC': 'e5f5e57c-c996-47cd-bdf4-c595a43bd88d',
  'CAIXA ECONOMICA RODOPAV 577531921-0': '755405c1-a714-4889-925d-0fca7c02a2ca',
  'CAIXA FISICO FINANCEIRO': '13f04a2c-7415-46dd-9e40-87f35e7da3c2',
  'CAIXA FISICO RH': '81d6ab52-bdb3-48fe-ba68-6df6355f7c66',
  'CREDISIS  RTC - 0200525-5': '7d2abdeb-68f5-43d3-a655-d4e5b0c281f8',
  'INTER - RTC': 'b99d60c3-5784-4423-9f60-78f1410cc74c',
  'SANTANDER RIOS EMPREENDIMENTOS 130000531': '6d260411-ae57-4485-9697-e30c879f2fcd',
  'SANTANDER RODOAGRO': 'd53190c8-1d2a-4263-bb1d-aed0aed7b928',
  'SANTANDER RODOPAV 13000057-6': 'c0207106-6fbf-46a6-9870-fc66b5422e70',
  'SICOOB RODOPAV 130.991-9': '3f7ba10d-f13c-4023-bc0c-31b49f8b19b5',
  'SICREDI RIOS EMPREENDIMENTOS 25484-5': 'e26e4e95-22e5-400c-ba4d-32b1a9526de0',
  'SICREDI RODOAGRO 66538-6': 'b9ac6277-ca7c-44d0-827e-e595b09a4ad8',
  'SICREDI RODOPAV 25459-4': 'c100ee30-5a14-469c-bd16-cccffcd242e7',
  'VOTORATIM CONTA SIMPLES RODOAGRO 155120123': '8faddd74-0c0c-494b-b3d3-c12fce467906',
  'VOTORATIM CONTA SIMPLES RODOPAV 15552976': '45ab2737-500e-4cc7-a0ac-66fbe0e17b96',
}

const CENTRO_BY_NOME = {
  'ADMINISTRATIVO': '422f5bce-7b6e-4673-a00c-fe6845f72d21',
  'OP - FROTAS': '3b2763f9-10e2-470a-b5e8-616b9ecc44c9',
  'OP - MANUTENÇÃO': 'fbfce8e5-0f5f-4bf1-a311-3bc1427890b0',
  'OP - OBRAS': '7a322818-d776-46bb-9f21-09b894ceae37',
  'PESSOAL OBRAS': 'e216dd50-fcbe-415e-b59c-012015fba596',
  'PESSOAL ADMINISTRATIVO': 'b4cec55f-ad0b-4565-8197-7767707d2636',
  'TRANSFERENCIA ENTRE BANCOS': '6d023a67-9074-4ec8-b0f3-ee859a5a7adc',
}

const TIPO_BY_NOME = {
  'CARTÃO DE CREDITO': 'e6ada64d-c3a6-449d-83e6-a2a4905771ec',
  'CREDITO EM CONTA': '9f065d19-eef8-4160-a95a-d3e6680ccffc',
  'DEBITO EM CONTA': '622bed53-1de6-4201-9fd9-04d78498fdba',
  'DINHEIRO': '6b8f409a-6c8f-401c-b208-99c8839ca150',
  'ESTORNO': '230596c1-e7f5-4de7-a71c-29d41d08282e',
  'PAGTO ELETRONICO BOLETO': '920c6b59-6633-474c-8bc2-89eecbf2e8f9',
  'PIX TRANSFERENCIA': '5890c0fa-7984-42d7-9189-7780502ae1a7',
  'SAQUE PARA CAIXA': '75b619fc-862f-4f6f-beff-58edecc29b3b',
  'TRANSFERENCIA': 'c9a5408a-1525-4b74-93e9-f2307602b6f8',
}

// Default centro pra lançamentos sem centro definido (transferências)
const DEFAULT_CENTRO_CODIGO = 'TRANSF_INT'

function escape(s) {
  if (s === null || s === undefined) return 'NULL'
  return "'" + String(s).replace(/'/g, "''") + "'"
}

function escapeId(uuid) {
  if (!uuid) return 'NULL'
  return `'${uuid}'`
}

async function main() {
  const data = JSON.parse(await readFile(dataPath, 'utf8'))

  // -------- 1. Cadastros: fornecedores --------
  const sqlCadastros = []
  sqlCadastros.push('-- FORNECEDORES (upsert por nome, normaliza maiúsculas)')
  sqlCadastros.push('-- Tipo padrão PJ; ajuste manual depois pra PF se necessário.')
  for (const nome of data.catalogos.fornecedores) {
    if (!nome) continue
    sqlCadastros.push(
      `INSERT INTO fornecedores_clientes (nome, tipo) VALUES (${escape(nome)}, 'PJ') ON CONFLICT DO NOTHING;`,
    )
  }
  await writeFile(
    path.resolve(here, 'import', '01-cadastros.sql'),
    sqlCadastros.join('\n'),
    'utf8',
  )

  // -------- 2. Saldos iniciais por conta --------
  const sqlSaldos = []
  sqlSaldos.push('-- SALDOS INICIAIS — período de fevereiro/2026')
  sqlSaldos.push('-- Usuário do bootstrap (Frank) como created_by.')
  const frankId = 'c5931b34-c96d-44b6-b650-a6344aa413fe'
  for (const { conta, saldo } of data.saldos_iniciais) {
    const contaId = CONTA_BY_APELIDO[conta]
    if (!contaId) {
      console.warn(`  AVISO: conta '${conta}' não mapeada — pulando saldo inicial.`)
      continue
    }
    sqlSaldos.push(
      `INSERT INTO saldos_iniciais (conta_id, periodo, valor, created_by) VALUES (${escapeId(contaId)}, '2026-02-01', ${saldo}, ${escapeId(frankId)}) ON CONFLICT (conta_id, periodo) DO UPDATE SET valor = EXCLUDED.valor;`,
    )
  }
  await writeFile(
    path.resolve(here, 'import', '02-saldos.sql'),
    sqlSaldos.join('\n'),
    'utf8',
  )

  // -------- 3. Lancamentos --------
  // Vamos preparar uma série de INSERT statements em batches.
  // Triggers serão disabled antes de inserir.
  const sqlLanc = []
  sqlLanc.push('-- LANCAMENTOS — disable triggers para bulk insert,')
  sqlLanc.push('-- depois reaplicar e validar.')
  sqlLanc.push("ALTER TABLE lancamentos DISABLE TRIGGER USER;")
  sqlLanc.push('')

  let skipped = 0
  for (const l of data.lancamentos) {
    // Resolve FKs
    const responsavelId = USER_BY_EMAIL[l.responsavel_email]
    if (!responsavelId) {
      // yuri/rh — resolver via SELECT inline
      skipped++
      continue
    }
    const contaOrigemId = l.banco_saida ? CONTA_BY_APELIDO[l.banco_saida] : null
    const contaDestinoId = l.banco_entrada ? CONTA_BY_APELIDO[l.banco_entrada] : null
    const tipoId = TIPO_BY_NOME[l.tipo]
    if (!tipoId) {
      // Tipo CREDITO EM CONTA / BOLETO_ELET — resolver via subquery
      skipped++
      continue
    }
    const centroId =
      CENTRO_BY_NOME[l.centro] ??
      `(SELECT id FROM centros_de_custo WHERE codigo = '${DEFAULT_CENTRO_CODIGO}' LIMIT 1)`
    const centroSql = centroId.startsWith('(') ? centroId : escapeId(centroId)

    const natureza = l.natureza === 'ENTRADA' ? 'ENTRADA' : 'SAIDA'
    // Se for tipo TRANSFERENCIA: natureza fica como ENTRADA mas ambas contas preenchidas

    const fornecedorTexto = l.fornecedor ? escape(l.fornecedor) : 'NULL'
    const descricao = escape(l.descricao)
    const ri = l.ri !== null && l.ri !== undefined ? escape(String(l.ri)) : 'NULL'

    sqlLanc.push(
      `INSERT INTO lancamentos (data, valor, natureza, descricao, ri, ` +
        `tipo_operacao_id, centro_custo_id, responsavel_id, ` +
        `conta_origem_id, conta_destino_id, fornecedor_cliente_texto) VALUES (` +
        `'${l.data}', ${l.valor}, '${natureza}', ${descricao}, ${ri}, ` +
        `${escapeId(tipoId)}, ${centroSql}, ${escapeId(responsavelId)}, ` +
        `${escapeId(contaOrigemId)}, ${escapeId(contaDestinoId)}, ${fornecedorTexto}` +
        `);`,
    )
  }
  sqlLanc.push('')
  sqlLanc.push("ALTER TABLE lancamentos ENABLE TRIGGER USER;")
  sqlLanc.push('SELECT COUNT(*)::int AS lancamentos_inseridos FROM lancamentos;')

  await writeFile(
    path.resolve(here, 'import', '03-lancamentos.sql'),
    sqlLanc.join('\n'),
    'utf8',
  )

  console.log('SQL files gerados:')
  console.log('  01-cadastros.sql:', sqlCadastros.length, 'linhas')
  console.log('  02-saldos.sql:', sqlSaldos.length, 'linhas')
  console.log('  03-lancamentos.sql:', sqlLanc.length, 'linhas (', data.lancamentos.length, 'lancs,', skipped, 'pulados)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
