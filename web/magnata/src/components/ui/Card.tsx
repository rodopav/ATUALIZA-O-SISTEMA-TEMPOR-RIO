import * as React from 'react'
import { cn } from '../../lib/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
}

export function Card({ className, elevated, ...rest }: CardProps): React.ReactElement {
  return <div className={cn(elevated ? 'card-elevated' : 'card', className)} {...rest} />
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('px-5 pt-4 pb-2', className)} {...rest} />
}

export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>): React.ReactElement {
  return <h3 className={cn('text-base font-semibold text-zinc-100', className)} {...rest} />
}

export function CardContent({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('px-5 py-4', className)} {...rest} />
}
