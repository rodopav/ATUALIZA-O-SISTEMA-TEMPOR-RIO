import * as React from 'react'
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  CloudDownload,
  Rocket,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Spinner } from '../components/ui/spinner'
import { toast } from '../components/ui/use-toast'

type Status =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'up_to_date' }
  | { kind: 'available'; version: string }
  | { kind: 'downloading'; version: string }
  | { kind: 'ready'; version: string }
  | { kind: 'error'; message: string }

export function AtualizacoesPage(): React.ReactElement {
  const [status, setStatus] = React.useState<Status>({ kind: 'idle' })
  const [currentVersion, setCurrentVersion] = React.useState<string>('')

  React.useEffect(() => {
    let active = true
    void window.api
      .getVersion()
      .then((v) => {
        if (active) setCurrentVersion(v)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    const off = window.api.onUpdateEvent((event) => {
      if (event.type === 'available') {
        setStatus({ kind: 'downloading', version: event.version ?? '?' })
        toast({
          title: 'Atualização disponível',
          description: `Baixando v${event.version ?? '?'}…`,
        })
      } else if (event.type === 'ready') {
        setStatus({ kind: 'ready', version: event.version ?? '?' })
        toast({
          title: 'Atualização pronta',
          description: `v${event.version ?? '?'} pronta para instalar.`,
          variant: 'success',
        })
      }
    })
    return () => off()
  }, [])

  const handleCheck = React.useCallback(async () => {
    setStatus({ kind: 'checking' })
    try {
      const result = await window.api.checkForUpdates()
      if (result.available) {
        setStatus({ kind: 'available', version: result.version ?? '?' })
      } else {
        setStatus({ kind: 'up_to_date' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado.'
      setStatus({ kind: 'error', message: msg })
    }
  }, [])

  const handleInstall = React.useCallback(async () => {
    try {
      await window.api.installUpdate()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado.'
      toast({
        title: 'Não foi possível instalar',
        description: msg,
        variant: 'destructive',
      })
    }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sistema"
        title="Atualizações"
        description="Verifique manualmente novas versões ou aguarde a checagem automática."
      />

      <Card>
        <CardHeader>
          <CardTitle>Versão instalada</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta cópia do Rodopav Financeiro está rodando a versão abaixo.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Rocket className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-semibold tabular-nums tracking-tight">
                v{currentVersion || '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                Atualizações são publicadas pelo time interno via GitHub
                Releases.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Verificar atualização</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulta o servidor de releases. Se houver versão nova, ela é
              baixada automaticamente em segundo plano.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void handleCheck()}
            disabled={
              status.kind === 'checking' || status.kind === 'downloading'
            }
          >
            {status.kind === 'checking' ? (
              <Spinner />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Verificar agora
          </Button>
        </CardHeader>
        <CardContent>
          <StatusPanel status={status} onInstall={handleInstall} />
        </CardContent>
      </Card>

      <Alert variant="info">
        <CloudDownload className="h-4 w-4" />
        <AlertTitle>Como funciona</AlertTitle>
        <AlertDescription>
          O sistema checa atualizações no startup quando empacotado e baixa em
          segundo plano. Você recebe uma notificação quando estiver pronto para
          reiniciar e instalar — clique no botão acima para forçar a checagem
          quando quiser.
        </AlertDescription>
      </Alert>
    </div>
  )
}

function StatusPanel({
  status,
  onInstall,
}: {
  status: Status
  onInstall: () => void
}): React.ReactElement {
  switch (status.kind) {
    case 'idle':
      return (
        <p className="text-sm text-muted-foreground">
          Clique em <strong>Verificar agora</strong> para consultar atualizações.
        </p>
      )
    case 'checking':
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Consultando o servidor de releases…
        </div>
      )
    case 'up_to_date':
      return (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          Você já está na versão mais recente.
        </div>
      )
    case 'available':
      return (
        <div className="flex items-center gap-2 rounded-md border border-amb-400/40 bg-amb-100/40 px-3 py-2 text-sm dark:bg-amb-400/10">
          <Download className="h-4 w-4 text-amb-600 dark:text-amb-300" />
          Versão <strong>v{status.version}</strong> disponível. Baixando…
        </div>
      )
    case 'downloading':
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Baixando v{status.version}…
        </div>
      )
    case 'ready':
      return (
        <div className="flex items-center justify-between gap-3 rounded-md border border-success/30 bg-success/5 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            v{status.version} pronta para instalar.
          </div>
          <Button size="sm" onClick={onInstall}>
            <Rocket className="h-4 w-4" />
            Reiniciar e instalar
          </Button>
        </div>
      )
    case 'error':
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao verificar atualização</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )
  }
}

export default AtualizacoesPage
