/**
 * Minimal local declaration of `window.api` so the renderer typechecks
 * before the preload agent's typings are available.
 *
 * The preload script (other agent) is the canonical source. If/when its
 * typings are exported, this file can be removed without changes here.
 */

export type UpdateEventPayload =
  | { type: 'available'; version?: string }
  | { type: 'ready'; version?: string }

export type DeepLinkPayload =
  | { type: 'reset'; token: string }
  | { type: 'unknown'; url: string }

export type MenuAction = 'new-lancamento' | 'search'

export interface ElectronStoreApi {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown, opts?: { encrypt?: boolean }): Promise<void>
  delete(key: string): Promise<void>
}

export interface ElectronWindowApi {
  minimize(): Promise<void>
  maximize(): Promise<void>
  close(): Promise<void>
}

export interface ElectronConfigApi {
  getSupabase(): Promise<{ url: string | null; key: string | null }>
  setSupabase(input: { url: string; key: string }): Promise<void>
}

export interface ElectronApi {
  getVersion(): Promise<string>
  checkForUpdates(): Promise<{ available: boolean; version?: string }>
  installUpdate(): Promise<void>
  onUpdateEvent(cb: (payload: UpdateEventPayload) => void): () => void
  onDeepLink(cb: (payload: DeepLinkPayload) => void): () => void
  openExternal(url: string): Promise<void>
  store: ElectronStoreApi
  window: ElectronWindowApi
  config: ElectronConfigApi
  onMenuAction(cb: (action: MenuAction) => void): () => void
}

declare global {
  interface Window {
    api: ElectronApi
  }
}

export {}
