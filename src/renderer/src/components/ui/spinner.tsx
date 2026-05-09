import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

interface SpinnerProps extends React.HTMLAttributes<SVGSVGElement> {
  size?: number
}

export function Spinner({ className, size = 16, ...props }: SpinnerProps): React.ReactElement {
  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', className)}
      width={size}
      height={size}
      aria-hidden="true"
      {...props}
    />
  )
}
