import * as React from 'react'
import type { ToastActionElement, ToastProps } from './toast'

/**
 * Lightweight, Radix-friendly toast manager. API mirrors shadcn/ui:
 *
 *   const { toast } = useToast()
 *   toast({ title, description, variant: 'destructive' })
 */

const TOAST_LIMIT = 4
const TOAST_REMOVE_DELAY = 4000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

type State = { toasts: ToasterToast[] }

type Action =
  | { type: 'ADD'; toast: ToasterToast }
  | { type: 'UPDATE'; toast: Partial<ToasterToast> & { id: string } }
  | { type: 'DISMISS'; toastId?: string }
  | { type: 'REMOVE'; toastId?: string }

const listeners: Array<(s: State) => void> = []
let memoryState: State = { toasts: [] }
const timeouts = new Map<string, ReturnType<typeof setTimeout>>()

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }
    case 'UPDATE':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      }
    case 'DISMISS': {
      const { toastId } = action
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          toastId === undefined || t.id === toastId ? { ...t, open: false } : t,
        ),
      }
    }
    case 'REMOVE':
      if (action.toastId === undefined) return { ...state, toasts: [] }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
    default:
      return state
  }
}

function dispatch(action: Action): void {
  memoryState = reducer(memoryState, action)
  listeners.forEach((l) => l(memoryState))
}

function scheduleRemove(id: string): void {
  if (timeouts.has(id)) return
  const handle = setTimeout(() => {
    timeouts.delete(id)
    dispatch({ type: 'REMOVE', toastId: id })
  }, TOAST_REMOVE_DELAY)
  timeouts.set(id, handle)
}

let counter = 0
function nextId(): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER
  return String(counter)
}

export type ToastInput = Omit<ToasterToast, 'id'>

export function toast(input: ToastInput): { id: string; dismiss: () => void } {
  const id = nextId()
  const newToast: ToasterToast = {
    ...input,
    id,
    open: true,
    onOpenChange: (open) => {
      if (!open) dispatch({ type: 'DISMISS', toastId: id })
    },
  }
  dispatch({ type: 'ADD', toast: newToast })
  scheduleRemove(id)
  return { id, dismiss: () => dispatch({ type: 'DISMISS', toastId: id }) }
}

export function useToast(): {
  toasts: ToasterToast[]
  toast: typeof toast
  dismiss: (id?: string) => void
} {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const idx = listeners.indexOf(setState)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [])

  return {
    toasts: state.toasts,
    toast,
    dismiss: (id?: string) => dispatch({ type: 'DISMISS', toastId: id }),
  }
}
