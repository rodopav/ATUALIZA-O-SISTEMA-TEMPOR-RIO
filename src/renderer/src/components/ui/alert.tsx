import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

/**
 * Padrão visual para evitar cor-sobre-cor:
 *   - background: neutro (bg-card) sempre
 *   - borda: tintada (semantica)
 *   - ícone: tintado (cor da variante)
 *   - título h5: tintado (cor da variante) — em negrito para destacar
 *   - description: text-foreground (não muted, pra garantir contraste)
 *
 * Resultado: independente do tema (light/dark), o texto fica sempre legível
 * — o pé do alerta usa as cores neutras do tema, só o "indicador" (borda/ícone/título)
 * carrega a cor da variante.
 */
const alertVariants = cva(
  'relative w-full rounded-lg border bg-card p-4 text-foreground [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'border-border [&>svg]:text-muted-foreground',
        destructive:
          'border-destructive/50 [&>svg]:text-destructive [&_h5]:text-destructive',
        warning:
          'border-amb-400/60 [&>svg]:text-amb-600 [&_h5]:text-amb-600 dark:[&>svg]:text-amb-300 dark:[&_h5]:text-amb-300',
        success:
          'border-success/40 [&>svg]:text-success [&_h5]:text-success',
        info:
          'border-blu-600/40 [&>svg]:text-blu-600 [&_h5]:text-blu-600 dark:[&>svg]:text-blu-50 dark:[&_h5]:text-blu-50',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = 'Alert'

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
AlertTitle.displayName = 'AlertTitle'

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // text-foreground/85 garante que mesmo no dark fica legível, sem usar
    // cor da variante (que causa color-on-color).
    className={cn('text-sm text-foreground/85 [&_p]:leading-relaxed', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'
