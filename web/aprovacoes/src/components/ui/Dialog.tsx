import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

/**
 * Modal simples sem dependência externa. Backdrop click fecha.
 * Focus trap básico: opcional, não implementado pra MVP.
 */
export function Dialog({ open, onOpenChange, children }: DialogProps): React.ReactElement | null {
  React.useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
    >
      {children}
    </div>
  )
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  onClose?: () => void
}

export function DialogContent({
  className,
  children,
  onClose,
  ...rest
}: DialogContentProps): React.ReactElement {
  return (
    <div
      className={cn(
        'card-elevated relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl',
        'animate-in fade-in slide-in-from-bottom-4 duration-200',
        className,
      )}
      {...rest}
    >
      <div className="tarja-amber" />
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
      {children}
    </div>
  )
}

export function DialogHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('px-5 pt-5 pb-2 sm:px-6 sm:pt-6', className)} {...rest} />
}

export function DialogTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>): React.ReactElement {
  return <h3 className={cn('pr-8 text-lg font-bold text-zinc-50', className)} {...rest} />
}

export function DialogBody({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('px-5 py-3 sm:px-6', className)} {...rest} />
}

export function DialogFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 border-t border-zinc-800/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6',
        className,
      )}
      {...rest}
    />
  )
}
