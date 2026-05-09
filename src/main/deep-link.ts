// Registro e parsing do protocolo customizado rodofin://.
// Suporta open-url (macOS) e argumentos de second-instance (Win/Linux).

import { app, type BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import log from 'electron-log/main'
import { PUSH_CHANNELS, type DeepLinkPayload } from '../shared/ipc-contracts.js'

const PROTOCOL = 'rodofin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function registerProtocol(): void {
  if (process.defaultApp) {
    // Em desenvolvimento process.argv[1] aponta para o script de entrada.
    const entry = process.argv[1]
    if (typeof entry === 'string' && entry.length > 0) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
        path.resolve(entry),
      ])
    } else {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
        path.resolve(__dirname),
      ])
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL)
  }
  log.info('[deep-link] Protocolo registrado:', PROTOCOL)
}

export function parseDeepLink(raw: string | null | undefined): DeepLinkPayload | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol.replace(':', '') !== PROTOCOL) return null

    const type = url.hostname || url.pathname.replace(/^\/+/, '') || 'unknown'
    const payload: DeepLinkPayload = { type }
    url.searchParams.forEach((value, key) => {
      payload[key] = value
    })
    return payload
  } catch (err) {
    log.warn('[deep-link] URL inválida:', raw, err)
    return null
  }
}

export function findDeepLinkInArgs(argv: readonly string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${PROTOCOL}://`)) ?? null
}

export function dispatchDeepLink(
  win: BrowserWindow | null,
  payload: DeepLinkPayload,
): void {
  if (!win || win.isDestroyed()) {
    log.warn('[deep-link] Janela indisponível, descartando payload.')
    return
  }
  log.info('[deep-link] Despachando:', payload.type)
  win.webContents.send(PUSH_CHANNELS.deepLink, payload)
}
