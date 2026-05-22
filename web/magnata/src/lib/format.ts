import * as React from 'react'

export function formatBRL(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'R$ 0,00'
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

/**
 * Formato compacto: R$ 1,2M / R$ 350K / R$ 850. Útil pra UI apertada.
 */
export function formatBRLCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'R$ 0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}R$ ${(abs / 1_000_000_000).toFixed(1).replace('.', ',')}B`
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(2).replace('.', ',')}M`
  if (abs >= 10_000) return `${sign}R$ ${Math.round(abs / 1_000)}K`
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toFixed(1).replace('.', ',')}K`
  return formatBRL(value)
}

/**
 * Escolhe o formato apropriado pelo tamanho do número e largura da tela.
 * - Em mobile (<640px): compact se >= 100k
 * - Em desktop: full sempre
 */
export function formatBRLAuto(value: number | null | undefined, isMobile: boolean): string {
  if (value == null) return formatBRL(0)
  if (isMobile && Math.abs(value) >= 100_000) return formatBRLCompact(value)
  return formatBRL(value)
}

export function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function formatRelative(iso: string): string {
  const d = new Date(iso).getTime()
  const now = Date.now()
  const diffMin = Math.floor((now - d) / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin} min`
  const hours = Math.floor(diffMin / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return formatDate(iso)
}

/** Hook: true quando viewport < 640px. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 640
  })
  React.useEffect(() => {
    const onResize = (): void => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}
