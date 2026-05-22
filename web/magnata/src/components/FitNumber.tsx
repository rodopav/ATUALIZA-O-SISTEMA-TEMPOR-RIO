import * as React from 'react'
import { cn } from '../lib/cn'

interface FitNumberProps {
  children: React.ReactNode
  /** Tamanho de fonte ideal (px). Vai encolhendo até caber. */
  maxFontPx?: number
  /** Mínimo aceitável pra não ficar ilegível. */
  minFontPx?: number
  className?: string
  /** Linha-altura proporcional à fonte. Default 1. */
  lineHeight?: number
  /** Em mobile, começa menor — economiza ciclos de ajuste. */
  maxFontPxMobile?: number
}

/**
 * Renderiza um valor (geralmente número) que se adapta à largura do container.
 * Mede com scrollWidth vs clientWidth e diminui font-size em loop até caber.
 *
 * Por que não usar `text-clamp` ou compactar (1,2M)?
 *   - Frank quer ver o valor INTEIRO ("R$ 1.234.567,89").
 *   - text-clamp só escala em viewport, não em container.
 *   - JS-based fit funciona em qualquer largura (sidebar, mobile, etc.).
 *
 * Usa ResizeObserver pra refazer fit quando o card muda de tamanho
 * (rotação de tela, drawer abrindo, etc.).
 */
export function FitNumber({
  children,
  maxFontPx = 28,
  minFontPx = 12,
  className,
  lineHeight = 1,
  maxFontPxMobile,
}: FitNumberProps): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const spanRef = React.useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = React.useState<number>(maxFontPx)

  const fit = React.useCallback(() => {
    const container = containerRef.current
    const span = spanRef.current
    if (!container || !span) return

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
    const startSize =
      isMobile && maxFontPxMobile != null ? maxFontPxMobile : maxFontPx

    // Reset pro tamanho inicial pra medir overflow corretamente
    span.style.fontSize = `${startSize}px`

    // Loop: se transborda, encolhe 1px. Mais simples e estável que binary search
    // em valores pequenos. Cap em ~30 iterações = nunca trava.
    let size = startSize
    while (size > minFontPx && span.scrollWidth > container.clientWidth) {
      size -= 1
      span.style.fontSize = `${size}px`
    }

    setFontSize(size)
  }, [maxFontPx, maxFontPxMobile, minFontPx])

  // Refit quando children muda (novo valor) ou container redimensiona.
  React.useLayoutEffect(() => {
    fit()
  }, [children, fit])

  React.useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => fit())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [fit])

  return (
    <div
      ref={containerRef}
      className={cn('w-full overflow-hidden', className)}
      style={{ lineHeight }}
    >
      <span
        ref={spanRef}
        style={{ fontSize: `${fontSize}px`, lineHeight }}
        className="num-mono inline-block whitespace-nowrap font-extrabold text-zinc-50"
      >
        {children}
      </span>
    </div>
  )
}
