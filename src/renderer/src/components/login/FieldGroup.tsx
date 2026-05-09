import * as React from 'react'
import { Label } from '../ui/label'

interface FieldGroupProps {
  id: string
  label: string
  error?: string
  icon?: React.ReactNode
  children: React.ReactNode
}

export function FieldGroup({
  id,
  label,
  error,
  icon,
  children,
}: FieldGroupProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        ) : null}
        {children}
      </div>
      {error ? (
        <p className="animate-in fade-in slide-in-from-top-1 text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
