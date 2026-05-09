import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-destructive/20 bg-destructive/10 text-destructive dark:bg-destructive/20',
        success:
          'border-success/20 bg-success/10 text-success dark:bg-success/20',
        warning:
          'border-amb-400/30 bg-amb-100/50 text-amb-600 dark:bg-amb-400/15 dark:text-amb-300',
        info:
          'border-blu-600/20 bg-blu-600/10 text-blu-600 dark:bg-blu-600/20',
        purple:
          'border-pur-600/20 bg-pur-600/10 text-pur-600 dark:bg-pur-600/20',
        outline: 'text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): React.ReactElement {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
