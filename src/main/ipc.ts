// Registra todos os handlers ipcMain.handle. Cada canal valida entrada e
// saída com Zod conforme IpcContracts. Erros são lançados em pt-BR.

import { app, ipcMain, shell, type BrowserWindow } from 'electron'
import log from 'electron-log/main'
import { z } from 'zod'
import {
  IpcContracts,
  type IpcChannel,
  type IpcInput,
  type IpcOutput,
} from '../shared/ipc-contracts.js'
import {
  getValue,
  setValue,
  setSecret,
  getSecret,
  deleteKey,
} from './safe-storage.js'
import { checkForUpdates, quitAndInstall } from './auto-update.js'

type Handler<C extends IpcChannel> = (
  input: IpcInput<C>,
  win: BrowserWindow,
) => Promise<IpcOutput<C>> | IpcOutput<C>

function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ')
}

function register<C extends IpcChannel>(channel: C, win: BrowserWindow, handler: Handler<C>): void {
  ipcMain.handle(channel, async (_event, raw: unknown) => {
    const contract = IpcContracts[channel]
    const parsedInput = contract.input.safeParse(raw ?? {})
    if (!parsedInput.success) {
      const msg = `Entrada inválida em ${channel}: ${formatZodError(parsedInput.error)}`
      log.warn('[ipc]', msg)
      throw new Error(msg)
    }

    let output: IpcOutput<C>
    try {
      output = await handler(parsedInput.data as IpcInput<C>, win)
    } catch (err) {
      log.error(`[ipc] Falha em ${channel}:`, err)
      throw err instanceof Error ? err : new Error(`Erro ao executar ${channel}.`)
    }

    const parsedOutput = contract.output.safeParse(output)
    if (!parsedOutput.success) {
      const msg = `Saída inválida em ${channel}: ${formatZodError(parsedOutput.error)}`
      log.error('[ipc]', msg)
      throw new Error(msg)
    }
    return parsedOutput.data
  })
}

export function registerIpcHandlers(win: BrowserWindow): void {
  register('app:get-version', win, () => ({ version: app.getVersion() }))

  register('update:check', win, async () => {
    const result = await checkForUpdates()
    return result.version === undefined
      ? { available: result.available }
      : { available: result.available, version: result.version }
  })

  register('update:install', win, () => {
    quitAndInstall()
  })

  register('store:get', win, ({ key }) => {
    const value = getValue(key)
    return { value }
  })

  register('store:set', win, ({ key, value, encrypt }) => {
    if (encrypt) {
      if (typeof value !== 'string') {
        throw new Error('Apenas strings podem ser armazenadas como segredo.')
      }
      setSecret(key, value)
    } else {
      setValue(key, value)
    }
    return { ok: true as const }
  })

  register('store:delete', win, ({ key }) => {
    deleteKey(key)
    return { ok: true as const }
  })

  register('shell:open-external', win, async ({ url }) => {
    await shell.openExternal(url)
    return { ok: true as const }
  })

  register('window:minimize', win, (_input, w) => {
    w.minimize()
  })

  register('window:maximize', win, (_input, w) => {
    if (w.isMaximized()) w.unmaximize()
    else w.maximize()
  })

  register('window:close', win, (_input, w) => {
    w.close()
  })

  register('config:get-supabase', win, () => {
    const url = getValue('supabase.url')
    const key = getSecret('supabase.key')
    return {
      url: typeof url === 'string' && url.length > 0 ? url : null,
      key: typeof key === 'string' && key.length > 0 ? key : null,
    }
  })

  register('config:set-supabase', win, ({ url, key }) => {
    setValue('supabase.url', url)
    setSecret('supabase.key', key)
    return { ok: true as const }
  })
}

export function unregisterIpcHandlers(): void {
  for (const channel of Object.keys(IpcContracts)) {
    ipcMain.removeHandler(channel)
  }
}
