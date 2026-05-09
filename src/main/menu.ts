// Menu da aplicação em pt-BR. Acionadores enviam eventos para o renderer
// via canal menu:action; itens nativos usam roles padrão.

import {
  Menu,
  type MenuItemConstructorOptions,
  type BrowserWindow,
  shell,
  dialog,
  app,
} from 'electron'
import log from 'electron-log/main'
import { PUSH_CHANNELS, type MenuActionPayload } from '../shared/ipc-contracts.js'

const DOCS_URL = 'https://github.com/rodopav/financeiro-desktop'

function dispatchMenu(win: BrowserWindow | null, action: MenuActionPayload): void {
  if (!win || win.isDestroyed()) return
  win.webContents.send(PUSH_CHANNELS.menuAction, action)
}

export function buildMenu(getWindow: () => BrowserWindow | null): Menu {
  const fileMenu: MenuItemConstructorOptions = {
    label: 'Arquivo',
    submenu: [
      {
        label: 'Novo Lançamento',
        accelerator: 'CmdOrCtrl+N',
        click: () => dispatchMenu(getWindow(), 'new-lancamento'),
      },
      {
        label: 'Buscar',
        accelerator: 'CmdOrCtrl+F',
        click: () => dispatchMenu(getWindow(), 'search'),
      },
      { type: 'separator' },
      { label: 'Sair', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
    ],
  }

  const editMenu: MenuItemConstructorOptions = {
    label: 'Editar',
    submenu: [
      { label: 'Desfazer', role: 'undo' },
      { label: 'Refazer', role: 'redo' },
      { type: 'separator' },
      { label: 'Recortar', role: 'cut' },
      { label: 'Copiar', role: 'copy' },
      { label: 'Colar', role: 'paste' },
      { label: 'Selecionar Tudo', role: 'selectAll' },
    ],
  }

  const isDev = !app.isPackaged
  const viewSubmenu: MenuItemConstructorOptions[] = []
  if (isDev) {
    viewSubmenu.push(
      { label: 'Recarregar', role: 'reload' },
      { label: 'Forçar Recarregar', role: 'forceReload' },
      { label: 'Ferramentas de Desenvolvedor', role: 'toggleDevTools' },
      { type: 'separator' },
    )
  }
  viewSubmenu.push(
    { label: 'Ampliar', role: 'zoomIn' },
    { label: 'Reduzir', role: 'zoomOut' },
    { label: 'Tamanho Padrão', role: 'resetZoom' },
    { type: 'separator' },
    { label: 'Tela Cheia', role: 'togglefullscreen' },
  )
  const viewMenu: MenuItemConstructorOptions = { label: 'Visualizar', submenu: viewSubmenu }

  const windowMenu: MenuItemConstructorOptions = {
    label: 'Janela',
    submenu: [
      { label: 'Minimizar', role: 'minimize' },
      { label: 'Fechar', role: 'close' },
    ],
  }

  const helpMenu: MenuItemConstructorOptions = {
    label: 'Ajuda',
    submenu: [
      {
        label: 'Sobre',
        click: async () => {
          const win = getWindow()
          const opts = {
            type: 'info' as const,
            title: 'Sobre',
            message: 'Sistema Financeiro Rodopav',
            detail: `Versão ${app.getVersion()}\n© Rodopav Central`,
            buttons: ['OK'],
            noLink: true,
          }
          if (win) {
            await dialog.showMessageBox(win, opts)
          } else {
            await dialog.showMessageBox(opts)
          }
        },
      },
      {
        label: 'Documentação',
        click: () => {
          shell
            .openExternal(DOCS_URL)
            .catch((err) => log.error('[menu] openExternal falhou:', err))
        },
      },
      {
        label: 'Ver Logs',
        click: () => {
          const logsPath = app.getPath('logs')
          shell.openPath(logsPath).catch((err) => log.error('[menu] openPath falhou:', err))
        },
      },
    ],
  }

  return Menu.buildFromTemplate([fileMenu, editMenu, viewMenu, windowMenu, helpMenu])
}

export function installMenu(getWindow: () => BrowserWindow | null): void {
  Menu.setApplicationMenu(buildMenu(getWindow))
}
