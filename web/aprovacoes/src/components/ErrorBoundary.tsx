import * as React from 'react'
import { AlertTriangle } from 'lucide-react'

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Captura erros de render dentro de qualquer página. Sem isso, um throw
 * em algum componente derruba a app inteira pra tela em branco — e o
 * usuário fica achando que travou.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary] React crash:', error, info)
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="card-elevated relative max-w-md overflow-hidden p-8 text-center">
          <div className="tarja-amber" />
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h2 className="text-lg font-bold text-zinc-50">Algo quebrou</h2>
          <p className="mt-2 text-xs text-zinc-400 break-words">
            {this.state.error?.message ?? 'Erro desconhecido'}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={this.reset}
              className="rounded-md bg-amb-400 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-amb-300"
            >
              Tentar de novo
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800/40"
            >
              Recarregar página
            </button>
          </div>
        </div>
      </div>
    )
  }
}
