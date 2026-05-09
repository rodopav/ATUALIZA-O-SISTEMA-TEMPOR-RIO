// Cria a BrowserWindow principal com bounds persistidos e segurança rígida.

import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import log from 'electron-log/main'
import { getStore } from './safe-storage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BOUNDS_KEY = 'window.bounds'

type Bounds = {
  width: number
  height: number
  x?: number
  y?: number
}

const DEFAULT_BOUNDS: Bounds = { width: 1280, height: 800 }
const MIN_WIDTH = 1024
const MIN_HEIGHT = 700

function loadBounds(): Bounds {
  const raw = getStore().get(BOUNDS_KEY)
  if (!raw || typeof raw !== 'object') return DEFAULT_BOUNDS
  const b = raw as Partial<Bounds>
  return {
    width: typeof b.width === 'number' && b.width >= MIN_WIDTH ? b.width : DEFAULT_BOUNDS.width,
    height:
      typeof b.height === 'number' && b.height >= MIN_HEIGHT ? b.height : DEFAULT_BOUNDS.height,
    x: typeof b.x === 'number' ? b.x : undefined,
    y: typeof b.y === 'number' ? b.y : undefined,
  }
}

function saveBounds(win: BrowserWindow): void {
  if (win.isMinimized() || win.isMaximized() || win.isFullScreen()) return
  const { width, height, x, y } = win.getBounds()
  getStore().set(BOUNDS_KEY, { width, height, x, y })
}

export function createWindow(): BrowserWindow {
  const bounds = loadBounds()

  const preloadPath = path.join(__dirname, '../preload/index.js')

  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    autoHideMenuBar: false,
    backgroundColor: '#0f172a',
    title: 'Sistema Financeiro Rodopav',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  })

  const isDev = !app.isPackaged

  win.on('ready-to-show', () => {
    win.show()
    if (isDev) win.webContents.openDevTools({ mode: 'detach' })
  })

  win.on('close', () => {
    try {
      saveBounds(win)
    } catch (err) {
      log.warn('[window] Falha ao salvar bounds:', err)
    }
  })

  // Bloqueia abertura de novas janelas. URLs externas legítimas devem usar shell.openExternal.
  win.webContents.setWindowOpenHandler(({ url }) => {
    log.info('[window] Bloqueando abertura de janela para:', url)
    if (url.startsWith('https://')) {
      shell.openExternal(url).catch((err) => log.error('[window] openExternal falhou:', err))
    }
    return { action: 'deny' }
  })

  // Bloqueia navegação para fora da app.
  win.webContents.on('will-navigate', (event, url) => {
    const allowed =
      url.startsWith('http://localhost:5173') ||
      url.startsWith(process.env.ELECTRON_RENDERER_URL ?? '__none__') ||
      url.startsWith('file://')
    if (!allowed) {
      log.warn('[window] Navegação bloqueada para:', url)
      event.preventDefault()
    }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL).catch((err) =>
      log.error('[window] Falha ao carregar dev URL:', err),
    )
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html')).catch((err) =>
      log.error('[window] Falha ao carregar index.html:', err),
    )
  }

  return win
}
