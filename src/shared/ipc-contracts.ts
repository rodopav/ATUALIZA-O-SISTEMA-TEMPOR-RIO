// Contratos de IPC compartilhados entre main e preload/renderer.
// Cada canal define schemas Zod para entrada e saída — usados para
// validação em runtime nas duas pontas da ponte de contexto.

import { z } from 'zod'

const empty = z.object({}).strict()

const versionOutput = z.object({ version: z.string().min(1) })

const updateCheckOutput = z.object({
  available: z.boolean(),
  version: z.string().optional(),
})

const okOutput = z.object({ ok: z.literal(true) })

const storeKey = z.object({ key: z.string().min(1) })
const storeGetOutput = z.object({ value: z.unknown() })
const storeSetInput = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  encrypt: z.boolean().optional(),
})

const supabaseConfigOutput = z.object({
  url: z.string().nullable(),
  key: z.string().nullable(),
})
const supabaseConfigInput = z.object({
  url: z.string().url('URL inválida.'),
  key: z.string().min(20, 'Key muito curta.'),
})

// Domínios externos cuja abertura é permitida via shell.openExternal.
export const EXTERNAL_URL_ALLOWLIST = [
  'supabase.com',
  'github.com',
  'rodopav.com.br',
  'rodopav.com',
] as const

const externalUrlSchema = z
  .object({ url: z.string().url('URL inválida.') })
  .superRefine(({ url }, ctx) => {
    try {
      const host = new URL(url).hostname.toLowerCase()
      const allowed = EXTERNAL_URL_ALLOWLIST.some(
        (d) => host === d || host.endsWith(`.${d}`),
      )
      if (!allowed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Domínio não permitido para abertura externa: ${host}.`,
        })
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'URL malformada.',
      })
    }
  })

export const IpcContracts = {
  'app:get-version': { input: empty, output: versionOutput },
  'update:check': { input: empty, output: updateCheckOutput },
  'update:install': { input: empty, output: z.void() },
  'store:get': { input: storeKey, output: storeGetOutput },
  'store:set': { input: storeSetInput, output: okOutput },
  'store:delete': { input: storeKey, output: okOutput },
  'shell:open-external': { input: externalUrlSchema, output: okOutput },
  'window:minimize': { input: empty, output: z.void() },
  'window:maximize': { input: empty, output: z.void() },
  'window:close': { input: empty, output: z.void() },
  'config:get-supabase': { input: empty, output: supabaseConfigOutput },
  'config:set-supabase': { input: supabaseConfigInput, output: okOutput },
} as const

export type IpcChannel = keyof typeof IpcContracts

export type IpcInput<C extends IpcChannel> = z.infer<
  (typeof IpcContracts)[C]['input']
>
export type IpcOutput<C extends IpcChannel> = z.infer<
  (typeof IpcContracts)[C]['output']
>

// Canais "push" do main para o renderer (não usam invoke/handle).
export const PUSH_CHANNELS = {
  updateEvent: 'update:event',
  deepLink: 'deep-link',
  menuAction: 'menu:action',
} as const

export type UpdatePushPayload =
  | { type: 'available'; version?: string }
  | { type: 'ready'; version?: string }

export type DeepLinkPayload = {
  type: string
  [key: string]: unknown
}

export type MenuActionPayload = 'new-lancamento' | 'search'
