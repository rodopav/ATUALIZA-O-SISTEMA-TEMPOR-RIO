import * as React from 'react'

interface RunwayGaugeProps {
  dias: number
}

/**
 * Semicircular gauge desenhado em SVG puro — Recharts RadialBar tem problemas
 * de proporção em containers pequenos. Aqui controlamos viewBox e stroke
 * diretamente, evitando arcos cortados.
 *
 * Cor:
 *   - dias < 30 → vermelho (negative)
 *   - dias < 60 → âmbar (primary)
 *   - dias ≥ 60 → verde (positive)
 *
 * Cap de 90 dias na barra (o número do KPI segue mostrando o valor real).
 */
export function RunwayGauge({ dias }: RunwayGaugeProps): React.ReactElement {
  const pct = Math.max(0, Math.min(100, (dias / 90) * 100))
  const color =
    dias < 30
      ? 'hsl(var(--destructive))'
      : dias < 60
        ? 'hsl(var(--amb-400))'
        : 'hsl(var(--success))'

  // Arco semicircular: raio 50, centro (60, 60), traço de 8.
  // Half-circumference = π * r ≈ 157.08
  const radius = 50
  const halfCircumference = Math.PI * radius
  const dashOffset = halfCircumference * (1 - pct / 100)

  return (
    <div className="flex h-14 w-full items-end justify-center">
      <svg
        viewBox="0 0 120 64"
        className="h-full w-full overflow-visible"
        aria-label={`Runway: ${dias} dias`}
      >
        {/* Trilha de fundo */}
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Progresso */}
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={halfCircumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
      </svg>
    </div>
  )
}
