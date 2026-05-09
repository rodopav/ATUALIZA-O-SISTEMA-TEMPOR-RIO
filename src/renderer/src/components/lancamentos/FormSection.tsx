import * as React from 'react'

interface FormSectionProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function FormSection({
  title,
  description,
  children,
}: FormSectionProps): React.ReactElement {
  return (
    <section className="space-y-4">
      <header className="space-y-1 border-b pb-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function FieldError({
  msg,
}: {
  msg?: string
}): React.ReactElement | null {
  if (!msg) return null
  return (
    <p className="animate-in fade-in slide-in-from-top-1 text-xs font-medium text-destructive">
      {msg}
    </p>
  )
}

export function emptyToNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() === '' ? null : (v as string)
}
