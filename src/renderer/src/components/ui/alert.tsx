import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 text-foreground [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'border-border bg-background [&>svg]:text-muted-foreground',
        destructive:
          'border-destructive/40 bg-destructive/5 [&>svg]:text-destructive [&_h5]:text-destructive dark:bg-destructive/10',
        warning:
          'border-amb-400/40 bg-amb-100/40 [&>svg]:text-amb-600 [&_h5]:text-amb-600 dark:bg-amb-400/10 dark:[&>svg]:text-amb-300 dark:[&_h5]:text-amb-300',
        success:
          'border-success/30 bg-success/5 [&>svg]:text-success [&_h5]:text-success dark:bg-success/10',
        info:
          'border-blu-600/30 bg-blu-50/40 [&>svg]:text-blu-600 [&_h5]:text-blu-600 dark:bg-blu-600/10',
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
    className={cn('text-sm text-muted-foreground [&_p]:leading-relaxed', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'
