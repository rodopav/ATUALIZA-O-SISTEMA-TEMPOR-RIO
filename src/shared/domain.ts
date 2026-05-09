// Regras de domínio espelhando os CHECK constraints do Postgres.
// Compartilhado entre renderer (formulários) e main (validação IPC).

import { z } from 'zod'

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
const uuidSchema = z.string().uuid('UUID inválido.')

// Garante até duas casas decimais e valor estritamente positivo.
const valorSchema = z
  .number({ invalid_type_error: 'Valor deve ser numérico.' })
  .positive('Valor deve ser maior que zero.')
  .refine((v) => Number.isFinite(v), 'Valor inválido.')
  .refine(
    (v) => Number.isInteger(Math.round(v * 100)) && Math.round(v * 100) / 100 === v,
    'Valor deve ter no máximo duas casas decimais.',
  )

export const NaturezaEnum = z.enum(['ENTRADA', 'SAIDA'])
export type Natureza = z.infer<typeof NaturezaEnum>

// Limita data a janela razoável: 2020 → hoje + 1 ano. Espelha o trigger
// `enforce_data_razoavel` no banco, dando feedback ao usuário sem ida ao servidor.
const dataSchema = z
  .string()
  .regex(isoDateRegex, 'Data deve estar no formato AAAA-MM-DD.')
  .refine((v) => v >= '2020-01-01', 'Data anterior a 01/01/2020 não é permitida.')
  .refine((v) => {
    const oneYearAhead = new Date()
    oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1)
    const max = oneYearAhead.toISOString().slice(0, 10)
    return v <= max
  }, 'Data muito no futuro: máximo 1 ano à frente.')

const baseShape = {
  data: dataSchema,
  descricao: z
    .string()
    .trim()
    .min(3, 'Descrição deve ter ao menos 3 caracteres.'),
  valor: valorSchema,
  natureza: NaturezaEnum,
  tipo_operacao_id: uuidSchema,
  centro_custo_id: uuidSchema,
  conta_origem_id: uuidSchema.nullable(),
  conta_destino_id: uuidSchema.nullable(),
  fornecedor_cliente_id: uuidSchema.nullable(),
  ri: z.string().trim().min(1).nullable(),
  observacoes: z.string().trim().min(1).nullable(),
}

function refineNaturezaContas(
  data: { natureza: Natureza; conta_origem_id: string | null; conta_destino_id: string | null },
  ctx: z.RefinementCtx,
): void {
  const { natureza, conta_origem_id, conta_destino_id } = data

  if (natureza === 'ENTRADA') {
    if (!conta_destino_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['conta_destino_id'],
        message: 'Lançamentos de ENTRADA exigem conta de destino.',
      })
    }
    if (conta_origem_id && !conta_destino_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['conta_origem_id'],
        message: 'ENTRADA pura não pode ter conta de origem.',
      })
    }
  }

  if (natureza === 'SAIDA') {
    if (!conta_origem_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['conta_origem_id'],
        message: 'Lançamentos de SAÍDA exigem conta de origem.',
      })
    }
    if (conta_destino_id && !conta_origem_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['conta_destino_id'],
        message: 'SAÍDA pura não pode ter conta de destino.',
      })
    }
  }

  // Transferência: ambas preenchidas devem ser distintas.
  if (
    conta_origem_id &&
    conta_destino_id &&
    conta_origem_id === conta_destino_id
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['conta_destino_id'],
      message: 'Conta de origem e destino devem ser distintas.',
    })
  }
}

export const lancamentoBaseSchema = z
  .object(baseShape)
  .superRefine(refineNaturezaContas)

export type LancamentoInput = z.infer<typeof lancamentoBaseSchema>

export const estornoSchema = z
  .object({
    ...baseShape,
    estorno_de_id: uuidSchema,
    motivo_estorno: z
      .string()
      .trim()
      .min(10, 'Motivo do estorno deve ter ao menos 10 caracteres.'),
  })
  .superRefine(refineNaturezaContas)

export type EstornoInput = z.infer<typeof estornoSchema>
