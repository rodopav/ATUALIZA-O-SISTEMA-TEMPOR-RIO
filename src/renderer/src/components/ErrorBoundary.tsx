import * as React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card'

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Erro inesperado.' }
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  override render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle
                className="h-6 w-6 text-destructive"
                aria-hidden="true"
              />
            </div>
            <CardTitle className="text-2xl">Algo deu errado</CardTitle>
            <CardDescription>
              Ocorreu um erro inesperado ao carregar o aplicativo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="break-words rounded-md bg-muted p-3 text-sm text-muted-foreground">
              {this.state.message}
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button type="button" onClick={this.handleReload}>
              Recarregar aplicativo
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }
}
