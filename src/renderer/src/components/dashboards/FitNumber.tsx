import * as React from 'react'
import { cn } from '../../lib/cn'

interface FitNumberProps {
  children: React.ReactNode
  /** Tamanho de fonte ideal (px). Vai encolhendo até caber na caixa. */
  maxFontPx?: number
  /** Mínimo aceitável pra não ficar ilegível. */
  minFontPx?: number
  /** Estilo do texto (cor, peso, fonte). Cor/peso vêm daqui. */
  className?: string
  lineHeight?: number
}

/**
 * Renderiza um valor (geralmente moeda) que se adapta à largura do container:
 * mede scrollWidth vs clientWidth e diminui a fonte em loop até caber.
 * Mostra o valor INTEIRO (não compacta tipo "1,2M"). Usa ResizeObserver pra
 * refazer o ajuste quando o card muda de largura (ex.: 4 → 5 colunas).
 */
export function FitNumber({
  children,
  maxFontPx = 26,
  minFontPx = 13,
  className,
  lineHeight = 1,
}: FitNumberProps): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const spanRef = React.useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = React.useState<number>(maxFontPx)

  const fit = React.useCallback(() => {
    const container = containerRef.current
    const span = spanRef.current
    if (!container || !span) return
    span.style.fontSize = `${maxFontPx}px`
    let size = maxFontPx
    // Encolhe 1px por vez até caber (cap implícito em maxFontPx-minFontPx iter).
    while (size > minFontPx && span.scrollWidth > container.clientWidth) {
      size -= 1
      span.style.fontSize = `${size}px`
    }
    setFontSize(size)
  }, [maxFontPx, minFontPx])

  React.useLayoutEffect(() => {
    fit()
  }, [children, fit])

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => fit())
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ lineHeight }}
    >
      <span
        ref={spanRef}
        style={{ fontSize: `${fontSize}px`, lineHeight }}
        className={cn('inline-block whitespace-nowrap', className)}
      >
        {children}
      </span>
    </div>
  )
}
