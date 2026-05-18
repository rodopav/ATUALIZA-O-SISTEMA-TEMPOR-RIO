// Integração com electron-updater. Apenas em build de produção.

import type { BrowserWindow } from 'electron'
import { app } from 'electron'
import log from 'electron-log/main'
import electronUpdater from 'electron-updater'
import { PUSH_CHANNELS, type UpdatePushPayload } from '../shared/ipc-contracts.js'

// electron-updater é CJS; em ESM acessa-se via default export.
const { autoUpdater } = electronUpdater

let configured = false

function pushUpdate(win: BrowserWindow, payload: UpdatePushPayload): void {
  if (win.isDestroyed()) return
  win.webContents.send(PUSH_CHANNELS.updateEvent, payload)
}

/**
 * Cada um dos 3 apps publica num feed diferente
 * (latest.yml / admin.yml / magnata.yml) na mesma release do GitHub.
 * O mode é fixed em build-time pelo Vite via import.meta.env.MODE,
 * que vem do electron-vite (--mode user/admin/magnata). Não dá pra
 * usar app.getName() porque os 3 apps compartilham o mesmo package.json
 * name e retornariam 'sistema-financeiro-rodopav' para todos.
 */
function detectChannel(): string {
  const mode = import.meta.env.MODE
  if (mode === 'admin') return 'admin'
  if (mode === 'magnata') return 'magnata'
  return 'latest'
}

export function setupAutoUpdater(win: BrowserWindow): void {
  if (configured) return
  configured = true

  // electron-log expõe info/warn/error/debug — interface compatível com Logger.
  autoUpdater.logger = log as unknown as typeof autoUpdater.logger
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.channel = detectChannel()

  log.info(`[updater] Canal: ${autoUpdater.channel}`)

  autoUpdater.on('checking-for-update', () => {
    log.info('[updater] Verificando atualizações...')
  })

  autoUpdater.on('update-available', (info) => {
    log.info('[updater] Atualização disponível:', info?.version)
    pushUpdate(win, { type: 'available', version: info?.version })
  })

  autoUpdater.on('update-not-available', () => {
    log.info('[updater] Nenhuma atualização disponível.')
  })

  autoUpdater.on('download-progress', (progress) => {
    pushUpdate(win, {
      type: 'progress',
      percent: Math.round(progress.percent ?? 0),
      bytesPerSecond: Math.round(progress.bytesPerSecond ?? 0),
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info('[updater] Atualização baixada:', info?.version)
    pushUpdate(win, { type: 'ready', version: info?.version })
  })

  autoUpdater.on('error', (err) => {
    log.error('[updater] Erro no auto-updater:', err)
    pushUpdate(win, { type: 'error', message: sanitizeUpdaterError(err) })
  })

  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      log.error('[updater] Falha ao checar atualizações:', err)
      pushUpdate(win, { type: 'error', message: sanitizeUpdaterError(err) })
    })
  }
}

/**
 * Erros do electron-updater às vezes vêm com body inteiro de XML/HTML
 * quando o latest.yml referencia um asset 404 (release publicada com
 * yml sem .exe correspondente, por exemplo). Filtra isso pra não vazar
 * um alerta gigante de XML pro usuário.
 */
function sanitizeUpdaterError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  const firstLine = raw.split('\n')[0] ?? raw
  // Se contém marcadores de feed/HTML, devolve uma mensagem genérica.
  if (
    raw.includes('<?xml') ||
    raw.includes('<feed') ||
    raw.includes('<html') ||
    raw.length > 280
  ) {
    return 'Falha ao baixar atualização. Tente novamente em alguns minutos. Se persistir, reinstale a partir do GitHub Releases.'
  }
  return firstLine.length > 240 ? firstLine.slice(0, 237) + '...' : firstLine
}

export async function checkForUpdates(): Promise<{
  available: boolean
  version?: string
}> {
  if (!app.isPackaged) {
    return { available: false }
  }
  try {
    const result = await autoUpdater.checkForUpdates()
    const info = result?.updateInfo
    if (!info) return { available: false }
    const current = app.getVersion()
    const available = info.version !== current
    return { available, version: info.version }
  } catch (err) {
    log.error('[updater] checkForUpdates falhou:', err)
    return { available: false }
  }
}

export function quitAndInstall(): void {
  log.info('[updater] Saindo para instalar atualização.')
  autoUpdater.quitAndInstall(false, true)
}
