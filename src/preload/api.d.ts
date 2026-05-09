// Tipagem global injetada no renderer pela ponte de contexto.
// Importado pelo tsconfig.web.json via include de src/shared (re-export aqui).

import type { RodofinApi } from './index.js'

declare global {
  interface Window {
    api: RodofinApi
    /** Alias retrocompatível — preferir window.api. */
    electronApi: RodofinApi
  }
}

export {}
