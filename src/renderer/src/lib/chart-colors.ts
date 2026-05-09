/**
 * Paleta de cores para Recharts ancorada nos tokens HSL do design system
 * Road Asfaltos. Sempre usar `CHART_COLORS.x` ou `CHART_PALETTE[i]` em props
 * `fill`, `stroke` ou `stopColor` — nunca hex hardcoded.
 *
 * Os valores são strings `hsl(var(--token))`, então respondem ao theme
 * (light/dark) automaticamente.
 */
export const CHART_COLORS = {
  /** Âmbar principal (#f59e0b). Brand identity em barras/áreas neutras. */
  primary: 'hsl(var(--amb-400))',
  /** Âmbar claro (#fcd34d). Acento, segunda linha, gradient stops. */
  primaryAccent: 'hsl(var(--amb-300))',
  /** Âmbar escuro (#d97706 — amb-500). Profundidade em séries primárias. */
  primaryDeep: 'hsl(var(--amb-500))',
  /** Verde semântico (success). Entradas, valores positivos. */
  positive: 'hsl(var(--grn-600))',
  /** Vermelho semântico (destructive). Saídas, valores negativos. */
  negative: 'hsl(var(--red-600))',
  /** Cinza neutro (ink-400). Categorias residuais. */
  neutral: 'hsl(var(--ink-400))',
  /** Azul (blu-600). Transferências, info. */
  info: 'hsl(var(--blu-600))',
  /** Roxo (pur-600). Highlight, override. */
  highlight: 'hsl(var(--pur-600))',
  /** Surface bege (surf-200). Backgrounds em charts. */
  surface: 'hsl(var(--surf-200))',
  /** Borda warm (brd-100). Linhas de grade e separadores. */
  border: 'hsl(var(--brd-100))',
} as const

/**
 * Paleta sequencial para charts com múltiplas séries (até 8 entidades).
 * Ordem otimizada para máximo contraste visual entre séries adjacentes.
 */
export const CHART_PALETTE: readonly string[] = [
  CHART_COLORS.primary,
  CHART_COLORS.info,
  CHART_COLORS.positive,
  CHART_COLORS.highlight,
  CHART_COLORS.primaryDeep,
  CHART_COLORS.negative,
  CHART_COLORS.primaryAccent,
  CHART_COLORS.neutral,
] as const
