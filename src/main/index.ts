// Entry point do processo principal. Trata ciclo de vida, lock de
// instância única, deep links, CSP, registro de IPC e auto-updater.

import { app, BrowserWindow, session } from 'electron'
import log from 'electron-log/main'
import { createWindow } from './window.js'
import { installMenu } from './menu.js'
import { registerIpcHandlers, unregisterIpcHandlers } from './ipc.js'
import { setupAutoUpdater } from './auto-update.js'
import {
  registerProtocol,
  parseDeepLink,
  findDeepLinkInArgs,
  dispatchDeepLink,
} from './deep-link.js'

log.initialize()
log.transports.file.level = 'info'
log.transports.console.level = app.isPackaged ? 'warn' : 'debug'

const isDev = !app.isPackaged
const SUPABASE_URL = 'https://rhhmdjipigvtfrzwzchh.supabase.co'
const SUPABASE_WS = 'wss://rhhmdjipigvtfrzwzchh.supabase.co'

let mainWindow: BrowserWindow | null = null
let pendingDeepLink: string | null = null

function buildCsp(): string {
  const connectSrc = [
    "'self'",
    SUPABASE_URL,
    SUPABASE_WS,
    isDev ? 'ws://localhost:5173' : '',
    isDev ? 'http://localhost:5173' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return [
    "default-src 'self'",
    `connect-src ${connectSrc}`,
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
  ].join('; ')
}

function attachCsp(): void {
  const csp = buildCsp()
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders }
    headers['Content-Security-Policy'] = [csp]
    callback({ responseHeaders: headers })
  })
}

function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

function focusExisting(): void {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
}

function handleDeepLinkRaw(raw: string | null): void {
  if (!raw) return
  const payload = parseDeepLink(raw)
  if (!payload) return
  if (mainWindow && !mainWindow.webContents.isLoading()) {
    dispatchDeepLink(mainWindow, payload)
  } else {
    pendingDeepLink = raw
  }
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  log.info('[main] Outra instância já está em execução — encerrando.')
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    log.info('[main] second-instance disparado.')
    focusExisting()
    handleDeepLinkRaw(findDeepLinkInArgs(argv))
  })

  app.on('open-url', (event, url) => {
    event.preventDefault()
    log.info('[main] open-url:', url)
    focusExisting()
    handleDeepLinkRaw(url)
  })

  registerProtocol()

  app.whenReady().then(() => {
    attachCsp()

    mainWindow = createWindow()
    installMenu(getMainWindow)
    registerIpcHandlers(mainWindow)
    setupAutoUpdater(mainWindow)

    mainWindow.webContents.once('did-finish-load', () => {
      const initial = pendingDeepLink ?? findDeepLinkInArgs(process.argv)
      if (initial) {
        const payload = parseDeepLink(initial)
        if (payload && mainWindow) dispatchDeepLink(mainWindow, payload)
        pendingDeepLink = null
      }
    })

    app.on('activate', () => {
      // macOS: recria a janela quando ícone do dock é clicado e nenhuma janela está aberta.
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow()
        installMenu(getMainWindow)
      }
    })
  }).catch((err) => {
    log.error('[main] Falha ao iniciar app:', err)
    app.exit(1)
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    log.info('[main] before-quit — limpando handlers de IPC.')
    unregisterIpcHandlers()
  })

  // Hardening adicional: bloqueia criação de webContents inesperados.
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (e) => e.preventDefault())
  })
}
