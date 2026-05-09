// Wrapper sobre electron-store + safeStorage do sistema operacional.
// Valores marcados como "secret" são criptografados antes de persistir.

import { safeStorage } from 'electron'
import Store from 'electron-store'
import log from 'electron-log/main'

type Schema = Record<string, unknown>

const SECRET_PREFIX = '__enc__:'

let storeSingleton: Store<Schema> | null = null

export function getStore(): Store<Schema> {
  if (!storeSingleton) {
    storeSingleton = new Store<Schema>({
      name: 'rodofin',
      clearInvalidConfig: true,
    })
  }
  return storeSingleton
}

function ensureEncryptionAvailable(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'Armazenamento seguro indisponível neste sistema. Verifique o keychain/credential manager.',
    )
  }
}

export function setSecret(key: string, value: string): void {
  ensureEncryptionAvailable()
  const encrypted = safeStorage.encryptString(value)
  getStore().set(key, `${SECRET_PREFIX}${encrypted.toString('base64')}`)
}

export function getSecret(key: string): string | null {
  const raw = getStore().get(key)
  if (typeof raw !== 'string' || !raw.startsWith(SECRET_PREFIX)) return null
  ensureEncryptionAvailable()
  try {
    const buf = Buffer.from(raw.slice(SECRET_PREFIX.length), 'base64')
    return safeStorage.decryptString(buf)
  } catch (err) {
    log.error('[safe-storage] Falha ao descriptografar chave', key, err)
    return null
  }
}

export function getValue(key: string): unknown {
  const raw = getStore().get(key)
  // Se o valor é um secret, devolve descriptografado para chamadas genéricas.
  if (typeof raw === 'string' && raw.startsWith(SECRET_PREFIX)) {
    return getSecret(key)
  }
  return raw
}

export function setValue(key: string, value: unknown): void {
  getStore().set(key, value)
}

export function deleteKey(key: string): void {
  getStore().delete(key)
}
