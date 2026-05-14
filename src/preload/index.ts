// Preload script — expõe APIs tipadas via contextBridge.
// O renderer NUNCA acessa ipcRenderer diretamente.

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  PUSH_CHANNELS,
  type DeepLinkPayload,
  type MenuActionPayload,
  type UpdatePushPayload,
} from '../shared/ipc-contracts.js'

type Unsubscribe = () => void

function subscribe<T>(
  channel: string,
  cb: (payload: T) => void,
): Unsubscribe {
  const listener = (_event: IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api = {
  async getVersion(): Promise<string> {
    const result = (await ipcRenderer.invoke('app:get-version', {})) as { version: string }
    return result.version
  },

  async checkForUpdates(): Promise<{ available: boolean; version?: string }> {
    return (await ipcRenderer.invoke('update:check', {})) as {
      available: boolean
      version?: string
    }
  },

  async installUpdate(): Promise<void> {
    await ipcRenderer.invoke('update:install', {})
  },

  onUpdateEvent(cb: (e: UpdatePushPayload) => void): Unsubscribe {
    return subscribe<UpdatePushPayload>(PUSH_CHANNELS.updateEvent, cb)
  },

  onDeepLink(cb: (payload: DeepLinkPayload) => void): Unsubscribe {
    return subscribe<DeepLinkPayload>(PUSH_CHANNELS.deepLink, cb)
  },

  onMenuAction(cb: (action: MenuActionPayload) => void): Unsubscribe {
    return subscribe<MenuActionPayload>(PUSH_CHANNELS.menuAction, cb)
  },

  onTabSwitcher(cb: () => void): Unsubscribe {
    return subscribe<void>(PUSH_CHANNELS.tabSwitcher, () => cb())
  },

  async openExternal(url: string): Promise<void> {
    await ipcRenderer.invoke('shell:open-external', { url })
  },

  store: {
    async get(key: string): Promise<unknown> {
      const result = (await ipcRenderer.invoke('store:get', { key })) as { value: unknown }
      return result.value
    },
    async set(
      key: string,
      value: unknown,
      opts?: { encrypt?: boolean },
    ): Promise<void> {
      await ipcRenderer.invoke('store:set', {
        key,
        value,
        encrypt: opts?.encrypt ?? false,
      })
    },
    async delete(key: string): Promise<void> {
      await ipcRenderer.invoke('store:delete', { key })
    },
  },

  window: {
    async minimize(): Promise<void> {
      await ipcRenderer.invoke('window:minimize', {})
    },
    async maximize(): Promise<void> {
      await ipcRenderer.invoke('window:maximize', {})
    },
    async close(): Promise<void> {
      await ipcRenderer.invoke('window:close', {})
    },
  },

  config: {
    async getSupabase(): Promise<{ url: string | null; key: string | null }> {
      return (await ipcRenderer.invoke('config:get-supabase', {})) as {
        url: string | null
        key: string | null
      }
    },
    async setSupabase(input: { url: string; key: string }): Promise<void> {
      await ipcRenderer.invoke('config:set-supabase', input)
    },
  },
} as const

export type RodofinApi = typeof api

try {
  contextBridge.exposeInMainWorld('api', api)
} catch (err) {
  // Se contextIsolation estiver desligado (não deveria), falha alta para evitar fallback inseguro.
  console.error('[preload] Falha ao expor api via contextBridge:', err)
  throw err
}
